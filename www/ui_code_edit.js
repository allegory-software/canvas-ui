
(function () {
"use strict"
const G = window

const {
	cx,
} = ui

function indent_n(s) {
	let i = 0
	while (s[i] === '\t') i++
	return i
}

ui.widget('code_edit_text', {
	create: function(...args) {
		return ui.cmd(...args)
	},
	draw: function(a, i) {
		let x           = a[i+0]
		let y           = a[i+1]
		let vx          = a[i+2]
		let vy          = a[i+3]
		let vw          = a[i+4]
		let vh          = a[i+5]
		let line_h      = a[i+6]
		let font_size   = a[i+7]
		let font_descent= a[i+8]
		let text_x      = a[i+9]
		let sidebar_gap = a[i+10]
		let char_w      = a[i+11]
		let vi1         = a[i+12]
		let vi2         = a[i+13]
		let lines       = a[i+14]
		let hit_line    = a[i+15]
		cx.save()

		cx.font = font_size+'px mono'
		cx.fontKerning = 'none'

		// draw selection
		cx.fillStyle = ui.bg_color('bg1')
		cx.fillRect(vx, y + hit_line * line_h, vw, line_h)

		// draw side bar
		cx.textAlign = 'right'
		cx.fillStyle = 'gray'
		for (let i = vi1; i < vi2; i++) {
			cx.fillText(i, x + text_x - sidebar_gap, y + i * line_h - font_descent - 1)
		}

		// draw text
		cx.textAlign = 'left'
		cx.fillStyle = 'white'
		for (let i = vi1; i < vi2; i++) {
			let s = lines[(i-vi1)]
			let indent_w = indent_n(s) * char_w * 3
			cx.fillText(s, x + text_x + indent_w, y + (i + 1) * line_h - font_descent - 1)
		}

		cx.restore()
	}
})

function code_edit_view(id, opt) {

	let e = {}

	// context-sensitive thus set on each frame
	let lines
	let font_size
	let font_descent
	let line_h
	let char_w
	let max_line_len
	let sidebar_gap
	let text_x
	let text_w
	let text_h
	let last_vi1 = -1, last_vi2 = -1 // visible line range
	let visible_lines = []

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

	function update_text_state() {
		if (!lines)
			lines = opt.code.split('\n')

		max_line_len = 0
		for (let s of lines)
			max_line_len = max(max_line_len, s.length)
	}

	function on_text_frame(a, _i, x, y, w, h, vx, vy, vw, vh) {

		let sx = vx - x
		let sy = vy - y

		// number of lines fully or partially in the viewport.
		let vn = floor(vh / line_h) + 2 // 2 is right, think it!
		let vi1 = floor(sy / line_h)
		let vi2 = vi1 + vn
		vi1 = max(0, min(vi1, lines.length - 1))
		vi2 = max(0, min(vi2, lines.length))

		if (last_vi1 != vi1 || last_vi2 != vi2) {
			visible_lines.length = 0
			for (let i = vi1; i < vi2; i++) {
				let s = lines[i]
				visible_lines.push(s)
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
				line_h, font_size, font_descent, text_x, sidebar_gap, char_w,
				vi1, vi2, visible_lines,
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
		char_w = m.width
		font_descent = m.fontBoundingBoxDescent
		sidebar_gap = sp
		let sidebar_w = (lines.length+'').length * char_w
		text_x = sidebar_w + sidebar_gap
		text_w = ceil(max_line_len * char_w)
		text_h = lines.length * line_h

		// set keyboard state
		focused = ui.focused(id)
		shift = ui.key('shift')
		ctrl  = ui.key('control')

		ui.v(fr, 0, align, valign, min_w, min_h)
			ui.h(0)
			ui.end_h()
			ui.scrollbox(id+'.text_scrollbox', 1, 'auto', 'scroll', 's', 's')
				ui.frame(noop, on_text_frame, 0, 'l', 't', text_w, text_h)
			ui.end_scrollbox()
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
