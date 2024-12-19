
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

ui.widget('treegrid_indent', {
	create: function(cmd, indent, state) {
		return ui.cmd(cmd, ui.ct_i(), indent, state)
	},
	draw: function(a, i) {
		let ct_i   = a[i+0]
		let indent = a[i+1]
		let state  = a[i+2]
		let x = a[ct_i+0]
		let y = a[ct_i+1]
		let w = a[ct_i+2]
		let h = a[ct_i+3]
		cx.fillStyle = 'red'
		cx.beginPath()
		cx.rect(x, y, w, h)
		cx.fill()
	},
})

// cell view -----------------------------------------------------------------

function init_nav(id, e) {

	let horiz = true
	let line_height = 22

	let cells_w
	let page_row_count

	let shift, ctrl
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

	function field_has_indent(field) {
		return horiz && field == e.tree_field
	}

	let font_size = 14

	function indent_offset(indent) {
		return floor(font_size * 1.5 + (font_size * 1.2) * indent)
	}

	function row_indent(row) {
		return row.depth ?? 0
	}

	/*
	cells_w = bx + col_x

	// prevent cells_w shrinking while col resizing to prevent scroll_x changes.
	if (col_resizing && !e.auto_expand)
		cells_w = max(cells_w, last_cells_w)

	vrn = floor(cells_view_h / cell_h) + 2 // 2 is right, think it!

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

	function draw_cell_at(a, row, field, ri, fi, x, y, w, h, draw_stage) {

		let input_val = e.cell_input_val(row, field)

		// static geometry
		let bx  = e.cell_border_v_width
		let by  = e.cell_border_h_width
		let px = e.padding_x + bx
		let py = e.padding_y + by

		// state
		let grid_focused = ui.focused(id)
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

		let indent_x = 0
		let collapsed
		let has_children
		if (field_has_indent(field)) {
			indent_x = indent_offset(row_indent(row))
			has_children = (row.child_rows?.length ?? 0) > 0
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
		if (!bg) {
			if (row.is_group_row)
				bg = 'bg2'
			else if ((ri & 1) == 0)
				bg = 'alt'
			else if (full_width)
				bg = 'bg'
		}

		let fg
		if (is_null || is_empty || disabled)
			fg = 'label'
		else
			fg = 'text'

		// drawing

		ui.m(x, y, 0, 0)
		ui.stack('', 0, 'l', 't', w, h)
			ui.bb('', bg, bgs, 't', 'light')
			ui.color(fg)
			if (has_children) {
				ui.p(indent_x - ui.sp2(), 0, ui.sp2(), 0)
				ui.scope()
				ui.font('fas')
				ui.text('', collapsed ? '\uf0fe' : '\uf146')
				// ui.treegrid_indent(indent_x)
				ui.end_scope()
			}
			ui.p(ui.sp2() + indent_x, 0, ui.sp2(), 0)
			e.draw_val(row, field, input_val, true, full_width)
			ui.p(0)
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
	}

	let cell_rect
	{
	let r = [0, 0, 0, 0]
	cell_rect = function(ri, fi) {
		let field = e.fields[fi]
		let ry = ri * cell_h
		let x = field._x
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

	function draw_cell(a, ri, fi, draw_stage) {
		let [x, y, w, h] = cell_rect(ri, fi)
		let row   = e.rows[ri]
		let field = e.fields[fi]
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

	function draw_cells_range(a, x0, y0, rows, ri1, ri2, fi1, fi2, draw_stage) {

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
			let ry = ri * cell_h
			let rw = cells_w
			let rh = cell_h

			let row_is_foc = foc_cell && foc_ri == ri
			let row_is_hit = hit_cell && hit_ri == ri

			for (let fi = fi1; fi < fi2; fi++) {
				if (skip_moving_col && hit_fi == fi)
					continue
				if (row_is_hit && hit_fi == fi)
					continue
				if (row_is_foc && foc_fi == fi)
					continue

				let field = e.fields[fi]
				let x = field._x
				let y = ry
				let w = field._w
				let h = rh

				draw_cell_at(a, row, field, ri, fi, x, y, w, h, draw_stage)
			}

			if (row.removed)
				draw_row_strike_line(row, ri, rx, ry, rw, rh, draw_stage)
		}

		if (foc_cell && foc_ri >= ri1 && foc_ri <= ri2 && foc_fi >= fi1 && foc_fi <= fi2) {
			draw_cell(a, foc_ri, foc_fi, draw_stage)
		}

		// hit_cell can overlap foc_cell, so we draw it after it.
		if (hit_cell && hit_ri >= ri1 && hit_ri <= ri2 && hit_fi >= fi1 && hit_fi <= fi2) {
			draw_cell(a, hit_ri, hit_fi, draw_stage)
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

		page_row_count = floor(vh / cell_h)

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

		// find the visible field range

		let fi1, fi2 // visible field range.
		for (let field of e.fields) {
			let fx = field._x + x
			let fw = field._w
			if (fi1 == null && fx + fw >= vx)
				fi1 = field.index
			if (fi2 == null && fx > vx + vw)
				fi2 = field.index
		}
		fi2 = fi2 ?? e.fields.length

		let bx = e.cell_border_v_width
		let by = e.cell_border_h_width

		// draw cells

		ui.stack(id+'.cells')
		ui.measure(id+'.cells')

		x = bx + sx
		y = by + sy

		if (hit_state == 'row_moving') { // draw fixed rows first and moving rows above them.
			let s = row_move_state
			draw_cells_range(a, x, y, e.rows, s.vri1, s.vri2, fi1, fi2, 'non_moving_rows')
			draw_cells_range(s.rows, s.move_vri1, s.move_vri2, fi1, fi2, 'moving_rows')
		} else if (hit_state == 'col_moving') { // draw fixed cols first and moving cols above them.
			draw_cells_range(a, x, y, e.rows, ri1, ri2, fi1, fi2, 'non_moving_cols')
			draw_cells_range(a, x, y, e.rows, ri1, ri2, hit_fi, hit_fi + 1, 'moving_cols')
		} else {
			draw_cells_range(a, x, y, e.rows, ri1, ri2, fi1, fi2)
		}

		ui.end_stack()

	}

	// group-by bar -----------------------------------------------------------

	let render_group_by_bar
	{
	let drag_col
	let mover, xs, is, x0, y0
	let levels = []
	let min_levels = []
	let max_levels = []

	render_group_by_bar = function() {
		ui.sb('', 0, 'hide', 'hide', 's', 't', null, cell_h * 2)
			ui.bb('', 'bg2', null, 'tb', 'light')

			let w = 80
			let h = line_height + ui.sp()

			let drag_col_rec
			for (let col of e.groups?.cols || empty_array) {
				let def = e.groups.range_defs[col]
				let x = def.index * (w + 1)
				let y = def.group_level * 10
				let gc_id = id+'.group_col.'+col
				let [state, dx, dy] = ui.drag(gc_id)
				if (state == 'drag') {
					drag_col = col
					mover = ui.live_move_mixin()
					is = [] // col_index -> col_visual_index
					xs = [] // col_index -> col_x
					mover.movable_element_size = function() {
						return w + 1
					}
					mover.set_movable_element_pos = function(i, x, moving, vi) {
						xs[i] = x
						if (vi != null)
							is[i] = vi
					}
					mover.move_element_start(def.index, 1, 0, e.groups.cols.length)
					x0 = x
					y0 = y

					let last_level = 0
					let i = 0
					for (let col of e.groups.cols) {
						let def = e.groups.range_defs[col]
						let level = def.group_level
						levels    [i] = level
						min_levels[i] = level
						max_levels[i] = level
						if (level != last_level) {
							if (min_levels[i])
								min_levels[i]--
							if (last_level)
								max_levels[i-1]++
						}
						last_level = level
						i++
					}

				}
				if (state == 'drag' || state == 'dragging') {
					mover.move_element_update(x0 + dx)
				}

				if (mover) {
					let vi = is[def.index]
					let level = levels[vi]
					if (drag_col == col) {
						let min_level = min_levels[vi]
						let max_level = max_levels[vi]
						level = clamp(round((y0 + dy) / 10), min_level, max_level)
					}
					x = xs[def.index]
					y = level * 10
				}

				if (drag_col == col)
					ui.record()

				ui.m(ui.sp2() + x, ui.sp2() + y, 0, 0)
				ui.stack(gc_id, 0, 'l', 't', w, h)
					ui.bb('', 'bg1',
							state == 'hover' ? 'hover' :
							state == 'dragging' || state == 'drag'
							? 'active' : null,
						1, 'intense')
					ui.m(ui.sp2(), ui.sp075())
					ui.text('', col, 1, 'l', 'c', w - 2 * ui.sp2())
				ui.end_stack()

				if (drag_col == col)
					drag_col_rec = ui.end_record()

				if (state == 'drop') {
					drag_col = null
					mover    = null
				}
			}

			if (drag_col_rec)
				ui.record_play(drag_col_rec)

		ui.end_sb()
	}
	} // render_group_by_bar scope

	// render grid ------------------------------------------------------------

	e.render = function(fr, align, valign, min_w, min_h) {

		// layout fields and compute cell grid size.

		cells_w = 0
		for (let field of e.fields) {
			let w = clamp(field.w, field.min_w, field.max_w)
			let cw = w + 2 * ui.sp2()
			if (hit_state != 'col_moving')
				field._x = cells_w
			field._w = cw
			cells_w += cw
		}

		process_mouse()

		if (ui.focused(id))
			keydown()

		ui.v(fr, 0, align, valign, min_w, min_h)

			// group-by bar

			render_group_by_bar()

			// header

			function draw_header_cell(field, noclip) {
				ui.m(field._x, 0, 0, 0)
				ui.p(ui.sp2(), 0)
				ui.h(0, ui.sp(), 'l', 't', field._w - 2 * ui.sp2(), header_h)
					ui.bb('', 'bg1', null, 'r', 'light')

					let max_min_w = noclip ? null : max(0,
						field._w
							- 2 * ui.sp2()
							- (field.sort_dir ? 2 * ui.sp2() : 0)
					)
					let pri = field.sort_priority

					if (field.align != 'right')
						ui.text('', field.label, 1, field.align, 'c', max_min_w)

					if (field.sort_dir) {
						ui.scope()
						ui.font('fas')
						ui.text(id+'.sort', field.sort_dir == 'asc'
							? (pri ? '\uf106' : '\uf102')
							: (pri ? '\uf107' : '\uf103'),
						0)
						ui.end_scope()
					}

					if (field.align == 'right')
						ui.text('', field.label, 1, field.align, 'c', max_min_w)

				ui.end_h()
			}

			h_sb_i = ui.scrollbox('', 0, auto_expand ? 'contain' : 'hide', 'contain')

				ui.stack(id+'.header_cells')
				ui.measure(id+'.header_cells')

					let col_move = hit_state == 'col_moving' || hit_state == 'col_move'

					ui.bb('', 'bg1')
					for (let field of e.fields) {
						if (col_move && hit_fi === field.index)
							continue
						draw_header_cell(field)
					}

					if (col_move && hit_fi != null) {
						let field = e.fields[hit_fi]
						draw_header_cell(field, hit_state == 'col_move')
					}

				ui.end_stack()

			ui.end_scrollbox()

			let cells_h = e.rows.length * cell_h

			let overflow = auto_expand ? 'contain' : 'auto'
			sb_i = ui.scrollbox(id+'.cells_scrollbox', 1, overflow, overflow, 's', 's')
				ui.frame(noop, on_cellview_frame, 0, 'l', 't', cells_w, cells_h)
			ui.end_scrollbox()

		ui.end_v()

	}

	// mouse interaction ------------------------------------------------------

	e.scroll_to_cell = function(ri, fi) {
		let [x, y, w, h] = cell_rect(ri, fi)
		ui.scroll_to_view(id+'.cells_scrollbox', x, y, w, h)
	}

	e.update = function(opt) {
		if (opt.scroll_to_focused_cell)
			e.scroll_to_focused_cell()
	}

	let process_mouse
	{
	let col_resize_field_w0
	let col_move_dx
	let col_mover

	process_mouse = function() {

		if (ui.capture(id+'.sort')) {
			pr('here')
			//e.set_order_by_dir(field, 'toggle', shift)
		}

		let [state, dx, dy] = ui.drag(id+'.header_cells')

		if (state == 'hover' || state == 'drag') {
			hit_state = null
			hit_fi = null
			let hs = ui.hit(id+'.header_cells')
			let x0 = ui.state(id+'.header_cells').get('x')
			for (let field of e.fields) {
				let x = field._x + x0
				let w = field._w
				if (ui.mx >= x + w - 5 && ui.mx <= x + w + 5) {
					hit_state = 'col_resize'
					hit_fi = field.index
					ui.set_cursor('ew-resize')
					break
				}
				if (ui.mx >= x && ui.mx <= x + w) {
					hit_state = 'col_move'
					hit_fi = field.index
					col_move_dx = ui.mx - x0 - field._x
					break
				}
			}
		}

		if (state == 'dragging' && abs(dx) > 10 && hit_state == 'col_resize') {
			let field = e.fields[hit_fi]
			col_resize_field_w0 = field.w
			ui.set_cursor('ew-resize')
			hit_state = 'col_resizing'
		}

		if (state == 'dragging' && hit_state == 'col_resizing') {
			let field = e.fields[hit_fi]
			field.w = clamp(col_resize_field_w0 + dx, field.min_w, field.max_w)
			ui.set_cursor('ew-resize')
		}

		if (state == 'dragging' && dy < -10 && hit_state == 'col_move') {

			let field = e.fields[hit_fi]
			pr('here')
			hit_state = 'col_group'

		}

		if (hit_state == 'col_group') {
			ui.set_cursor('pointer')
		}

		if (state == 'dragging' && abs(dx) > 10 && hit_state == 'col_move') {

			let field = e.fields[hit_fi]

			let cs = ui.captured(id+'.header_cells')

			col_mover = ui.live_move_mixin()

			col_mover.movable_element_size = function(fi) {
				let [x, y, w, h] = cell_rect(0, fi)
				return horiz ? e.fields[fi]._w : h
			}

			col_mover.set_movable_element_pos = function(fi, x, moving) {
				e.fields[fi]._x = x
			}

			col_mover.move_element_start(hit_fi, 1, 0, e.fields.length)

			hit_state = 'col_moving'
		}


		if (hit_state == 'col_moving') {

			let x0 = ui.state(id+'.header_cells').get('x')
			let mx = ui.mx - x0 - col_move_dx

			col_mover.move_element_update(horiz ? mx : my)
			e.scroll_to_cell(hit_ri, hit_fi)

			ui.set_cursor('grabbing')

			if (state == 'drop') {
				let over_fi = col_mover.move_element_stop() // sets x of moved element.
				e.move_field(hit_fi, over_fi)
			}

		}

		if (state == 'drop') {
			col_mover = null
			hit_state = null
		}

		;[state, dx, dy] = ui.drag(id+'.cells')

		if (state == 'hover' || state == 'drag') {
			hit_state = null
			hit_ri = null
			hit_fi = null
			let s = ui.state(id+'.cells')
			let x0 = s.get('x')
			let y0 = s.get('y')
			hit_ri = floor((ui.my - y0) / cell_h)
			let row = e.rows[hit_ri]
			for (let fi = 0; fi < e.fields.length; fi++) {
				let [x1, y1, w, h] = cell_rect(hit_ri, fi)
				let hit_dx = ui.mx - x1 - x0
				let hit_dy = ui.my - y1 - y0
				if (hit_dx >= 0 && hit_dx <= w) {
					let field = e.fields[fi]
					hit_state = 'cell'
					hit_fi = fi
					hit_indent = false
					if (row && field_has_indent(field)) {
						let has_children = (row.child_rows?.length ?? 0) > 0
						if (has_children) {
							let indent_x = indent_offset(row_indent(row))
							hit_indent = hit_dx <= indent_x
						}
					}
					break
				}
			}
		}

		// if (!hit_state) {
		// 	if (ev.target == e.cells_view) // clicked on empty space.
		// 		e.exit_edit()
		// 	return
		// }

		if (state == 'drag' && hit_state == 'cell') {

			ui.focus(id)

			let row = e.rows[hit_ri]
			let field = e.fields[hit_fi]

			if (hit_indent)
				e.toggle_collapsed(row, shift)

			let already_on_it =
				hit_ri == e.focused_row_index &&
				hit_fi == e.focused_field_index

			let click =
				!e.enter_edit_on_click
				&& !e.stay_in_edit_mode
				&& !e.editor
				&& e.cell_clickable(row, field)

			if (e.focus_cell(hit_ri, hit_fi, 0, 0, {
				must_not_move_col: true,
				must_not_move_row: true,
				enter_edit: !hit_indent
					&& !ctrl && !shift
					&& ((e.enter_edit_on_click || click)
						|| (e.enter_edit_on_click_focused && already_on_it)),
				focus_editor: true,
				focus_non_editable_if_not_found: true,
				editor_state: click ? 'click' : 'select_all',
				expand_selection: shift,
				invert_selection: ctrl,
				input: e,
			})) {
				hit_state = 'row_dragging'
			}

		}

	}
	} // process_mouse scope

	// keyboard interaction ---------------------------------------------------

	function keydown() {

		shift = ui.key('shift')
		ctrl  = ui.key('control')

		let left_arrow  =  horiz ? 'arrowleft'  : 'arrowup'
		let right_arrow =  horiz ? 'arrowright' : 'arrowdown'
		let up_arrow    = !horiz ? 'arrowleft'  : 'arrowup'
		let down_arrow  = !horiz ? 'arrowright' : 'arrowdown'

		// same-row field navigation.
		if (ui.keydown(left_arrow) || ui.keydown(right_arrow)) {

			let cols = ui.keydown(left_arrow) ? -1 : 1

			let move = !e.editor
				|| (e.auto_jump_cells && !shift && (!horiz || ctrl)
					&& (!horiz
						|| !e.editor.editor_state
						|| ctrl
							&& (e.editor.editor_state(cols < 0 ? 'left' : 'right')
							|| e.editor.editor_state('all_selected'))
						))

			if (move)
				if (e.focus_next_cell(cols, {
					editor_state: horiz
						? (((e.editor && e.editor.editor_state) ? e.editor.editor_state('all_selected') : ctrl)
							? 'select_all'
							: cols > 0 ? 'left' : 'right')
						: 'select_all',
					expand_selection: shift,
					input: e,
				}))
					return false

		}

		// Tab/Shift+Tab cell navigation.
		if (ui.keydown('tab') && e.tab_navigation) {

			let cols = shift ? -1 : 1

			if (e.focus_next_cell(cols, {
				auto_advance_row: true,
				editor_state: cols > 0 ? 'left' : 'right',
				input: e,
			}))
				return false

		}

		// insert with the arrow down key on the last focusable row.
		if (ui.keydown(down_arrow) && !shift) {
			if (!e.save_on_add_row) { // not really compatible behavior...
				if (e.is_last_row_focused() && e.can_actually_add_rows()) {
					if (e.insert_rows(1, {
						input: e,
						focus_it: true,
					})) {
						return false
					}
				}
			}
		}

		// remove last row with the arrow up key if not edited.
		if (ui.keydown(up_arrow)) {
			if (e.is_last_row_focused() && e.focused_row) {
				let row = e.focused_row
				if (row.is_new && !e.is_row_user_modified(row)) {
					let editing = !!e.editor
					if (e.remove_row(row, {input: e, refocus: true})) {
						if (editing)
							e.enter_edit('select_all')
						return false
					}
				}
			}
		}

		// row navigation.
		let rows
		if      (ui.keydown(up_arrow  )) rows = -1
		else if (ui.keydown(down_arrow)) rows =  1
		else if (ui.keydown('pageup'  )) rows = -(ctrl ? 1/0 : page_row_count)
		else if (ui.keydown('pagedown')) rows =  (ctrl ? 1/0 : page_row_count)
		else if (ui.keydown('home'    )) rows = -1/0
		else if (ui.keydown('end'     )) rows =  1/0
		if (rows) {

			let move = !e.editor
				|| (e.auto_jump_cells && !shift
					&& (horiz
						|| !e.editor.editor_state
						|| (ctrl
							&& (e.editor.editor_state(rows < 0 ? 'left' : 'right')
							|| e.editor.editor_state('all_selected')))
						))

			if (move)
				if (e.focus_cell(true, true, rows, 0, {
					editor_state: e.editor && e.editor.editor_state
						&& (horiz ? e.editor.editor_state() : 'select_all'),
					expand_selection: shift,
					input: e,
				}))
					return false

		}

		// F2: enter edit mode
		if (!e.editor && ui.keydown('f2')) {
			e.enter_edit('select_all')
			return false
		}

		// Enter: toggle edit mode, and navigate on exit
		if (ui.keydown('enter')) {
			if (e.quicksearch_text) {
				e.quicksearch(e.quicksearch_text, e.focused_row, shift ? -1 : 1)
				return false
			} else if (e.hasclass('picker')) {
				e.pick_val()
				return false
			} else if (!e.editor) {
				e.enter_edit('click')
				return false
			} else {
				if (e.advance_on_enter == 'next_row')
					e.focus_cell(true, true, 1, 0, {
						input: e,
						enter_edit: e.stay_in_edit_mode,
						editor_state: 'select_all',
						must_move: true,
					})
				else if (e.advance_on_enter == 'next_cell')
					e.focus_next_cell(shift ? -1 : 1, {
						input: e,
						enter_edit: e.stay_in_edit_mode,
						editor_state: 'select_all',
						must_move: true,
					})
				else if (e.exit_edit_on_enter)
					e.exit_edit()
				return false
			}
		}

		// Esc: exit edit mode.
		if (ui.keydown('escape')) {
			if (e.quicksearch_text) {
				e.quicksearch('')
				return false
			}
			if (e.editor) {
				if (e.exit_edit_on_escape) {
					e.exit_edit()
					e.focus()
					return false
				}
			} else if (e.focused_row && e.focused_field) {
				let row = e.focused_row
				if (row.is_new && !e.is_row_user_modified(row, true))
					e.remove_row(row, {input: e, refocus: true})
				else
					e.revert_cell(row, e.focused_field)
				return false
			}
		}

		// insert key: insert row
		if (ui.keydown('insert')) {
			let insert_arg = 1 // add one row

			if (ctrl && e.focused_row) { // add a row filled with focused row's values
				let row = e.serialize_row_vals(e.focused_row)
				e.pk_fields.map((f) => delete row[f.name])
				insert_arg = [row]
			}

			if (e.insert_rows(insert_arg, {
				input: e,
				at_focused_row: true,
				focus_it: true,
			})) {
				return false
			}
		}

		if (ui.keydown('delete')) {

			if (e.editor && e.editor.input_val == null)
				e.exit_edit({cancel: true})

			// delete: toggle-delete selected rows
			if (!ctrl && !e.editor && e.remove_selected_rows({
						input: e, refocus: true, toggle: true, confirm: true
					}))
				return false

			// ctrl_delete: set selected cells to null.
			if (ctrl) {
				e.set_null_selected_cells({input: e})
				return false
			}

		}

		if (!e.editor && ui.keydown(' ') && !e.quicksearch_text) {
			if (e.focused_row && (!e.can_focus_cells || e.focused_field == e.tree_field))
				e.toggle_collapsed(e.focused_row, shift)
			else if (e.focused_row && e.focused_field && e.cell_clickable(e.focused_row, e.focused_field))
				e.enter_edit('click')
			return false
		}

		if (!e.editor && ctrl && ui.keydown('a')) {
			e.select_all_cells()
			return false
		}

		if (!e.editor && ui.keydown('backspace')) {
			if (e.quicksearch_text)
				e.quicksearch(e.quicksearch_text.slice(0, -1), e.focused_row)
			return false
		}

		if (ctrl && ui.keydown('s')) {
			e.save()
			return false
		}

		if (ctrl && !e.editor)
			if (ui.keydown('c')) {
				let row = e.focused_row
				let fld = e.focused_field
				if (row && fld)
					copy_to_clipboard(e.cell_text_val(row, fld))
				return false
			} else if (ui.keydown('x')) {

				return false
			} else if (ui.keydown('v')) {

				return false
			}

	}

	// printable characters: enter quick edit mode.
	function keypress(c) {
		if (e.quick_edit) {
			if (!e.editor && e.focused_row && e.focused_field) {
				e.enter_edit('select_all')
				let v = e.focused_field.from_text(c)
				e.set_cell_val(e.focused_row, e.focused_field, v)
				return false
			}
		} else if (!e.editor) {
			e.quicksearch(e.quicksearch_text + c, e.focused_row)
			return false
		}
	}

}

// grid ----------------------------------------------------------------------

ui.spx_input = function() {
	return ui.sp2()
}

ui.spy_input = function() {
	return ui.sp1()
}

ui.grid = function(id, opt, fr, align, valign, min_w, min_h) {

	ui.keepalive(id)
	let s = ui.state(id)
	let nav = s.get('nav')
	if (!nav) {
		nav = ui.nav(opt)
		ui.on_free(id, () => nav.free())
		init_nav(id, nav)
		s.set('nav', nav)
	}
	nav.render(fr, align, valign, min_w, min_h)

}

}()) // module function
