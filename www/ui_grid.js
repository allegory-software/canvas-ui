
(function () {
"use strict"
const G = window
const ui = G.ui

const {
	pr,
	isobject,
	round, min, max, floor,
} = glue

const {
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

function init(id, e) {

	e.id = id // for errors

	e.cell_border_v_width = 0
	e.cell_border_h_width = 1

	e.auto_expand         = false  // expand cells instead of scrollboxing them
	e.group_bar_visible   = 'auto' // auto | always | no

	let horiz = true

	// context-sensitive thus set on each frame
	let font_size
	let line_height
	let cells_w
	let cell_h
	let header_h
	let gcol_w
	let gcol_h
	let gcol_gap
	// cells-view-height-sensitive thus set on frame callback
	let page_row_count = 1

	// mouse state
	let drag_state, dx, dy, cs
	let gcol_mover
	let hit_zone // sort_icon, col_divider, col, gcol, cell
	let drag_op  // col_move, col_group, row_move
	let hit_ri // row index
	let hit_fi // field index
	let hit_indent
	let row_move_state

	function reset_mouse_state() {
		drag_state = null
		dx = null
		dy = null
		cs = null
		gcol_mover = null
		hit_zone = null
		drag_op = null
		hit_ri = null
		hit_fi = null
		hit_indent = null
		row_move_state = null
	}

	// keyboard state
	let focused, shift, ctrl
	let keydown = key => focused && ui.keydown(key)

	// utils

	function field_has_indent(field) {
		return horiz && field == e.tree_field
	}

	function indent_offset(indent) {
		return floor(font_size * 1.5 + (font_size * 1.2) * indent)
	}

	function row_indent(row) {
		return row.depth ?? 0
	}

	function draw_cell_at(a, row, field, ri, fi, x, y, w, h, draw_stage) {

		let input_val = e.cell_input_val(row, field)

		// static geometry
		let bx = e.cell_border_v_width
		let by = e.cell_border_h_width

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
		let hovering = hit_zone == 'cell' && hit_ri == ri && hit_fi == fi
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
				if (draw_stage == 'row_move')
					indent_x += s.hit_indent_x - s.indent_x
			}
		}

		// background & text color
		// drawing a background is slow, so we avoid it when we can.
		let bg, bgs

		if (draw_stage == 'col_move' || draw_stage == 'row_move')
			bg = 'bg2'
		else if (draw_stage == 'col_group')
			bg = 'bg0'
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
				bg = null
			else if ((ri & 1) == 0)
				bg = 'alt'
			else if (full_width)
				bg = 'bg'
		}

		let fg
		if (draw_stage == 'col_group')
			fg = 'faint'
		else if (is_null || is_empty || disabled)
			fg = 'label'
		else
			fg = 'text'

		// drawing
		let sp2 = ui.sp2()

		ui.m(x, y, 0, 0)
		ui.stack('', 0, 'l', 't', w, h)
			ui.bb('', bg, bgs, draw_stage == 'col_move' ? 'lrb' : 'b', 'light')
			ui.color(fg)
			if (has_children) {
				ui.p(indent_x - sp2, 0, sp2, 0)
				ui.scope()
				ui.font('fas')
				ui.text('', collapsed ? '\uf0fe' : '\uf146')
				// ui.treegrid_indent(indent_x)
				ui.end_scope()
			}
			ui.p(sp2 + indent_x, 0, sp2, 0)
			e.draw_val(row, field, input_val, true, full_width)
			ui.p(0)
		ui.end_stack()

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

	function draw_cells_range(a, x0, y0, rows, ri1, ri2, fi1, fi2, draw_stage) {

		let hit_cell, foc_cell, foc_ri, foc_fi

		if (!draw_stage) {

			foc_ri = e.focused_row_index
			foc_fi = e.focused_field_index

			hit_cell = hit_zone == 'cell'
				&& hit_ri >= ri1 && hit_ri <= ri2
				&& hit_fi >= fi1 && hit_fi <= fi2

			foc_cell = foc_ri != null && foc_fi != null

			// when foc_cell and hit_cell are the same, don't draw them twice.
			if (foc_cell && hit_cell && hit_ri == foc_ri && hit_fi == foc_fi)
				foc_cell = null

		}
		let skip_moving_col = drag_op == 'col_move' && draw_stage == 'col'

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

	}

	let h_sb_i // cmd record index of header scrollbox

	function on_cellview_frame(a, _i, x, y, w, h, vx, vy, vw, vh) {

		page_row_count = floor(vh / cell_h)

		let sx = vx - x
		let sy = vy - y

		// scroll the header scrollbox to match the scroll offset of the cell view.
		// TODO: make this work!
		// ui.force_scroll(a, h_sb_i, sx, 0)

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

		if (drag_op == 'row_move') {
			// draw fixed rows first and moving rows above them.
			let s = row_move_state
			draw_cells_range(a, x, y, e.rows, s.vri1, s.vri2, fi1, fi2, 'row')
			draw_cells_range(s.rows, s.move_vri1, s.move_vri2, fi1, fi2, 'row_move')
		} else if (drag_op == 'col_move' || drag_op == 'col_group') {
			// draw fixed cols first and moving cols above them.
			draw_cells_range(a, x, y, e.rows, ri1, ri2, fi1, fi2, 'col')
			draw_cells_range(a, x, y, e.rows, ri1, ri2, hit_fi, hit_fi + 1, drag_op)
		} else {
			draw_cells_range(a, x, y, e.rows, ri1, ri2, fi1, fi2)
		}

		ui.end_stack()

	}

	e.scroll_to_cell = function(ri, fi) {
		let [x, y, w, h] = cell_rect(ri, fi)
		ui.scroll_to_view(id+'.cells_scrollbox', x, y, w, h)
	}

	// render grid ------------------------------------------------------------

	function group_bar_h() {
		let sp2 = ui.sp2()
		let levels = e.groups.col_groups.length-1
		return 2 * sp2 + gcol_h + levels * sp2 + 2
	}

	e.render = function(fr, align, valign, min_w, min_h) {

		// set layout vars

		let sp  = ui.sp1()
		let sp2 = ui.sp2()
		font_size = ui.get_font_size()
		line_height = font_size * 1.5
		cell_h = round(line_height + 2 * sp + e.cell_border_h_width)
		header_h = cell_h
		gcol_w = 80 // group-bar column width
		gcol_h = line_height + sp
		gcol_gap = 1

		// set keyboard state

		focused = ui.focused(id)
		shift = focused && ui.key('shift')
		ctrl  = focused && ui.key('control')

		// check mouse state ---------------------------------------------------

		reset_mouse_state()

		// hover or click on sort icons from colum header
		for (let field of e.fields) {
			let icon_id = id+'.sort_icon.'+field.name
			;[drag_state] = ui.drag(icon_id)
			if (drag_state) {
				hit_zone = 'sort_icon'
				ui.set_cursor('pointer')
				if (drag_state == 'drag')
					e.set_order_by_dir(field, 'toggle', shift)
				break
			}
		}

		// hover or drag on on column header
		if (!hit_zone) {
			;[drag_state, dx, dy, cs] = ui.drag(id+'.header')
			if (drag_state == 'hover' || drag_state == 'drag') {
				let x0 = ui.state(id+'.header').get('x')
				for (let field of e.fields) {
					let x = field._x + x0
					let w = field._w
					if (ui.mx >= x + w - 5 && ui.mx <= x + w + 5) {
						hit_zone = 'col_divider'
						hit_fi = field.index
						break
					} else if (ui.mx >= x && ui.mx <= x + w) {
						hit_zone = 'col'
						hit_fi = field.index
						if (drag_state == 'drag')
							cs.set('dx', ui.mx - x0 - field._x)
						break
					}
				}
				cs.set('zone', hit_zone)
				cs.set('field_index', hit_fi)
			} else if (drag_state) {
				hit_zone = cs.get('zone')
				hit_fi   = cs.get('field_index')
				drag_op  = cs.get('op')
			}
		}

		// column resize
		if (hit_zone == 'col_divider') {
			let field = e.fields[hit_fi]
			if (drag_state == 'drag') {
				cs.set('w0', field.w)
				drag_state == 'dragging'
			}
			if (drag_state == 'dragging') {
				field.w = clamp(cs.get('w0') + dx, field.min_w, field.max_w)
			}
			ui.set_cursor('ew-resize')
		}

		// column drag horizontally => start column move
		if (hit_zone == 'col' && !drag_op && drag_state == 'dragging'
			&& abs(dx) > 10
			&& e.fields[hit_fi].movable
		) {

			let mover = ui.live_move_mixin()

			mover.movable_element_size = function(fi) {
				let [x, y, w, h] = cell_rect(0, fi)
				return horiz ? e.fields[fi]._w : h
			}

			mover.set_movable_element_pos = function(fi, x, moving) {
				e.fields[fi]._x = x
			}

			mover.move_element_start(hit_fi, 1,
				e.fields[0].is_group_field ? 1 : 0, e.fields.length)

			drag_op = 'col_move'
			cs.set('op', drag_op)
			cs.set('mover', mover)
		}

		// column move
		if (drag_op == 'col_move') {

			let mover = cs.get('mover')

			let x0 = ui.state(id+'.header').get('x')
			let mx = ui.mx - x0 - cs.get('dx')

			mover.move_element_update(horiz ? mx : my)
			e.scroll_to_cell(hit_ri ?? 0, hit_fi)

			ui.set_cursor('grabbing')

			if (drag_state == 'drop') {
				let over_fi = mover.move_element_stop() // sets x of moved element.
				e.move_field(hit_fi, over_fi)
				reset_mouse_state()
			}

		}

		// drag column vertically towards group-bar => column move to group
		let col_group_start
		if (hit_zone == 'col' && !drag_op && drag_state == 'dragging'
			&& (ui.hovers(id+'.group_bar') || -dy > 10)
			&& e.fields[hit_fi].groupable
		) {
			col_group_start = true
			drag_op = 'col_group'
			cs.set('op', drag_op)
		}

		// hover or drag group-bar column
		let hit_gcol
		if (!hit_zone) {
			for (let col of e.groups.cols || empty_array) {
				// hit sort icon
				let icon_id = id+'.sort_icon.'+col
				;[drag_state, dx, dy, cs] = ui.drag(icon_id)
				if (drag_state) {
					hit_zone = 'sort_icon'
					ui.set_cursor('pointer')
					if (drag_state == 'drag')
						e.set_order_by_dir(col, 'toggle', shift)
					break
				}
				// hit group column
				let col_id = id+'.gcol.'+col
				;[drag_state, dx, dy, cs] = ui.drag(col_id)
				pr(col_id, drag_state)
				if (drag_state) {
					hit_zone = 'gcol'
					hit_gcol = col
					break
				}
			}
		}

		if (drag_op == 'col_group')
			hit_gcol = e.fields[hit_fi].name

		// move group-bar column OR drag header column over the group-bar
		if (hit_zone == 'gcol' || drag_op == 'col_group') {

			let gcol_move_start = hit_zone == 'gcol' && drag_state == 'drag'
			let start = gcol_move_start || col_group_start
			let mover

			if (start) {

				gcol_mover = ui.live_move_mixin()
				mover = gcol_mover
				cs.set('mover', gcol_mover)

				mover.cols = [...(e.groups.cols || empty_array)]
				mover.range_defs = assign({}, e.groups.range_defs)

				if (gcol_move_start) {

					mover.col_def = mover.range_defs[hit_gcol]

					let x = mover.col_def.index * (gcol_w + 1)
					let y = mover.col_def.group_level * sp2
					mover.x0 = x
					mover.y0 = y

				} else if (col_group_start) {

					mover.cols.push(hit_gcol)
					mover.col_def = {
						index: mover.cols.length-1,
						group_level: e.groups.cols.length ? e.groups.col_groups.length : 0,
					}
					mover.range_defs[hit_gcol] = mover.col_def

					let field = e.fld(hit_gcol)
					let hs = ui.state(id+'.header')
					let hx = hs.get('x')
					let hy = hs.get('y')
					let group_bar_was_visible = !(e.group_bar_visible == 'auto' && !e.groups.cols.length)
					mover.x0 = field._x - sp2
					mover.y0 = group_bar_was_visible ? group_bar_h() : 0

				}

				mover.xs = [] // col_index -> col_x
				mover.is = [] // col_index -> col_visual_index
				mover.movable_element_size = function() {
					return gcol_w + gcol_gap
				}
				mover.set_movable_element_pos = function(i, x, moving, vi) {
					this.xs[i] = x
					if (vi != null)
						this.is[i] = vi
				}
				mover.move_element_start(mover.col_def.index, 1, 0, mover.cols.length)

				// compute the allowed level ranges that the dragged column is
				// allowed to move vertically in each horizontal position that
				// it finds itself in (since it can move in both directions).
				// these ranges remain fixed while the col is moving.
				mover.levels = []
				mover.min_levels = []
				mover.max_levels = []
				let last_level = 0
				let i = 0
				for (let col of mover.cols) {
					let def = mover.range_defs[col]
					let level = def.group_level
					mover.levels    [i] = level
					mover.min_levels[i] = level
					mover.max_levels[i] = level
					if (level != last_level) {
						mover.min_levels[i]--
						if (i > 0)
							mover.max_levels[i-1]++
					} else if (i > 0 && i == mover.cols.length-1) {
						mover.max_levels[i]++
					}
					last_level = level
					i++
				}

			} else {
				gcol_mover = cs.get('mover')
				mover = gcol_mover
			}

			if (drag_state != 'hover') {

				// drag column over the group-by header or over the grid's column header.
				mover.move_element_update(mover.x0 + dx)
				let vi = mover.is[mover.col_def.index]
				let level = mover.levels[vi]
				let min_level = mover.min_levels[vi]
				let max_level = mover.max_levels[vi]
				let mx = mover.x0 + dx
				let my = mover.y0 + dy
				level = clamp(round(my / sp2), min_level, max_level)
				let min_y = min_level * sp2 - ui.sp4()
				let max_y = max_level * sp2 + ui.sp4()
				let min_x = (-0.5) * (gcol_w + gcol_gap)
				let max_x = 1/0
				mover.drop_level = null
				mover.drop_pos = null
				if (
					my >= min_y && my <= max_y &&
					mx >= min_x && mx <= max_x &&
					ui.hovers(id+'.group_bar')
				) { // move
					mover.drop_level = level
				} else {
					mover.move_element_update(null)
					if (drag_op != 'col_group') { // put back in grid
						mover.move_element_update(null)
						if (ui.hovers(id+'.header')) {
							let hx = ui.state(id+'.header').get('x')
							for (let field of e.fields) {
								let x = field._x + hx
								let w = field._w
								let d = w / 2
								let is_last = field.index == e.fields.length-1
								if (ui.mx >= x && ui.mx <= x + d && !field.is_group_field) {
									mover.drop_pos = field.index
									break
								} else if (ui.mx >= x + w - d && (is_last || ui.mx <= x + w)) {
									mover.drop_pos = field.index+1
									break
								}
							}
						}
					}
				}

				if (drag_state == 'drop') {

					if (mover.drop_level != null) { // move it between other group columns

						// create a temp array with the dragged column moved to its new position.
						let over_i = mover.move_element_stop()
						let a = []
						for (let col of mover.cols) {
							let def = mover.range_defs[col]
							let vi = mover.is[def.index]
							let level = col == hit_gcol ? mover.drop_level : mover.levels[vi]
							a.push([col, level])
						}
						array_move(a, mover.col_def.index, 1, over_i, true)

						// format group-bar cols and set it.
						let t = []
						let last_level = a[0][1] // can be -1..1 from dragging
						let i = 0
						for (let [col, level] of a) {
							if (level != last_level)
								t.push(' > ')
							t.push(col)
							let def = mover.range_defs[col]
							if (def.offset != null) t.push('/', def.offset)
							if (def.unit   != null) t.push('/', def.unit)
							if (def.freq   != null) t.push('/', def.freq)
							t.push(' ')
							last_level = level
							i++
						}
						e.update({group_by: t.join('')})

					} else if (mover.drop_pos != null) { // put it back in grid

						e.ungroup_col(hit_gcol, mover.drop_pos)

					}

					reset_mouse_state()

				}

			}

		}

		if (drag_op == 'col_group') {
			ui.set_cursor('pointer')
		}

		// layout fields and compute cell grid size

		cells_w = 0
		for (let field of e.fields) {
			let w = clamp(field.w, field.min_w, field.max_w)
			let cw = w + 2 * sp2
			if (drag_op != 'col_move')
				field._x = cells_w
			field._w = cw
			cells_w += cw
		}

		// check hover/drag on cell view

		if (!hit_zone) {
			;[drag_state, dx, dy] = ui.drag(id+'.cells')
			if (drag_state == 'hover' || drag_state == 'drag') {
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
						hit_zone = 'cell'
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
		}

		// if (!hit_zone) {
		// 	if (ev.target == e.cells_view) // clicked on empty space.
		// 		e.exit_edit()
		// 	return
		// }

		if (drag_state == 'drag' && hit_zone == 'cell') {

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
				// TODO:
				//drag_op = 'row_move'
			}

		}

		// process keyboard input ----------------------------------------------

		if (ui.key_events.length)
			if ((function() {

		let left_arrow  =  horiz ? 'arrowleft'  : 'arrowup'
		let right_arrow =  horiz ? 'arrowright' : 'arrowdown'
		let up_arrow    = !horiz ? 'arrowleft'  : 'arrowup'
		let down_arrow  = !horiz ? 'arrowright' : 'arrowdown'

		// same-row field navigation.
		if (keydown(left_arrow) || keydown(right_arrow)) {

			let cols = keydown(left_arrow) ? -1 : 1

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
		if (keydown('tab') && e.tab_navigation) {

			let cols = shift ? -1 : 1

			if (e.focus_next_cell(cols, {
				auto_advance_row: true,
				editor_state: cols > 0 ? 'left' : 'right',
				input: e,
			}))
				return false

		}

		// insert with the arrow down key on the last focusable row.
		if (keydown(down_arrow) && !shift) {
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
		if (keydown(up_arrow)) {
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
		if      (keydown(up_arrow  )) rows = -1
		else if (keydown(down_arrow)) rows =  1
		else if (keydown('pageup'  )) rows = -(ctrl ? 1/0 : page_row_count)
		else if (keydown('pagedown')) rows =  (ctrl ? 1/0 : page_row_count)
		else if (keydown('home'    )) rows = -1/0
		else if (keydown('end'     )) rows =  1/0
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
		if (!e.editor && keydown('f2')) {
			e.enter_edit('select_all')
			return false
		}

		// Enter: toggle edit mode, and navigate on exit
		if (keydown('enter')) {
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
		if (keydown('escape')) {
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
		if (keydown('insert')) {
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

		if (keydown('delete')) {

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

		if (!e.editor && keydown(' ') && !e.quicksearch_text) {
			if (e.focused_row && (!e.can_focus_cells || e.focused_field == e.tree_field))
				e.toggle_collapsed(e.focused_row, shift)
			else if (e.focused_row && e.focused_field && e.cell_clickable(e.focused_row, e.focused_field))
				e.enter_edit('click')
			return false
		}

		if (!e.editor && ctrl && keydown('a')) {
			e.select_all_cells()
			return false
		}

		if (!e.editor && keydown('backspace')) {
			if (e.quicksearch_text)
				e.quicksearch(e.quicksearch_text.slice(0, -1), e.focused_row)
			return false
		}

		if (ctrl && keydown('s')) {
			e.save()
			return false
		}

		if (ctrl && !e.editor) {
			if (keydown('c')) {
				let row = e.focused_row
				let fld = e.focused_field
				if (row && fld)
					copy_to_clipboard(e.cell_text_val(row, fld))
				return false
			} else if (keydown('x')) {

				return false
			} else if (keydown('v')) {

				return false
			}
		}

		// TODO:
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

		})() === false) // if (ui.key_events.length) ...
			ui.capture_keys()

		// draw ----------------------------------------------------------------

		ui.v(fr, 0, align, valign, min_w, min_h)

			// group-by bar

			if (e.group_bar_visible == 'always'
				|| e.group_bar_visible == 'auto' && e.groups.cols.length
				|| drag_op == 'col_group'
			) {

				let group_bar_i = ui.sb(id+'.group_bar', 0, 'hide', 'hide', 's', 't', null, group_bar_h())
					ui.bb('', 'bg2', null, 'b', 'light')

					let mover = gcol_mover

					for (let col of (mover ?? e.groups).cols ?? empty_array) {

						let def = (mover ?? e.groups).range_defs[col]
						let x = def.index * (gcol_w + 1)
						let y = def.group_level * sp2
						let w = gcol_w
						let h = gcol_h

						if (mover) {
							let vi = mover.is[def.index]
							let level = col == hit_gcol ? mover.drop_level : mover.levels[vi]
							x = mover.xs[def.index]
							y = level * sp2
							if (col == hit_gcol) {
								if (mover.drop_level == null) {
									// dragging outside the columns area
									x = mover.x0 + dx
									y = mover.y0 + dy
								} else {
									let place_x = vi * (w + 1)
									ui.m(sp2 + place_x - 1, sp2 + y - 1, 0, 0)
									ui.stack('', 0, 'l', 't', w + 2, h + 2)
										ui.bb('', null, null, 1, 'marker', null, 0, 'dashes')
									ui.end_stack()
									x = mover.x0 + dx
									y = mover.y0 + dy
								}
							}
						}

						if (mover && col == hit_gcol) {
							ui.popup('', 'handle', group_bar_i, 'il', '[', 0, 0)
							ui.nohit()
						}

						let col_id = id+'.gcol.'+col
						let field = e.fld(col)
						ui.m(sp2 + x, sp2 + y, 0, 0)
						ui.stack(col_id, 1, 'l', 't', w, h)
							ui.bb('', 'bg1',
									hit_gcol == col && (
										drag_state == 'hover'    && 'hover' ||
										drag_state == 'dragging' && 'active' ||
										drag_state == 'drag'     && 'active') || null,
								1, 'intense')
							ui.p(sp2, ui.sp075())
							ui.h(1, sp)

								ui.text('', field.label, 1, 'l', 'c', 0)

								// sort icon
								let icon_id = id+'.sort_icon.'+field.name
								if (field.sortable) {
									ui.scope()
									ui.font('fas')
									ui.color(field.sort_dir ? 'label' : 'faint', ui.hit(icon_id) ? 'hover' : null)
									let pri = field.sort_priority
									ui.text(icon_id,
										field.sort_dir == 'asc' && (pri ? '\uf176' : '\uf176') ||
										field.sort_dir          && (pri ? '\uf175' : '\uf175') ||
										'\uf07d'
									, 0)
									ui.end_scope()
								}
							ui.end_h()
						ui.end_stack()

						if (mover && col == hit_gcol)
							ui.end_popup()

					}

				ui.end_sb()

			}

			// column header

			function draw_header_cell(field, noclip) {
				ui.m(field._x, 0, 0, 0)
				ui.p(sp2, 0)
				ui.h(0, sp, 'l', 't', field._w - 2 * sp2, header_h)

					let col_move  = drag_op == 'col_move'  && hit_fi == field.index
					let col_group = drag_op == 'col_group' && hit_gcol == field.name

					ui.bb('',
						col_move ? 'bg2' : col_group ? 'bg0' : 'bg1', null,
						col_move ? 'blr' : 'br', 'intense')

					if (col_group)
						ui.color('faint')

					let max_min_w = noclip ? null : max(0,
						field._w
							- 2 * sp2
							- (field.sortable ? 2 * sp2 : 0)
					)
					let pri = field.sort_priority

					if (field.align != 'right')
						ui.text('', field.label, 1, field.align, 'c', max_min_w)

					let icon_id = id+'.sort_icon.'+field.name

					if (field.sortable) {
						ui.scope()

						ui.font('fas')
						if (!col_group)
							ui.color(field.sort_dir ? 'label' : 'faint', ui.hit(icon_id) ? 'hover' : null)

						ui.text(icon_id,
							field.sort_dir == 'asc' && (pri ? '\uf176' : '\uf176') ||
							field.sort_dir          && (pri ? '\uf175' : '\uf175') ||
							'\uf07d'
						, 0)

						ui.end_scope()
					}

					if (field.align == 'right')
						ui.text('', field.label, 1, field.align, 'c', max_min_w)

				ui.end_h()
			}

			h_sb_i = ui.scrollbox('', 0, e.auto_expand ? 'contain' : 'hide', 'contain')

				ui.stack(id+'.header')
				ui.measure(id+'.header')

					let col_move = drag_op == 'col_move'

					ui.bb('', 'bg1', null, 'b', 'intense')
					for (let field of e.fields) {
						if (col_move && hit_fi === field.index)
							continue
						draw_header_cell(field)
					}
					if (col_move) {
						let field = e.fields[hit_fi]
						draw_header_cell(field)
					}

					// group column drop arrows

					if (gcol_mover?.drop_pos != null) {
						let x = e.fields[gcol_mover.drop_pos]?._x ?? cells_w
						ui.ml(x)
						ui.stack('', 0, 'l', 't', 0, header_h)
							ui.popup('', 'overlay', null, 't', 'c')
								ui.scope()
								ui.color('marker')
								ui.font('fas')
								ui.text('', '\uf063') // arrow-down
								ui.end_scope()
							ui.end_popup()
							ui.popup('', 'overlay', null, 'b', 'c')
								ui.scope()
								ui.color('marker')
								ui.font('fas')
								ui.text('', '\uf062') // arrow-up
								ui.end_scope()
							ui.end_popup()
						ui.end_stack()
					}

				ui.end_stack()

			ui.end_scrollbox()

			// cells frame

			let cells_h = e.rows.length * cell_h
			let overflow = e.auto_expand ? 'contain' : 'auto'
			ui.scrollbox(id+'.cells_scrollbox', 1, overflow, overflow, 's', 's')
				ui.frame(noop, on_cellview_frame, 0, 'l', 't', cells_w, cells_h)
			ui.end_scrollbox()

		ui.end_v()

	}

}

ui.grid = function(id, opt, fr, align, valign, min_w, min_h) {

	ui.keepalive(id)
	let s = ui.state(id)
	let nav = s.get('nav')
	if (!nav) {
		nav = ui.nav(opt, s)
		ui.on_free(id, () => nav.free())
		init(id, nav)
		s.set('nav', nav)
	}
	nav.render(fr, align, valign, min_w, min_h)

}

}()) // module function
