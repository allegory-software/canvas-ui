
(function () {
"use strict"
const G = window

const {
	cx,
} = ui

function code_edit_view(id, opt) {

	// context-sensitive thus set on each frame
	let lines
	let font_size
	let line_height
	let char_w
	let line_h
	let max_line_len
	let cells_w

	// mouse state
	// let drag_state, dx, dy, cs
	// let gcol_mover
	// let hit_zone // sort_icon, col_divider, col, gcol, cell
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

	function on_cellview_frame(a, _i, x, y, w, h, vx, vy, vw, vh) {
		//

	}

	e.render = function(fr, align, valign, min_w, min_h) {

		// set layout vars

		let sp  = ui.sp1()
		let sp2 = ui.sp2()
		font_size = ui.get_font_size()
		line_h = font_size * 1.5
		let m = measure_text(cx, '0')
		cell_w = m.width
		let line_h = round(text_size * 1.25)
		let char_w = 12
		let gap = sp
		let sidebar_w = (lines.length+'').length * char_w
		let text_x = sidebar_w + gap
		let cells_w =

		// set keyboard state

		focused = ui.focused(id)
		shift = ui.key('shift')
		ctrl  = ui.key('control')

		ui.v(fr, 0, align, valign, min_w, min_h)
			ui.h(0)
			ui.end_h()
			ui.scrollbox(id+'.text_scrollbox', 1, overflow, overflow, 's', 's')
				ui.frame(noop, on_text_frame, 0, 'l', 't', cells_w, cells_h)
			ui.end_scrollbox()
		ui.end_v()

	}

	/*
	view.draw = function(a, i) {
		let x0 = a[i+0]
		let y0 = a[i+1]
		let w = a[i+2]
		let h = a[i+3]
		let id      = a[i+VIEW_ID]
		let edit_id = a[i+EDIT_ID]

		let cx = ui.cx
		let ss = ui.state(edit_id)
		let lines = ss.get('lines')

		let text_size = 16
		let line_h = round(text_size * 1.25)
		let char_w = text_size
		let gap = char_w
		let sidebar_w = (lines.length+'').length * char_w
		let text_x = x0 + sidebar_w + gap

		cx.save()

		cx.font = text_size+'px monospace'

		cx.fillStyle = 'black'
		cx.fillRect(x0, y0, w, h)

		let hs = ui.hit(id)
		let hit_line = hs?.get('line')
		if (hit_line != null) {
			cx.fillStyle = ui.bg_color('bg1')
			cx.fillRect(text_x, y0 + hit_line * line_h, w, line_h)
		}
		let vi0 = 0
		let vi1 = 10 //lines.length

		for (let i = vi0; i < vi1; i++) {
			let y = y0 + i * line_h + line_h - 5
			cx.fillStyle = 'gray'
			cx.textAlign = 'right'
			cx.fillText(i+'', text_x - gap, y)
			let s = lines[i]
			cx.fillStyle = 'white'
			cx.textAlign = 'left'
			cx.fillText(s, text_x, y)
		}

		cx.restore()
	}

	view.hit = function(a, i) {
		let x = a[i+0]
		let y = a[i+1]
		let w = a[i+2]
		let h = a[i+3]
		let id      = a[i+VIEW_ID]
		let edit_id = a[i+EDIT_ID]

		let cx = ui.cx
		let ss = ui.state(edit_id)
		let lines = ss.get('lines')

		let text_size = 16
		let line_h = round(text_size * 1.25)
		let char_w = 12
		let gap = 10
		let sidebar_w = (lines.length+'').length * char_w
		let text_x = sidebar_w + gap

		if (ui.hit_box(a, i)) {
			let hs = ui.hover(id)
			let line = floor((ui.my - y) / line_h)
			let col = floor((ui.mx - text_x) / char_w)
			hs.set('line', line)
			hs.set('col', col)
			return true
		}

	}
	*/

	view.free = function() {}

	update_text_state()
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
