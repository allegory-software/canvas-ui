
(function () {
"use strict"
const G = window

let VIEW_ID  = ui.S-1
let VIEW_AST = ui.S+0

let view = {}

view.create = function(cmd, id, ast, fr, align, valign, min_w, min_h) {
	ui.keepalive(id)
	let ss = ui.state(id)
	return ui.cmd_box(cmd, fr, align, valign, min_w, min_h, id, ast)
}

function draw_node(cx, x, y, node) {
	let s = node.s
	let m = ui.measure_text(cx, s)
	let asc = m.fontBoundingBoxAscent
	let dsc = m.fontBoundingBoxDescent
	cx.save()
	cx.font = '22px Arial'
	cx.fillStyle = 'white'
	cx.fillText(s, x, y + asc)
	cx.restore()
}

view.draw = function(a, i) {
	let x = a[i+0]
	let y = a[i+1]
	let w = a[i+2]
	let h = a[i+3]
	let id  = a[i+VIEW_ID]
	let ast = a[i+VIEW_AST]

	let cx = ui.cx

	cx.fillStyle = 'black'
	cx.fillRect(x, y, w, h)

	draw_node(cx, x, y, ast.root)

}

view.hit = function(a, i) {
	let x = a[i+0]
	let y = a[i+1]
	let w = a[i+2]
	let h = a[i+3]
	let id = a[i+VIEW_ID]
}

ui.box_widget('ast_edit_view', view)

ui.ast_edit = function(...args) {
	ui.ast_edit_view(...args)
}

}()) // module function
