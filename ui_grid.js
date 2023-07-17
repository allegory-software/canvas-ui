
(function () {
"use strict"
const G = window
const ui = G.ui

const {
	pr,
} = glue

const {
	align_x = align_x,
	align_w = align_w,
	inner_x = inner_x,
	inner_w = inner_w,
	add_ct_min_wh = add_ct_min_wh,
	FR,
	cx,
} = ui

let header = {}

header.create = function(cmd) {
	return ui.cmd(cmd, ui.ct_i())
}

header.reindex = function(a, i, offset) {
	a[i] += offset
}

header.draw = function(a, i) {
	i = a[i] // parent stack

}

ui.widget('grid_header', header)

let view = {}

view.create = function(cmd) {
	return ui.cmd(cmd, ui.ct_i())
}

view.reindex = function(a, i, offset) {
	a[i] += offset
}

view.measure = function(a, i, axis) {
	i = a[i] // parent scrollbox
}

view.draw = function(a, i) {

	i = a[i] // parent scrollbox

	let x = a[i+0]
	let y = a[i+1]
	let w = a[i+2]
	let h = a[i+3]

	cx.fillStyle = 'gray'
	cx.beginPath()
	cx.rect(x, y, w, h)
	cx.fill()

}

ui.widget('grid_view', view)

ui.grid = function(id, rowset, fr, align, valign, min_w, min_h) {

	let s = ui.state_map(id)
	let nav = s.get('nav')
	if (!nav) {
		nav = ui.nav()
		s.set('nav', nav)
		ui.on_free(id, () => nav.free())
	}

	let header_h = 3 * ui.sp4()
	let horiz = true

	if (horiz) {
		ui.v(fr, 0, align, valign, min_w, min_h)
			ui.stack('', 0, 'l', 't', null, header_h)
				ui.grid_header(id+'.header', rowset)
			ui.end_stack()
			ui.scrollbox(id+'.scrollbox')
				ui.grid_view(id+'.view', rowset)
			ui.end_scrollbox()
		ui.end_v()
	} else {

	}
}

}()) // module function
