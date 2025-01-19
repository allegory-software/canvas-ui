
	// tabname ----------------------------------------------------------------

	/*
	e.prop('tabname_template', {slot: 'lang', default: '{0}'})

	let tabname
	e.prop('tabname', {slot: 'lang'})

	e.set_tabname(
	function() {
		if (tabname)
			return tabname
		// TODO: use param nav's selected_rows_tabname()
		let view = rowset_name || 'Nav'
		return subst(e.tabname_template, view)
	}, function(s) {
		tabname = s
		e.announce('tabname_changed')
	})

	e.row_tabname = function(row) {
		return e.draw_row(row, div())
	}

	e.selected_rows_tabname = function() {
		if (!e.selected_rows)
			return S('no_rows_selected', 'No rows selected')
		let caps = []
		for (let [row, sel_fields] of e.selected_rows)
			caps.push(e.row_tabname(row))
		return caps.join(', ')
	}
	*/



/* view-less nav -------------------------------------------------------------

*/

ui.bare_nav = function(e) {
	e.class('bare-nav')
	e.make_nav_widget()
}

/* ---------------------------------------------------------------------------

Widget that has a nav as its data model. The nav can be either external,
internal, or missing (in which case the widget is disabled).

config props:
	nav_id     nav
	nav
	rowset
	rowset_name
fires:
	^bind_nav(nav, on)

*/

// TODO: make interpreting the inner html a separate init step!

G.make_nav_data_widget_extend_before = function(e) {

	let nav
	let rowset = e.$1(':scope>rowset')
	if (rowset) {
		nav = bare_nav({}, rowset)
	} else {
		nav = e.$1(':scope>nav')
		if (nav) {
			nav.init_component()
			nav.del()
		}
	}
	if (nav) {
		e.on_bind(function(on) {
			if (on)
				head.add(nav)
			else
				nav.del()
			e._html_nav = on ? nav : null
		})
	}

}

ui.make_nav_data_widget = function() {

	let e = this

	let nav

	function bind_nav(on) {
		if (!nav)
			return
		if (nav._internal) {
			if (on) {
				head.add(nav)
				e.fire('bind_nav', nav, true)
			} else {
				e.fire('bind_nav', nav, false)
				nav.del()
			}
		}
	}

	// NOTE: internal nav takes priority to external nav. This decision is
	// arbitrary, but also more stable (external nav can go anytime).
	function get_nav() {
		if (e.rowset_name || e.rowset) { // internal
			if (nav && nav._internal
				&& ((e.rowset_name && nav.rowset_name == e.rowset_name) ||
					(e.rowset && nav.rowset == e.rowset))) // same internal
				return nav
			return bare_nav({
				rowset_name : e.rowset_name,
				rowset      : e.rowset,
				_internal   : true,
			})
		}
		return e.nav || e._html_nav // external
	}

	function update_nav() {
		let nav1 = get_nav()
		if (nav != nav1) {
			bind_nav(false)
			nav = nav1
			bind_nav(true)
		}
		e.ready = !!(!e.nav_based || nav)
	}

	e.on_bind(update_nav)

	// external nav: referenced directly or by id.
	e.nav = null
	e.nav_id = null

	// internal nav: local rowset binding
	e.rowset = null

	// internal nav: remote rowset binding
	e.rowset_name = null
	e.set_rowset_name = update_nav

	e.property('nav_based', () => !!(e.nav_id || e.nav || e.rowset_name || e.rowset))

	e.ready = false

}

/* ---------------------------------------------------------------------------

Widget that has a nav and a col from the nav as its data model, but doesn't
depend on the focused row (see next mixin for that).

config props:
	nav
	nav_id     nav
	col
state props:
	nav_based
	ready
fires:
	^bind_field(field, on)

*/

ui.make_nav_col_widget = function() {

	let e = this

	let nav, field

	function bind_field(on) {
		if (on) {
			assert(!field)
			field = nav && nav.optfld(e.col) || null
			if (!field)
				return
			e.fire('bind_field', field, true)
		} else {
			if (!field)
				return
			e.fire('bind_field', field, false)
			field = null
		}
	}

	function update_nav(force) {
		let nav1 = e.nav
		if (nav1 != nav || force) {
			bind_field(false)
			nav = nav1
			bind_field(true)
		}
		e.ready = !!(!e.nav_based || field)
	}

	function update_field() {
		update_nav(true)
	}

	e.prop('col')
	e.set_col = update_field

	e.prop('nav')
	e.prop('nav_id')
	e.set_nav = update_nav

	e.listen('reset', function(reset_nav) {
		if (reset_nav != nav) return
		update_field()
	})

	e.property('nav_based', () => !!((e.nav_id || e.nav) && e.col))

	e.prop('ready')

}

/* ---------------------------------------------------------------------------

Widget that has a nav cell or a range of two nav cells as its data model.

config props:
	nav
	nav_id     nav
	col[1,2]
state props:
	nav_based
	ready
	row
fires:
	^bind_field(field, on)

*/

function field_ready(field) {
	if (!field)
		return false
	if (field.lookup_nav_id || field.lookup_nav)
		if (!field.lookup_fields)
			return false
	return true
}

ui.make_nav_input_widget = function(field_props, range, field_range_props) {

	let e = this

	// nav binding ------------------------------------------------------------

	let nav, field, field1, field2

	field_props       = field_props       && wordset(field_props      )
	field_range_props = field_range_props && wordset(field_range_props)

	function bind_field(field, col, input_widget, INPUT_VALUE, on) {
		if (on) {
			assert(!field)
			field = nav && nav.optfld(col) || null
			if (!field)
				return
			e.xoff()
			if (field_props)
				for (let k in field_props)
					if (field[k] !== undefined)
						input_widget.set_prop(k, field[k])
			if (field_range_props)
				for (let k in field_range_props)
					if (field[k] !== undefined)
						e.set_prop(k, field[k])
			e.xon()
			e.fire('bind_field', field, true)
			e[INPUT_VALUE] = e.get_input_val_for(field)
		} else {
			if (!field)
				return
			e.fire('bind_field', field, false)
			field = null
		}
		return field
	}

	function bind_fields(on) {
		if (range) {
			field1 = bind_field(field1, e.col1, e.input_widgets[0], 'input_value1', on)
			field2 = bind_field(field2, e.col2, e.input_widgets[1], 'input_value2', on)
		} else {
			field = bind_field(field, e.col, e, 'input_value', on)
		}
	}

	function update_ready() {
		e.ready = !!(!e.nav_based || (nav && (range
			? field_ready(field1) && field_ready(field2)
			: field_ready(field))))
		e.disable('not_ready', !e.ready)
	}

	function update_nav(force) {
		let nav1 = e.nav
		if (nav1 != nav || force) {
			bind_fields(false)
			nav = nav1
			bind_fields(true)
			update_ready()
		}
	}

	function update_fields() {
		update_nav(true)
	}

	if (range) {
		e.prop('col1')
		e.prop('col2')
		e.set_col1 = update_fields
		e.set_col2 = update_fields
	} else {
		e.prop('col')
		e.set_col = update_fields
	}

	e.prop('nav')
	e.prop('nav_id')
	e.set_nav = update_nav

	e.property('nav_based', () => !!((e.nav_id || e.nav) && (range ? e.col1 && e.col2 : e.col)))

	e.prop('ready')

	e.listen('reset', function(reset_nav) {
		if (reset_nav != nav) return
		update_fields()
	})

	e.listen('col_vals_changed', function(changed_nav, changed_field) {
		if (!range && changed_field != field)
			return
		if (range && changed_field != field1 && changed_field != field2)
			return
		update_fields()
	})

	e.listen('field_changed', function(changed_field, k, v) {
		if (!range && changed_field != field)
			return
		if (range && changed_field != field1 && changed_field != field2)
			return
		if (field_props && field_props[k])
			for (let input_widget of e.input_widgets) {
				e.xoff()
				input_widget.set_prop(k, v)
				e.xon()
			}
		if (field_range_props && field_range_props[k]) {
			e.xoff()
			e.set_prop(k, v)
			e.xon()
		}
	})

	e.listen('label_find_target', function(label, f) {
		if (f == field || f == field1 || f == field2) {
			return e
		}
	})

	// state ------------------------------------------------------------------

	e.property('row', () => nav && nav.focused_row)

	e.get_input_val_for = function(field) {
		let row = e.row
		return row && field ? nav.cell_input_val(row, field) : null
	}

	function set_input_values(ev) {
		if (range) {
			e.set_prop('input_value1', e.get_input_val_for(field1), ev)
			e.set_prop('input_value2', e.get_input_val_for(field2), ev)
		} else {
			e.set_prop('input_value', e.get_input_val_for(field), ev)
		}
	}

	function set_cell_val_for(field, v, ev) {
		if (v === undefined)
			v = null
		let was_set
		if (field) {
			if (!e.row)
				if (nav && !nav.all_rows.length)
					if (nav.can_actually_change_val())
						nav.insert_rows(1, {focus_it: true})
			if (e.row) {
				nav.set_cell_val(e.row, field, v, ev)
				was_set = true
			}
		}
	}

	if (range) {
		e.set_cell_val1 = function(v, ev) { set_cell_val_for(field1, v, ev) }
		e.set_cell_val2 = function(v, ev) { set_cell_val_for(field2, v, ev) }
	} else {
		e.set_cell_val  = function(v, ev) { set_cell_val_for(field , v, ev) }
	}

	e.listen('focused_row_cell_state_changed', function(te, row, f, changes, ev) {
		if (te != nav) return
		if (f != field && f != field1 && f != field2) return
		if (changes.input_val && !(ev && ev.target == e))
			set_input_values(ev)
	})

	e.listen('focused_row_changed', function(te, row, row0, ev) {
		if (te != nav) return
		set_input_values(ev)
	})

	// e.listen('col_vals_changed', update)
	// e.listen('col_info_changed', update)

}

