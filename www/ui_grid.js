
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

function init_nav(id, e) {

	let horiz = true
	let line_height = 22

	let cells_w

	let hit_state // this affects both rendering and behavior in many ways.
	let hit_mx, hit_my // last mouse coords, needed on scroll event.
	let hit_target // last mouse target, needed on click events.
	let hit_dx, hit_dy // mouse coords relative to the dragged object.
	let hit_ri, hit_fi, hit_indent // the hit cell and whether the cell indent was hit.
	let row_move_state // additional state when row moving

	let padding_x = ui.spx_input()
	let padding_y = ui.spy_input()

	e.cell_border_v_width = 0
	e.cell_border_h_width = 1

	let cell_h = round(line_height + 2 * padding_y + e.cell_border_h_width)
	let header_h = cell_h

	let col_resizing
	let auto_expand

	/*
	cells_w = bx + col_x

	// prevent cells_w shrinking while col resizing to prevent scroll_x changes.
	if (col_resizing && !e.auto_expand)
		cells_w = max(cells_w, last_cells_w)

	page_row_count = floor(cells_view_h / cell_h)
	vrn = floor(cells_view_h / cell_h) + 2 // 2 is right, think it!

	function field_has_indent(field) {
		return horiz && field == e.tree_field
	}

	function measure_cell_width(row, field) {
		cx.measure = true
		e.draw_cell(row, field, cx)
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
	*/

	let draw_cell_x
	let draw_cell_w
	function draw_cell_at(a, row, field, ri, fi, x, y, w, h, draw_stage) {

		let input_val = e.cell_input_val(row, field)

		// static geometry
		let bx  = e.cell_border_v_width
		let by  = e.cell_border_h_width
		let px = e.padding_x + bx
		let py = e.padding_y + by

		// state
		let grid_focused = e.focused
		let row_focused = e.focused_row == row
		let cell_focused = row_focused && (!e.can_focus_cells || field == e.focused_field)
		let disabled = e.is_cell_disabled(row, field)
		let is_new = row.is_new
		let cell_invalid = e.cell_has_errors(row, field)
		let modified = e.cell_modified(row, field)
		let is_null = input_val == null
		let is_empty = input_val === ''
		let sel_fields = e.selected_rows.get(row)
		let selected = (isobject(sel_fields) ? sel_fields.has(field) : sel_fields) || false
		let editing = !!e.editor && cell_focused
		let hovering = hit_state == 'cell' && hit_ri == ri && hit_fi == fi
		let full_width = !draw_stage && ((row_focused && field == e.focused_field) || hovering)

		/*
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
		*/

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
			e.draw_val(row, field, input_val, true, full_width)
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
			cx.quicksearch_len = cell_focused && e.quicksearch_text.length || 0
			e.draw_val(row, field, input_val, cx)

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
	cell_rect = function(ri, fi) {
		let row   = rows[ri]
		let field = e.fields[fi]
		let ry = ri * e.cell_h
		let x = field._X
		let y = ry
		let w = field._w
		let h = cell_h
		r[0] = x
		r[1] = y
		r[2] = w
		r[3] = h
		return r
	}
	}

	function draw_cell(a, ri, fi, x0, draw_stage) {
		let row   = rows[ri]
		let field = e.fields[fi]
		let ry = ri * e.cell_h
		let [x, y, w, h] = cell_rect(ri, fi)
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

			foc_ri = e.focused_row_index
			foc_fi = e.focused_field_index

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

				let field = e.fields[fi]
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

	let h_sb_i // cmd record index of header scrollbox
	let sb_i   // cmd record index of cellview scrollbox

	function on_cellview_frame(a, _i, x, y, w, h, vx, vy, vw, vh) {

		let sx = vx - x
		let sy = vy - y

		// scroll the header scrollbox to match the scroll offset of the cell view.
		ui.force_scroll(a, h_sb_i, sx, 0)

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
		ri1 = max(0, min(ri1, e.rows.length - 1))
		ri2 = max(0, min(ri2, e.rows.length))

		// layout fields

		if (0) {
		let x = 0
		for (let field of e.fields) {
			let w = min(max(field.w, field.min_w), field.max_w)
			let cw = w + 2 * ui.sp2()
			field._x = x
			field._w = cw
			x += cw
		}
		}

		// find the visible field range

		let fi1, fi2 // visible field range.
		for (let field of e.fields) {
			let fx = field._x
			let fw = field._w
			if (fi1 == null && fx + fw >= vx)
				fi1 = field.index
			if (fi2 == null && fx > vx + vw)
				fi2 = field.index
		}
		fi2 = fi2 ?? e.fields.length

		let bx = e.cell_border_v_width
		let by = e.cell_border_h_width

		let i = e.fields.at(-1).ct_i
		cells_w = a[i+0] + a[i+2]

		hit_state = null
		hit_ri = null
		hit_fi = null
		if (ui.hit(id+'.cells')) {
			hit_ri = floor((ui.my - y) / cell_h)
			for (let fi = 0; fi < e.fields.length; fi++) {
				let [x1, y1, w, h] = cell_rect(a, hit_ri, fi, x)
				let hit_dx = ui.mx - x1 - x
				let hit_dy = ui.my - y1 - y
				if (hit_dx >= 0 && hit_dx <= w) {
					let field = e.fields[fi]
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
			draw_cells_range(a, x, y, e.rows, s.vri1, s.vri2, 0, e.fields.length, 'non_moving_rows')
			draw_cells_range(s.rows, s.move_vri1, s.move_vri2, 0, e.fields.length, 'moving_rows')
		} else if (hit_state == 'col_moving') { // draw fixed cols first and moving cols above them.
			draw_cells_range(a, x, y, e.rows, ri1, ri2, 0, e.fields.length, 'non_moving_cols')
			draw_cells_range(a, x, y, e.rows, ri1, ri2, hit_fi, hit_fi + 1, 'moving_cols')
		} else {
			draw_cells_range(a, x, y, e.rows, ri1, ri2, fi1, fi2, cell_h)
		}

		ui.end_stack()

	}

	e.render = function(fr, align, valign, min_w, min_h) {

		ui.v(fr, 0, align, valign, min_w, min_h)

			function draw_header_cell(field, w, cw, noclip) {
				ui.m(field._x, 0, 0, 0)
				let c_id = id+'.header_cell_'+field.index
				ui.stack('', 0, 'l', 't', cw, header_h)
					ui.bb('', noclip ? 'bg1' : null, 'r', 'intense')
					ui.p(ui.sp2(), 0)
					ui.text('', field.label, 0, field.align, 'c', noclip ? null : w)
				ui.end_stack()
			}

			h_sb_i = ui.scrollbox(id+'.header_scrollbox', 0, auto_expand ? 'contain' : 'hide', 'contain')

				let hit_h_fi
				if (ui.hit(id+'.header_scrollbox')) {
					for (let field of e.fields) {
						let x = field._x
						let w = field._w
						if (ui.mx >= x && ui.mx <= w) {
							hit_h_fi = field.index
							break
						}
					}
				}

				ui.bb('', 'bg1')
				let x = 0
				for (let field of e.fields) {
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
					let field = e.fields[hit_h_fi]
					let w = min(max(field.w, field.min_w), field.max_w)
					let cw = w + 2 * ui.sp2()
					draw_header_cell(field, w, cw, true)
				}

			ui.end_scrollbox()

			let cells_w = 0
			for (let field of e.fields)
				cells_w += min(max(field.w, field.min_w), field.max_w)
			let cells_h = e.rows.length * cell_h

			let overflow = auto_expand ? 'contain' : 'auto'
			sb_i = ui.scrollbox(id+'.cells_scrollbox', 1, overflow, overflow, 's', 's')
				ui.frame(noop, on_cellview_frame, 0, 'l', 't', cells_w, cells_h)
			ui.end_scrollbox()

		ui.end_v()

	}

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
		init_nav(id, nav)
		s.set('nav', nav)
	}
	nav.render(fr, align, valign, min_w, min_h)

}

}()) // module function
