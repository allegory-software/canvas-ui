
(function () {
"use strict"
const G = window
const ui = G.ui

const {
	pr,
	isstr, isobj, isobject,
	map,
	round, min, max, floor,
} = glue

const {
	align_x,
	align_w,
	inner_x,
	inner_w,
	add_ct_min_wh,
	FR,
	S,
	cx,
} = ui

// cell view -----------------------------------------------------------------

let cellview = {}

let CELLVIEW_SB_I   = ui.FRAME_ARGS_I+0
let CELLVIEW_H_SB_I = ui.FRAME_ARGS_I+1

function cellview_view(id, nav) {

	let e = {}

	let horiz = true

	let cells_w

	let hit_state // this affects both rendering and behavior in many ways.
	let hit_mx, hit_my // last mouse coords, needed on scroll event.
	let hit_target // last mouse target, needed on click events.
	let hit_dx, hit_dy // mouse coords relative to the dragged object.
	let hit_ri, hit_fi, hit_indent // the hit cell and whether the cell indent was hit.
	let row_move_state // additional state when row moving

	e.measure = function(axis) {
		if (horiz) {
			if (!axis) {
				let min_w = 0
				for (let field of nav.fields) {
					min_w += field.min_w
				}
				return min_w
			} else {
				return e.cells_h
			}
		} else {
			return 0
		}
	}

	e.on_frame_measure = function(axis) {
		return !axis ? e.cells_w : e.cells_h
	}

	function field_has_indent(field) {
		return horiz && field == e.tree_field
	}

	function measure_cell_width(row, field) {
		cx.measure = true
		nav.draw_cell(row, field, cx)
		cx.measure = false
		return cx.measured_width
	}

	function draw_cell_border(cx, w, h, bx, by, color_x, color_y, draw_stage) {
		let bw = w - .5
		let bh = h - .5
		let zz = -.5
		if (by && color_y != null) { // horizontals
			cx.beginPath()
			cx.lineWidth = by
			cx.strokeStyle = color_y

			// top line
			if (!horiz && draw_stage == 'moving_cols') {
				cx.moveTo(zz, zz)
				cx.lineTo(bw, zz)
			}
			// bottom line
			cx.moveTo(zz, bh)
			cx.lineTo(bw, bh)

			cx.stroke()
		}
		if (bx && color_x != null) { // verticals
			cx.beginPath()
			cx.lineWidth = bx
			cx.strokeStyle = color_x

			// left line
			if (horiz && draw_stage == 'moving_cols') {
				cx.moveTo(zz, zz)
				cx.lineTo(zz, bh)
			}
			// right line
			cx.moveTo(bw, zz)
			cx.lineTo(bw, bh)

			cx.stroke()
		}
	}

	let draw_cell_x
	let draw_cell_w
	function draw_cell_at(a, row, field, ri, fi, x, y, w, h, draw_stage) {

		let input_val = nav.cell_input_val(row, field)

		// static geometry
		let bx  = e.cell_border_v_width
		let by  = e.cell_border_h_width
		let px = e.padding_x + bx
		let py = e.padding_y + by

		// state
		let grid_focused = nav.focused
		let row_focused = nav.focused_row == row
		let cell_focused = row_focused && (!nav.can_focus_cells || field == nav.focused_field)
		let disabled = nav.is_cell_disabled(row, field)
		let is_new = row.is_new
		let cell_invalid = nav.cell_has_errors(row, field)
		let modified = nav.cell_modified(row, field)
		let is_null = input_val == null
		let is_empty = input_val === ''
		let sel_fields = nav.selected_rows.get(row)
		let selected = (isobject(sel_fields) ? sel_fields.has(field) : sel_fields) || false
		let editing = !!e.editor && cell_focused
		let hovering = hit_state == 'cell' && hit_ri == ri && hit_fi == fi
		let full_width = !draw_stage && ((row_focused && field == nav.focused_field) || hovering)

		let indent_x = 0
		let collapsed
		if (field_has_indent(field)) {
			indent_x = indent_offset(row_indent(row))
			let has_children = row.child_rows.length > 0
			if (has_children)
				collapsed = !!row.collapsed
			let s = row_move_state
			if (s) {
				// show minus sign on adopting parent.
				if (row == s.hit_parent_row && collapsed == null)
					collapsed = false

				// shift indent on moving rows so it gets under the adopting parent.
				if (draw_stage == 'moving_rows')
					indent_x += s.hit_indent_x - s.indent_x
			}
		}

		// background & text color
		// drawing a background is slow, so we avoid it when we can.
		let bg, bgs

		if (draw_stage == 'moving_cols' || draw_stage == 'moving_rows')
			bg = 'bg2'
		if (editing) {
			bg = 'item'
			bgs = grid_focused ? 'item-focused focused' : 'item-focused'
		} else if (cell_invalid) {
			bg = 'item'
			bgs = grid_focused && cell_focused ? 'item-error item-focused' : 'item-error'
		} else if (cell_focused) {
			bg = 'item'
			if (selected)
				bgs = grid_focused
					? 'item-focused item-selected focused'
					: 'item-focused item-selected'
			else
				bgs = grid_focused
					? 'item-focused focused'
					: 'item-selected'
		} else if (selected) {
			bg = 'item'
			bgs = grid_focused ? 'item-selected focused' : 'item-selected'
		} else if (is_new) {
			bg = 'item'
			bgs = modified ? 'new modified' : 'new'
		} else if (modified) {
			bg = 'item'
			bgs = 'modified'
		} else if (row_focused) {
			bg = 'row'
			bgs = grid_focused ? 'item-focused focused' : 'item-focused'
		}
		if (!bg)
			if ((ri & 1) == 0)
				bg = 'alt'
			else if (full_width)
				bg = 'bg'

		let fg
		if (is_null || is_empty || disabled)
			fg = 'label'
		else
			fg = 'text'

		// drawing

		ui.m(x, y, 0, 0)
		ui.stack('', 0, 'l', 't', w, h)
			ui.p(ui.sp2(), 0)
			ui.bb('', bg, bgs, 't', 'light')
			ui.color(fg)
			nav.draw_val(row, field, input_val, true, full_width)
		ui.end_stack()

		/*

		if (!editing) {

			cx.save()

			// clip
			cx.beginPath()
			cx.translate(px, py)
			let cw = w - px - px
			let ch = h - py - py
			cx.cw = cw
			cx.ch = ch
			cx.rect(0, 0, cw, ch)
			cx.clip()

			let y = round(ch / 2)

			// tree node sign
			if (collapsed != null) {
				cx.fillStyle = selected ? fg : e.bg_focused_selected
				cx.font = cx.icon_font
				let x = indent_x - e.font_size - 4
				cx.textBaseline = 'middle'
				cx.fillText(collapsed ? '\uf0fe' : '\uf146', x, y)
			}

			// text
			cx.translate(indent_x, 0)
			cx.fg_text = fg
			cx.quicksearch_len = cell_focused && nav.quicksearch_text.length || 0
			nav.draw_val(row, field, input_val, cx)

			cx.restore()
		}

		cx.restore()

		*/

		// TODO:
		//if (ri != null && focused)
		//	update_editor(
		//		 horiz ? null : xy,
		//		!horiz ? null : xy, hit_indent)

		draw_cell_x = x
		draw_cell_w = w
	}

	let cell_rect
	{
	let r = [0, 0, 0, 0]
	cell_rect = function(a, ri, fi, x0) {
		let row   = rows[ri]
		let field = nav.fields[fi]
		let ry = ri * e.cell_h
		let x = a[field.ct_i+0] - x0
		let y = ry
		let w = a[field.ct_i+2]
		let h = a[field.ct_i+3]
		r[0] = x
		r[1] = y
		r[2] = w
		r[3] = h
		return r
	}
	}

	function draw_cell(a, ri, fi, x0, draw_stage) {
		let row   = rows[ri]
		let field = nav.fields[fi]
		let ry = ri * e.cell_h
		let x = a[field.ct_i+0] - x0
		let y = ry
		let w = a[field.ct_i+2]
		let h = a[field.ct_i+3]
		draw_cell_at(a, row, field, ri, fi, x, y, w, h, draw_stage)
	}

	function draw_hover_outline(x, y, w, h) {

		let bx = e.cell_border_v_width
		let by = e.cell_border_h_width
		let bw = w - .5
		let bh = h - .5

		cx.save()
		cx.translate(x, y)

		cx.lineWidth = bx || by

		// add a background to override the borders.
		cx.strokeStyle = e.bg
		cx.setLineDash(empty_array)
		cx.beginPath()
		cx.rect(-.5, -.5, bw + .5, bh + .5)
		cx.stroke()

		// draw the actual hover outline.
		cx.strokeStyle = e.fg
		cx.setLineDash([1, 3])
		cx.beginPath()
		cx.rect(-.5, -.5, bw + .5, bh + .5)
		cx.stroke()

		cx.restore()
	}

	function draw_cells_range(a, x0, y0, rows, ri1, ri2, fi1, fi2, cell_h, draw_stage) {

		let hit_cell, foc_cell, foc_ri, foc_fi

		if (!draw_stage) {

			foc_ri = nav.focused_row_index
			foc_fi = nav.focused_field_index

			hit_cell = hit_state == 'cell'
				&& hit_ri >= ri1 && hit_ri <= ri2
				&& hit_fi >= fi1 && hit_fi <= fi2

			foc_cell = foc_ri != null && foc_fi != null

			// when foc_cell and hit_cell are the same, don't draw them twice.
			if (foc_cell && hit_cell && hit_ri == foc_ri && hit_fi == foc_fi)
				foc_cell = null

		}
		let skip_moving_col // = hit_state == 'col_moving' && draw_stage == 'non_moving_cols'

		for (let ri = ri1; ri < ri2; ri++) {

			let row = rows[ri]

			let rx = x0
			let ry = ri * e.cell_h
			let rw = cells_w
			let rh = e.cell_h

			let foc_cell_now = foc_cell && foc_ri == ri
			let hit_cell_now = hit_cell && hit_ri == ri

			for (let fi = fi1; fi < fi2; fi++) {
				if (skip_moving_col && hit_fi == fi)
					continue
				if (hit_cell_now && hit_fi == fi)
					continue
				if (foc_cell_now && foc_fi == fi)
					continue

				let field = nav.fields[fi]
				let x = field._x
				let y = ry
				let w = field._w
				let h = a[field.ct_i+3]

				draw_cell_at(a, row, field, ri, fi, x, y, w, h, draw_stage)
			}

			if (row.removed)
				draw_row_strike_line(row, ri, rx, ry, rw, rh, draw_stage)
		}

		if (foc_cell && foc_ri >= ri1 && foc_ri <= ri2 && foc_fi >= fi1 && foc_fi <= fi2) {
			draw_cell(a, foc_ri, foc_fi, x0, draw_stage)
		}

		// hit_cell can overlap foc_cell, so we draw it after it.
		draw_cell_x = null
		draw_cell_w = null
		if (hit_cell && hit_ri >= ri1 && hit_ri <= ri2 && hit_fi >= fi1 && hit_fi <= fi2) {
			draw_cell(a, hit_ri, hit_fi, x0, draw_stage)
		}

		/*
		for (let ri = ri1; ri < ri2; ri++) {
			let row = rows[ri]
			if (row.errors && row.errors.failed) {
				let ry = ri * e.cell_h
				draw_row_invalid_border(row, ri, rx, ry, rw, rh, draw_stage)
			}
		}

		if (draw_cell_w != null) {
			let [x, y, w, h] = cell_rect(hit_ri, hit_fi, draw_stage)
			x = draw_cell_x
			w = draw_cell_w
			draw_hover_outline(x, y, w, h)
		}
		*/

	}

	e.on_frame = function(a, _i, x, y, w, h, vx, vy, vw, vh) {

		// scroll the header to match the horizontal scroll of the cell view.
		{
		let sb_i   = a[_i+CELLVIEW_SB_I]
		let h_sb_i = a[_i+CELLVIEW_H_SB_I]
		let sx = ui.scroll_xy(a, sb_i, 0)
		ui.force_scroll(a, h_sb_i, sx, 0)
		}

		let cell_h = e.cell_h

		let sx = vx - x
		let sy = vy - y

		// find the visible row range

		let rn // number of rows fully or partially in the viewport.
		let ri1, ri2 // visible row range.
		if (horiz) {
			ri1 = floor(sy / cell_h)
		} else {
			ri1 = floor(sx / cell_w)
		}
		rn = floor(vh / cell_h) + 2 // 2 is right, think it!
		ri2 = ri1 + rn
		ri1 = max(0, min(ri1, nav.rows.length - 1))
		ri2 = max(0, min(ri2, nav.rows.length))

		// find the visible field range

		let fi1, fi2 // visible field range.
		for (let field of nav.fields) {
			let i = field.ct_i
			let fx = a[i+0]
			let fw = a[i+2]
			if (fi1 == null && fx + fw >= vx)
				fi1 = field.index
			if (fi2 == null && fx > vx + vw)
				fi2 = field.index
		}
		fi2 = fi2 ?? nav.fields.length

		let bx = e.cell_border_v_width
		let by = e.cell_border_h_width

		let i = nav.fields.at(-1).ct_i
		cells_w = a[i+0] + a[i+2]

		hit_state = null
		hit_ri = null
		hit_fi = null
		if (ui.hit(id+'.cells')) {
			hit_ri = floor((ui.my - y) / cell_h)
			for (let fi = 0; fi < nav.fields.length; fi++) {
				let [x1, y1, w, h] = cell_rect(a, hit_ri, fi, x)
				let hit_dx = ui.mx - x1 - x
				let hit_dy = ui.my - y1 - y
				if (hit_dx >= 0 && hit_dx <= w) {
					let field = nav.fields[fi]
					hit_state = 'cell'
					hit_fi = fi
					/*
					hit_indent = false
					if (row && field_has_indent(field)) {
						let has_children = row.child_rows.length > 0
						if (has_children) {
							let indent_x = indent_offset(row_indent(row))
							hit_indent = hit_dx <= indent_x
						}
					}
					*/
					break
				}
			}
		}

		x += bx
		y = by

		ui.stack(id+'.cells')

		if (hit_state == 'row_moving') { // draw fixed rows first and moving rows above them.
			let s = row_move_state
			draw_cells_range(a, x, y, nav.rows, s.vri1, s.vri2, 0, nav.fields.length, 'non_moving_rows')
			draw_cells_range(s.rows, s.move_vri1, s.move_vri2, 0, nav.fields.length, 'moving_rows')
		} else if (hit_state == 'col_moving') { // draw fixed cols first and moving cols above them.
			draw_cells_range(a, x, y, nav.rows, ri1, ri2, 0, nav.fields.length, 'non_moving_cols')
			draw_cells_range(a, x, y, nav.rows, ri1, ri2, hit_fi, hit_fi + 1, 'moving_cols')
		} else {
			draw_cells_range(a, x, y, nav.rows, ri1, ri2, fi1, fi2, cell_h)
		}

		ui.end_stack()

	}

	return e

}

// grid ----------------------------------------------------------------------

ui.spx_input = function() {
	return ui.sp2()
}

ui.spy_input = function() {
	return ui.sp1()
}

ui.grid = function(id, rowset, fr, align, valign, min_w, min_h) {

	ui.keepalive(id)
	let s = ui.state(id)
	let nav = s.get('nav')
	if (!nav) {
		nav = ui.nav({
			rowset_name : isstr(rowset) ? rowset : null,
			rowset      : isobj(rowset) ? rowset : null,
		})
		ui.on_free(id, () => nav.free())
		nav.view = cellview_view(id, nav)
		nav.view.cell_border_v_width = 0
		nav.view.cell_border_h_width = 1
		G.nav = nav // TODO: remove
		G.view = nav.view // TODO: remove
		s.set('nav', nav)
	}
	let view = nav.view

	let line_height = 22

	view.padding_x = ui.spx_input()
	view.padding_y = ui.spy_input()

	view.cell_h  = round(line_height + 2 * view.padding_y + view.cell_border_h_width)
	let header_h = round(line_height + 2 * view.padding_y + view.cell_border_h_width)

	let horiz = true
	let auto_expand = false

	if (horiz) {

		ui.v(fr, 0, align, valign, min_w, min_h)

			function draw_header_cell(field, w, cw, noclip) {
				ui.m(field._x, 0, 0, 0)
				let c_id = id+'.header_cell_'+field.index
				let ct_i = ui.stack(id+'.header_cell_'+field.index, 0, 'l', 't', cw, header_h)
					ui.bb('', noclip ? 'bg1' : null, 'r', 'intense')
					ui.p(ui.sp2(), 0)
					ui.text('', field.label, 0, field.align, 'c', noclip ? null : w)
					field.ct_i = ct_i
				ui.end_stack()
			}

			let hit_h_fi
			for (let field of nav.fields) {
				let c_id = id+'.header_cell_'+field.index
				if (ui.hit(c_id))
					hit_h_fi = field.index
			}

			let h_sb_i = ui.scrollbox(id+'.header_scrollbox', 0, auto_expand ? 'contain' : 'hide', 'contain')
				ui.bb('', 'bg1')
				let x = 0
				for (let field of nav.fields) {
					let w = min(max(field.w, field.min_w), field.max_w)
					let cw = w + 2 * ui.sp2()
					field._x = x
					field._w = cw
					x += cw
					if (hit_h_fi === field.index)
						continue
					draw_header_cell(field, w, cw)
				}

				if (hit_h_fi != null) {
					let field = nav.fields[hit_h_fi]
					let w = min(max(field.w, field.min_w), field.max_w)
					let cw = w + 2 * ui.sp2()
					draw_header_cell(field, w, cw, true)
				}

			ui.end_scrollbox()

			let cells_w = 0
			for (let field of nav.fields)
				cells_w += min(max(field.w, field.min_w), field.max_w)
			let cells_h = nav.rows.length * view.cell_h

			let overflow = auto_expand ? 'contain' : 'auto'
			let sb_i = ui.scrollbox(id+'.cells_scrollbox', 1, overflow, overflow, 's', 's')
				ui.frame(noop, view.on_frame, 0, 'l', 't', cells_w, cells_h, sb_i, h_sb_i)
			ui.end_scrollbox()

		ui.end_v()

	} else {

	}
}

}()) // module function
