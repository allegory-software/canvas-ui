
(function () {
"use strict"
const G = window

const {
	cx,
	BOX_ARGS
} = ui

let node_colors = {
	OpenTag: 'yellow',
}

ui.load_font('mono', 'fonts/jetbrains-mono-nl-regular.woff2')

function indent_n(s) {
	let i = 0
	while (s[i] === '\t') i++
	return i
}

function detect_line_terminator(s) {
	let crlf = 0, cr = 0, lf = 0
	for (let i = 0, n = s.length; i < n; i++) {
		let c = s.charCodeAt(i)
		if (c == 13) {
			if (i+1 < n && s.charCodeAt(i+1) == 10) {
				crlf++
				i++
			} else {
				cr++
			}
		} else if (c == 10) {
			lf++
		}
	}
	if (crlf && !cr && !lf) return '\r\n'
	if (cr && !crlf && !lf) return '\r'
	if (lf && !crlf && !cr) return '\n'
}

let SIDEBAR_SY  = BOX_ARGS+0
let SIDEBAR_VI1 = BOX_ARGS+1
let SIDEBAR_VI2 = BOX_ARGS+2

ui.box_widget('code_edit_sidebar', {
	create: function(cmd, sidebar_w, line_count, line_h, font_size, font_descent) {
		return ui.cmd_box(cmd, 0, 's', 's', sidebar_w, 0,
			0, 0, 0,
			line_count, line_h, font_size, font_descent
		)
	},
	draw: function(a, i) {
		let x0  = a[i+0]
		let y0  = a[i+1]
		let w   = a[i+2]
		let h   = a[i+3]

		let sy  = a[i+SIDEBAR_SY]
		let vi1 = a[i+SIDEBAR_VI1]
		let vi2 = a[i+SIDEBAR_VI2]

		let line_count   = a[i+BOX_ARGS+3]
		let line_h       = a[i+BOX_ARGS+4]
		let font_size    = a[i+BOX_ARGS+5]
		let font_descent = a[i+BOX_ARGS+6]

		cx.save()

		cx.beginPath()
		cx.rect(x0, y0, w, h)
		cx.clip()

		cx.translate(w, -sy)

		cx.font = font_size+'px mono'
		cx.fontKerning = 'none'
		cx.textAlign = 'right'
		cx.fillStyle = 'gray'

		for (let i = vi1; i < vi2; i++)
			cx.fillText(i, x0, y0 + (i + 1) * line_h - font_descent - 2)

		cx.restore()

	},
})

ui.widget('code_edit_text', {
	create: function(...args) {
		return ui.cmd(...args)
	},
	draw: function(a, i) {
		let x0          = a[i+0]
		let y0          = a[i+1]
		let vx          = a[i+2]
		let vy          = a[i+3]
		let vw          = a[i+4]
		let vh          = a[i+5]
		let line_h      = a[i+6]
		let font_size   = a[i+7]
		let font_descent= a[i+8]
		let char_w      = a[i+9]
		let vi1         = a[i+10]
		let vi2         = a[i+11]
		let lines       = a[i+12]
		let line_colors = a[i+13]
		let hit_line    = a[i+14]
		cx.save()

		cx.font = font_size+'px mono'
		cx.fontKerning = 'none'

		// reset viewport to alpha 0 so we can blend text with highlighting rectangles.
		cx.clearRect(vx, vy, vw, vh)

		// draw the text.
		cx.textAlign = 'left'
		cx.fillStyle = 'white'
		for (let i = vi1; i < vi2; i++) {
			let s = lines[(i-vi1)]
			let indent_w = indent_n(s) * char_w * 3
			cx.fillText(s, x0 + indent_w, y0 + (i + 1) * line_h - font_descent - 2)
		}

		// this blending mode will draw only where alpha != 0, i.e. over the text.
		cx.globalCompositeOperation = 'source-atop'

		// draw highlighting rectangles.
		for (let i = vi1; i < vi2; i++) {
			let s = lines[(i-vi1)]
			let indent_w = indent_n(s) * char_w * 3
			let c = line_colors[(i-vi1)]
			for (let j = 0, n = c.length; j < n; j += 3) {
				let ci    = c[j+0]
				let cw    = c[j+1]
				let color = c[j+2]
				let x = x0 + indent_w + ci * char_w
				let y = y0 + i * line_h
				let w = cw * char_w
				let h = line_h
				cx.fillStyle = color
				cx.fillRect(x, y, w, h)
			}
		}

		// this blending mode will draw only where alpha == 0, i.e. around the text.
		cx.globalCompositeOperation = 'destination-over'

		// draw selection
		cx.fillStyle = ui.bg_color('bg1')
		cx.fillRect(vx, y0 + hit_line * line_h, vw, line_h)

		// draw background.
		cx.fillStyle = ui.bg_color('bg0')
		cx.fillRect(vx, vy, vw, vh)

		cx.restore()
	}
})

function code_edit_view(id, opt) {

	let e = {}

	// context-sensitive thus set on each frame
	let text, newline, lines, line_offsets, line_colors
	let font_size
	let font_descent
	let line_h
	let char_w
	let max_line_len
	let text_w
	let text_h
	let last_vi1 = -1, last_vi2 = -1 // visible line range
	let visible_lines = [] // [line1, ...]
	let visible_colors = [] // [line_i, i, w, color, ...]

	// mouse state
	let drag_state, dx, dy, cs
	let hit_zone //
	let hit_line
	let hit_char
	// let drag_op  // col_move, col_group, row_move
	// let hit_ri // row index
	// let hit_fi // field index
	// let hit_indent
	// let row_move_state

	// keyboard state
	let focused, shift, ctrl
	let keydown = key => focused && ui.keydown(key)

	lz_parser.html = lz_parser.html.configure({
		wrap: lz_parseMixed(node => {
			if (node.name == 'ScriptText') return { parser: lz_parser.js }
			if (node.name == 'StyleText') return { parser: lz_parser.css }
		})
	})

	function update_text_state() {

		if (!lines) {

			text = opt.code

			newline = detect_line_terminator(text) ?? '\n'
			// remove whitespace at EOL and normalize line terminators.
			text.replace(/[ \t]*(?:\r\n|\r|\n)/g, newline)
			// collapse multiple empty lines at EOF to a single line.
			text.replace(new RegExp(`(${newline})+\\z`), newline)
			// split by newline.
			lines = text.split('\n')

			// compute line offsets, starting with the second line.
			line_offsets = []
			let p = lines[0].length + 1
			for (let i = 1, n = lines.length; i < n; i++) {
				line_offsets[i-1] = p
				p += lines[i].length + 1
			}

			// init line_colors arrays.
			line_colors = []
			for (let i = 0, n = lines.length; i < n; i++)
				line_colors[i] = []
		}

		for (let a of line_colors)
			a.length = 0
		let tree = lz_parser.html.parse(text)
		let cursor = tree.cursor()
		do {
			let color = node_colors[cursor.name]
			if (!color)
				continue
			let line1_i = binsearch(line_offsets, cursor.from, '<=')
			let line2_i = binsearch(line_offsets, cursor.to  , '<=')
			let i = cursor.from
			let w = cursor.to - i
			i -= (line1_i > 0 ? line_offsets[line1_i-1] : 0)
			if (line2_i > line1_i) {
				line_colors[line1_i].push(i, lines[line1_i].length, color)
				for (let line_i = line1_i + 1; line_i < line2_i; line_i++)
					line_colors[line_i].push(0, lines[line_i].length, color)
				line_colors[line2_i].push(0, w, color)
			} else {
				line_colors[line1_i].push(i, w, color)
			}
		} while (cursor.next())

		max_line_len = 0
		for (let s of lines)
			max_line_len = max(max_line_len, s.length)
	}

	let sidebar_i

	function on_text_frame(a, _i, x, y, w, h, vx, vy, vw, vh) {

		let sx = vx - x
		let sy = vy - y

		// number of lines fully or partially in the viewport.
		let vn = floor(vh / line_h) + 2 // 2 is right, think it!
		let vi1 = floor(sy / line_h)
		let vi2 = vi1 + vn
		vi1 = max(0, min(vi1, lines.length - 1))
		vi2 = max(0, min(vi2, lines.length))

		// TODO: make the sidebar a popup anchored to this frame and remove this hack!
		a[sidebar_i+SIDEBAR_SY ] = sy
		a[sidebar_i+SIDEBAR_VI1] = vi1
		a[sidebar_i+SIDEBAR_VI2] = vi2

		if (last_vi1 != vi1 || last_vi2 != vi2) {
			visible_lines.length = 0
			visible_colors.length = 0
			for (let i = vi1; i < vi2; i++) {
				let s = lines[i]
				let c = assert(line_colors[i])
				visible_lines.push(s)
				visible_colors.push(c)
			}
			last_vi1 = vi1
			last_vi2 = vi2
		}

		// set mouse state
		;[drag_state, dx, dy, cs] = ui.drag(id+'.text_contentbox')
		if (drag_state == 'hover' || drag_state == 'drag') {
			hit_line = floor((ui.my - y) / line_h)
		}

		ui.stack(id+'.text_contentbox')
			ui.code_edit_text(x, y, vx, vy, vw, vh,
				line_h, font_size, font_descent, char_w,
				vi1, vi2, visible_lines, visible_colors,
				hit_line,
		)

		ui.end_stack()
	}

	e.render = function(fr, align, valign, min_w, min_h) {

		// set layout vars

		let sp  = ui.sp1()
		let sp2 = ui.sp2()
		font_size = ui.get_font_size()
		line_h = round(font_size * 1.5)
		let m = ui.measure_text(cx, '0')
		char_w = ceil(m.width)
		font_descent = m.fontBoundingBoxDescent
		let sidebar_w = (lines.length+'').length * char_w
		text_w = ceil(max_line_len * char_w)
		text_h = lines.length * line_h

		// set keyboard state
		focused = ui.focused(id)
		shift = ui.key('shift')
		ctrl  = ui.key('control')

		ui.v(fr, 0, align, valign, min_w, min_h)
			ui.h(1, ui.sp025())
				ui.p(ui.sp1(), 0)
				ui.stack('', 0)
					ui.bb('bg1')
					sidebar_i = ui.code_edit_sidebar(sidebar_w,
						lines.length, line_h, font_size, font_descent)
				ui.end_stack()
				ui.scrollbox(id+'.text_scrollbox', 1, 'auto', 'scroll')
					ui.frame(noop, on_text_frame, 0, 'l', 't', text_w, text_h)
				ui.end_scrollbox()
			ui.end_h()
		ui.end_v()

	}

	e.free = function() {}

	update_text_state()

	return e
}

ui.code_edit = function(id, opt, fr, align, valign, min_w, min_h) {
	ui.keepalive(id)
	let s = ui.state(id)
	let view = s.get('view')
	if (!view) {
		view = code_edit_view(id, opt)
		ui.on_free(id, () => view.free())
		s.set('view', view)
	}
	view.render(fr, align, valign, min_w, min_h)
}

}()) // module function
