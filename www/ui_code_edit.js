/*
	Canvas IMGUI code editor widget.

	* TODO: typing, deleting, cut/copy/paste, indent/outdent
	* TODO: undo/redo
	* TODO: search, replace
	* TODO: syntax highlighting color map
	* TODO: block selection
	* TODO: remote cursors
	* TODO: open: browse, load, tabs
	* TODO: save
	* TODO: sessions

*/

(function () {
"use strict"
const G = window

const {
	cx,
	BOX_ARGS
} = ui

let node_colors = {
	OpenTag: 'yellow',
	CloseTag: 'yellow',
}

ui.load_font('mono', 'fonts/jetbrains-mono-nl-regular.woff2')

function indent(s, tab_width) {
	let i = 0 // char index
	let j = 0 // col index
	while (1) {
		let c = s.charCodeAt(i++)
		if (c == 9) j += tab_width
		else if (c == 32) j++
		else return j
	}
}

function char_to_col(on_i, s, tab_width) {
	let i = 0 // char index
	let j = 0 // col index
	while (i < on_i) {
		let c = s.charCodeAt(i++)
		if (c == 9) j += tab_width
		else j++
	}
	return j
}

function col_to_char(on_j, s, tab_width) {
	on_j = max(0, on_j)
	let i = 0 // char index
	let j = 0 // col index
	let n = s.length-1
	for (; i < n; i++) {
		let c = s.charCodeAt(i)
		let j0 = j
		j += c == 8 ? tab_width : 1
		if (on_j >= j0 && on_j <= j)
			return on_j - j0 < j - on_j ? j0 : j
	}
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

		let sy     = a[i+SIDEBAR_SY]
		let vline1 = a[i+SIDEBAR_VI1]
		let vline2 = a[i+SIDEBAR_VI2]

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

		for (let i = vline1; i < vline2; i++)
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
		let vline1      = a[i+10]
		let vline2      = a[i+11]
		let vlines      = a[i+12]
		let tab_width   = a[i+13]
		let line_colors = a[i+14]
		let hit_line    = a[i+15]
		let cursors     = a[i+16]

		cx.save()

		cx.font = font_size+'px mono'
		cx.fontKerning = 'none'

		// reset viewport to alpha 0 so we can blend text with highlighting rectangles.
		cx.clearRect(vx, vy, vw, vh)

		// draw the text.
		cx.textAlign = 'left'
		cx.fillStyle = 'white'
		for (let line = vline1; line < vline2; line++) {
			let s = vlines[line - vline1]
			// using tab_width-1 because tabs take one char with fillText().
			let indent_w = indent(s, tab_width-1) * char_w
			cx.fillText(s, x0 + indent_w, y0 + (line + 1) * line_h - font_descent - 2)
		}

		// this blending mode will draw only where alpha != 0, i.e. over the text.
		cx.globalCompositeOperation = 'source-atop'

		// draw highlighting rectangles.
		for (let line = vline1; line < vline2; line++) {
			let s = vlines[line - vline1]
			let indent_w = indent(s, tab_width) * char_w
			let c = line_colors[line - vline1]
			for (let i = 0, n = c.length; i < n; i += 3) {
				let ci    = c[i+0]
				let cw    = c[i+1]
				let color = c[i+2]
				let x = x0 + indent_w + ci * char_w
				let y = y0 + line * line_h
				let w = cw * char_w
				let h = line_h
				cx.fillStyle = color
				cx.fillRect(x, y, w, h)
			}
		}

		// this blending mode will draw only where alpha == 0,
		// i.e. around what's been drawn before i.e. drawing "behind".
		cx.globalCompositeOperation = 'destination-over'

		// draw cursors.
		cx.fillStyle = ui.fg_color('text')
		for (let cursor of cursors) {
			let line_s = vlines[cursor.line - vline1]
			if (line_s == null) // outside visible range
				continue
			let col = char_to_col(cursor.char, line_s, tab_width)
			cx.fillRect(
				x0 + col * char_w,
				y0 + cursor.line * line_h,
				3, line_h)
		}

		// draw multi-line selection.
		for (let cursor of cursors) {
			if (cursor.sel_line == cursor.line && cursor.sel_char == cursor.char)
				continue
			cx.fillStyle = ui.bg_color('item', 'focused item-focused item-selected')
			let sline1 = min(cursor.sel_line, cursor.line)
			let sline2 = max(cursor.sel_line, cursor.line)
			let vsline1 = max(sline1, vline1)
			let vsline2 = min(sline2, vline2)
			if (sline1 < sline2) { // multi-line
				let schar1 = sline1 == cursor.line ? cursor.char : cursor.sel_char
				let schar2 = sline2 == cursor.line ? cursor.char : cursor.sel_char
				let scol1 = vsline1 == sline1 ? char_to_col(schar1, vlines[sline1 - vline1], tab_width) : null
				let scol2 = vsline2 == sline2 ? char_to_col(schar2, vlines[sline2 - vline1], tab_width) : null
				if (scol1 != null) {
					let line_s = vlines[sline1 - vline1]
					let scol2 = char_to_col(line_s.length, line_s, tab_width)
					cx.fillRect(
						x0 + scol1 * char_w,
						y0 + sline1 * line_h,
						(scol2 - scol1) * char_w, line_h)
				}
				for (let sline = vsline1 + 1; sline < vsline2; sline++) {
					let line_s = vlines[sline - vline1]
					let scol1 = 0
					let scol2 = char_to_col(line_s.length, line_s, tab_width)
					cx.fillRect(
						x0 + scol1 * char_w,
						y0 + sline * line_h,
						(scol2 - scol1) * char_w, line_h)
				}
				if (scol2 != null) {
					let scol1 = 0
					cx.fillRect(
						x0 + scol1,
						y0 + sline2 * line_h,
						(scol2 - scol1) * char_w, line_h)
				}
			} else if (vsline1 == sline1) { // single-line
				let line_s = vlines[sline1 - vline1]
				if (line_s != null) { // not outside visible range
					let col1 = char_to_col(min(cursor.sel_char, cursor.char), line_s, tab_width)
					let col2 = char_to_col(max(cursor.sel_char, cursor.char), line_s, tab_width)
					cx.fillRect(
						x0 + col1 * char_w,
						y0 + cursor.line * line_h,
						(col2 - col1) * char_w, line_h)
				}
			}
		}

		// draw hit line.
		if (0 && hit_line != null) {
			cx.fillStyle = ui.bg_color('bg1')
			cx.fillRect(vx, y0 + hit_line * line_h, vw, line_h)
		}

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
	let tab_width = 3
	let font_size
	let font_descent
	let line_h
	let char_w
	let max_line_len
	let text_w
	let text_h
	let last_vline1 = -1
	let last_vline2 = -1 // visible line range
	let vlines = [] // visible line array: [line1, ...]
	let vcolors = [] // [line_i, i, w, color, ...]

	// mouse state
	let drag_state, dx, dy, cs
	let hit_zone //
	let hit_line
	let hit_char

	// cursors state.
	let cursors = [{line: 0, char: 0, want_char: 0, select_line: 0, select_char: 0}]

	function cursor_rect(cursor) {
		let line_s = lines[cursor.line]
		let char_i = char_to_col(cursor.char, line_s, tab_width)
		return [
			char_i * char_w,
			cursor.line * line_h,
			3, line_h
		]
	}

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

		// parse syntax for highlighting.
		{
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
		}

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
		let vline1 = floor(sy / line_h)
		let vline2 = vline1 + vn
		vline1 = max(0, min(vline1, lines.length - 1))
		vline2 = max(0, min(vline2, lines.length))

		// TODO: make the sidebar a popup anchored to this frame and remove this hack!
		a[sidebar_i+SIDEBAR_SY ] = sy
		a[sidebar_i+SIDEBAR_VI1] = vline1
		a[sidebar_i+SIDEBAR_VI2] = vline2

		if (last_vline1 != vline1 || last_vline2 != vline2) {
			vlines.length = 0
			vcolors.length = 0
			for (let i = vline1; i < vline2; i++) {
				let s = lines[i]
				let c = assert(line_colors[i])
				vlines.push(s)
				vcolors.push(c)
			}
			last_vline1 = vline1
			last_vline2 = vline2
		}

		// set mouse state
		hit_line = null
		;[drag_state, dx, dy, cs] = ui.drag(id+'.text_contentbox')
		if (drag_state == 'drag') {
			ui.focus(id)
		}
		if (drag_state == 'hover' || drag_state == 'drag') {
			hit_line = floor((ui.my - y) / line_h)
			hit_char = floor((ui.mx - y) / char_w)
		}

		ui.stack(id+'.text_contentbox')
			ui.code_edit_text(x, y, vx, vy, vw, vh,
				line_h, font_size, font_descent, char_w,
				vline1, vline2, vlines, tab_width, vcolors,
				hit_line, ui.focused(id) ? cursors : empty_array,
		)

		ui.end_stack()
	}

	e.render = function(fr, align, valign, min_w, min_h) {

		// set layout vars

		font_size = ui.get_font_size()
		line_h = round(font_size * 1.5)
		let m = ui.measure_text(cx, '0')
		char_w = ceil(m.width)
		font_descent = m.fontBoundingBoxDescent
		let sidebar_w = (lines.length+'').length * char_w
		text_w = ceil(max_line_len * char_w)
		text_h = lines.length * line_h

		let cursor = cursors[0]

		// process keyboard input

		let lines_n = 0
		let chars_n = 0
		let scroll_lines = 0
		let shift = ui.key('shift')
		let ctrl  = ui.key('control')
		if (ui.focused(id)) {
			// NOTE: some key combos are captured by browser, namely:
			// ctrl+pgup/dn, ctrl(+shift)+tab
			if      (ui.keydown('arrowup'   ) && !ctrl) lines_n = -1
			else if (ui.keydown('arrowdown' ) && !ctrl) lines_n =  1
			else if (ui.keydown('pageup'    )) lines_n = -(last_vline2 - last_vline1)
			else if (ui.keydown('pagedown'  )) lines_n =  (last_vline2 - last_vline1)
			else if (ui.keydown('home'      ) && ctrl) lines_n = -1/0
			else if (ui.keydown('end'       ) && ctrl) lines_n =  1/0
			else if (ui.keydown('arrowleft' ) && !ctrl) chars_n = -1
			else if (ui.keydown('arrowright') && !ctrl) chars_n =  1
			else if (ui.keydown('arrowup'   ) && ctrl) scroll_lines = -1
			else if (ui.keydown('arrowdown' ) && ctrl) scroll_lines =  1
		}
		if (chars_n || lines_n) {
			if (chars_n < 0) {
				if (cursor.char > 0) {
					cursor.char--
					cursor.want_char = cursor.char
				} else if (cursor.line) {
					cursor.line--
					cursor.char = lines[cursor.line].length
					cursor.want_char = cursor.char
				}
			} else if (chars_n > 0) {
				if (cursor.char < lines[cursor.line].length) {
					cursor.char++
					cursor.want_char = cursor.char
				} else if (cursor.line < lines.length) {
					cursor.line++
					cursor.char = 0
					cursor.want_char = cursor.char
				}
			} else if (lines_n < 0) {
				if (cursor.line) {
					cursor.line = max(cursor.line + lines_n, 0)
					cursor.char = min(cursor.want_char, lines[cursor.line].length)
				} else {
					cursor.char = 0
				}
			} else if (lines_n > 0) {
				if (cursor.line < lines.length-1) {
					cursor.line = min(cursor.line + lines_n, lines.length-1)
					cursor.char = min(cursor.want_char, lines[cursor.line].length)
				} else {
					cursor.char = lines[cursor.line].length
				}
			}
			if (!shift) {
				cursor.sel_line = cursor.line
				cursor.sel_char = cursor.char
			}
			ui.scroll_to_view(id+'.text_scrollbox', ...cursor_rect(cursor))
		} else if (scroll_lines) {
			let ss = ui.state(id+'.text_scrollbox')
			ss.set('scroll_y', (ss.get('scroll_y') ?? 0) + scroll_lines * line_h)
		}

		// build editor

		ui.v(fr, 0, align, valign, min_w, min_h)
			let tabs = [
				{id: 'tab1', label:'Tab 1'},
				{id: 'tab2', label:'Tab 2'},
			]
			ui.stack('', 0)
				let sel_tab = ui.tabs(id+'.tabs', tabs, 'tab1')
			ui.end_stack()
			ui.stack('', 0, 's', 's', 0, 1)
				ui.bb('bg2')
			ui.end_stack()
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
