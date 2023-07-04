/*

	JavaScript IMGUI library with flexbox, popups, widgets and a RAD UI designer.
	Written by Cosmin Apreutesei. Public Domain.

*/

(function () {
"use strict"
let G = window

// utilities ------------------------------------------------------------------

// single-value filter.
G.repl = function(x, v, z) { return x === v ? z : x }

G.isobject = e => e != null && typeof e == 'object' // includes arrays, HTMLElements, etc.
G.isarray = Array.isArray
G.isobj = t => isobject(t) && (t.constructor == Object || t.constructor === undefined)
G.isstr = s => typeof s == 'string'
G.isnum = n => typeof n == 'number'
G.isbool = b => typeof b == 'boolean'
G.isfunc = f => typeof f == 'function'

G.assert = function(ret, err, ...args) {
	if (ret == null || ret === false) {
		throw ((err && err.subst(...args) || 'assertion failed'))
	}
	return ret
}

G.pr = console.log
G.trace = console.trace

G.floor = Math.floor
G.ceil  = Math.ceil
G.round = Math.round
G.max   = Math.max
G.min   = Math.min
G.abs   = Math.abs

G.PI  = Math.PI
G.rad = PI / 180
G.deg = 180 / PI

// NOTE: returns x1 if x1 < x0, which enables the idiom
// `a[clamp(i, 0, b.length-1)]` to return undefined when b is empty.
G.clamp = function(x, x0, x1) {
	return min(max(x, x0 ?? -1/0), x1 ?? 1/0)
}

G.lerp = function(x, x0, x1, y0, y1) {
	return y0 + (x-x0) * ((y1-y0) / (x1 - x0))
}

Number.prototype.dec = Number.prototype.toFixed

G.num = function(s) {
	let x = parseFloat(s)
	return x != x ? undefined : x
}

G.str = String

// usage:
//	 '{1} of {0}'.subst(total, current)
//	 '{1} of {0}'.subst([total, current])
//	 '{1} of {0:foo:foos}'.subst([total, current])
//	 '{current} of {total}'.subst({'current': current, 'total': total})
String.prototype.subst = function(...args) {
	if (!args.length)
		return this.valueOf()
	if (isarray(args[0]))
		args = args[0]
	if (isobject(args[0]))
		args = args[0]
	return this.replace(/{(\w+)\:(\w+)\:(\w+)}/g, function(match, s, singular, plural) {
		let v = num(args[s])
		return v != null ? v + ' ' + (v > 1 ? plural : singular) : s
	}).replace(/{([\w\:]+)}/g, (match, s) => args[s])
}

String.prototype.starts = function(s, i) { return this.startsWith(s, i) }
String.prototype.ends   = function(s, i) { return this.endsWith(s, i) }
String.prototype.upper  = function() { return this.toUpperCase() }
String.prototype.lower  = function() { return this.toLowerCase() }

G.obj = () => Object.create(null)
G.set = (iter) => new Set(iter)
G.map = (iter) => new Map(iter)
G.array = (...args) => new Array(...args)

G.assign = Object.assign

G.noop = function() {}

G.json = JSON.stringify

G.clock = function() { return performance.now() / 1000 }

EventTarget.prototype.on = function(event, f, on) {
	if (on == null)
		on = true
	if (on)
		this.addEventListener(event, f)
	else
		this.removeEventListener(event, f)
}

function hash32(s) {
	let hash = 0
	for (let i = 0, n = s.length; i < n; i++) {
		hash = ((hash << 5) - hash) + s.charCodeAt(i)
		hash |= 0 // convert to 32bit integer
	}
	return hash
}

function map_freelist() {
	let fl = []
	return function(m) {
		if (m) {
			m.clear()
			fl.push(m)
		} else {
			m = fl.pop()
			return m || map()
		}
	}
}

// when using capture_pointer(), setting the cursor for the element that
// is hovered doesn't work anymore, so use this hack instead.
{
let cursor_style
G.set_cursor = function(cursor) {
	if (cursor) {
		if (!cursor_style) {
			cursor_style = document.createElement('style')
			cursor_style.innerHTML = '* {cursor: '+cursor+' !important; }'
			document.documentElement.appendChild(cursor_style)
		} else {
			cursor_style.innerHTML = '* {cursor: '+cursor+' !important; }'
		}
	} else if (cursor_style) {
		cursor_style.remove()
		cursor_style = null
	}
}
}

// ui module -----------------------------------------------------------------

G.ui = {}

G.DEBUG = 0

// canvas --------------------------------------------------------------------

let a = []

let dpr

function resize_canvas() {
	dpr = devicePixelRatio
	let window_w = window.innerWidth
	let window_h = window.innerHeight
	let screen_w = floor(window_w * dpr)
	let screen_h = floor(window_h * dpr)
	canvas.style.width  = screen_w / dpr + 'px'
	canvas.style.height = screen_h / dpr + 'px'
	canvas.width  = screen_w
	canvas.height = screen_h
	a.w = screen_w
	a.h = screen_h
	redraw()
}
let cx = canvas.getContext('2d')
let raf_id
let max_frame_duration = 0
let last_frame_duration = 0
function raf_redraw() {
	raf_id = null
	let t0 = clock()
	cx.clearRect(0, 0, canvas.width, canvas.height)
	redraw_all()
	last_frame_duration = clock() - t0
	if (max_frame_duration)
		max_frame_duration = max(last_frame_duration, max_frame_duration)
	else
		max_frame_duration = 0.000001
}
function redraw() {
	if (raf_id) return
	want_redraw = true
	raf_id = requestAnimationFrame(raf_redraw)
}
window.on('resize', resize_canvas)

// input event handling ------------------------------------------------------

let mx, my, mx0, my0
let pressed = false
let click = false
let clickup = false
let captured_id
let wheel_dy = 0
let trackpad = false

function reset_mouse() {
	if (clickup)
		captured_id = null
	click = false
	clickup = false
	wheel_dy = 0
	trackpad = false
}

canvas.on('pointerdown', function(ev) {
	mx = ev.clientX * dpr
	my = ev.clientY * dpr
	if (ev.which == 1) {
		click = true
		pressed = true
		this.setPointerCapture(ev.pointerId)
		hit_all()
		redraw()
	}
})

canvas.on('pointerup', function(ev) {
	mx = ev.clientX * dpr
	my = ev.clientY * dpr
	if (ev.which == 1) {
		pressed = false
		clickup = true
		this.releasePointerCapture(ev.pointerId)
		hit_all()
		redraw()
	}
})

canvas.on('pointermove', function(ev) {
	mx = ev.clientX * dpr
	my = ev.clientY * dpr
	hit_all()
	redraw()
})

canvas.on('pointerleave', function(ev) {
	mx = null
	my = null
	set_cursor()
	hit_all()
	redraw()
})

canvas.on('wheel', function(ev) {
	wheel_dy = ev.wheelDeltaY
	if (!wheel_dy)
		return
	trackpad = ev.wheelDeltaY === -ev.deltaY * 3
	mx = ev.clientX * dpr
	my = ev.clientY * dpr
	hit_all()
	redraw()
})

let capture_state = map()

ui.capture = function(id) {
	if (!id)
		return
	if (captured_id)
		return
	if (!pressed)
		return
	if (!ui.hit(id))
		return
	captured_id = id
	capture_state.clear()
	mx0 = mx
	my0 = my
	return capture_state
}

ui.captured = function(id) {
	if (!id)
		return
	if (captured_id != id)
		return
	return capture_state
}

// z-layers ------------------------------------------------------------------

function layer_make(name) {
	let layer = [] // [popup1_i,...]
	layer.name = name
	return layer
}

function layer_clear(layer) {
	layer.length = 0
}

let layer_base   = layer_make('base')
let layer_popup  = layer_make('popup')
let layer_handle = layer_make('handle')

a.layers = [layer_base, layer_popup, layer_handle]

let layer_stack = []
let layer

function begin_layer(layer1, i) {
	if (layer1 != layer)
		layer1.push(i)
	if (layer)
		layer_stack.push(layer)
	layer = layer1
}

function end_layer() {
	layer = layer_stack.pop()
}

// id state maps -------------------------------------------------------------

let id_state_map_freelist = map_freelist()
let id_state_maps = map() // {id->map}
let id_current_set = set() // {id}
let id_remove_set  = set() // {id}

function id_touch(id) {
	id_current_set.add(id)
	id_remove_set.delete(id)
}

ui.state = function(id) {
	if (!id)
		return
	id_touch(id)
	let m = id_state_maps.get(id)
	if (!m) {
		m = id_state_map_freelist()
		id_state_maps.set(id, m)
	}
	return m
}

function id_state_gc() {
	for (let id of id_remove_set) {
		let m = id_state_maps.get(id)
		id_state_maps.delete(id)
		id_state_map_freelist(m)
	}
	id_remove_set.clear()
	let empty = id_remove_set
	id_remove_set = id_current_set
	id_current_set = empty
}

// imgui command array -------------------------------------------------------

let cmd_names = []
let cmd_name_map = map()

function C(a, i) { return cmd_names[a[i-1]] }

let measure   = []
let position  = []
let translate = []
let draw      = []
let hit       = []

function cmd(name, is_ct) {
	let code = hash32(name)
	code = (is_ct ? -1 : 1) * abs(code)
	assert(!cmd_names[code], 'duplicate command code {0} for {1}', code, name)
	cmd_names[code] = name
	cmd_name_map.set(name, code)
	return code
}
function cmd_ct(name) {
	return cmd(name, true)
}

ui.widget = function(cmd_name, t, is_ct) {
	let _cmd = cmd(cmd_name, is_ct)
	measure   [_cmd] = t.measure
	position  [_cmd] = t.position
	translate [_cmd] = t.translate
	draw      [_cmd] = t.draw
	hit       [_cmd] = t.hit
	let create = t.create
	if (create) {
		function wrapper(...args) {
			return create(_cmd, ...args)
		}
		ui[cmd_name] = wrapper
		return wrapper
	} else {
		return _cmd
	}
}
ui.widget_ct = function(cmd_name, t) { return ui.widget(cmd_name, t, true) }

ui.box_widget = function(cmd_name, t) {
	return ui.widget(cmd_name, assign({
		measure: function(a, i, axis) {
			let fr = a[i+FR]
			let w  = a[i+2+axis]
			add_ct_min_wh(a, axis, w, fr)
		},
		position: function(a, i, axis, sx, sw) {
			a[i+0+axis] = inner_x(a, i, axis, align_x(a, i, axis, sx, sw))
			a[i+2+axis] = inner_w(a, i, axis, align_w(a, i, axis, sw))
		},
		translate: function(a, i, dx, dy) {
			a[i+0] += dx
			a[i+1] += dy
		},
	}, t))
}

let color, font, font_size

function reset_all() {
	color = 'white'
	font = null
	font_size = null
	reset_paddings()
}

function ui_cmd(cmd, ...args) {
	let i0 = a.length+2   // index of this cmd's arg#1
	let i1 = i0+args.length+3 // index of next cmd's arg#1
	a.push(i1, cmd, ...args, i0)
	return i0
}

let ct_stack = [] // [ct_i1,...]

function check_stacks() {
	if (ct_stack.length) {
		for (let i of ct_stack)
			pr(C(a, i), 'not closed')
		assert(false)
	}
	if (layer_stack.length) {
		for (let layer of layer_stack)
			pr('layer', layer.name, 'not closed')
		assert(false)
	}
	assert(!color_stack.length, 'color not closed')
}

const PX1        =  4
const PX2        =  6
const MX1        =  8
const MX2        = 10

const FR         = 12 // children of v,h: fraction from main-axis size.
const ALIGN      = 13 // all children: align v,h.
const NEXT_EXT_I = 15 // all containers: next command after this one's END command.
const S          = 16 // first index after the ui_cmd_box_ct header.

const FLEX_GAP      = S+0
const FLEX_TOTAL_FR = S+1

const ALIGN_STRETCH = 0
const ALIGN_START   = 1
const ALIGN_END     = 2
const ALIGN_CENTER  = 3

function parse_align(s) {
	if (s == 's') return ALIGN_STRETCH
	if (s == 'c') return ALIGN_CENTER
	if (s == 'l') return ALIGN_START
	if (s == 'r') return ALIGN_END
	if (s == '[') return ALIGN_START
	if (s == ']') return ALIGN_END
	if (s == 'stretch') return ALIGN_STRETCH
	if (s == 'center' ) return ALIGN_CENTER
	if (s == 'left'   ) return ALIGN_START
	if (s == 'right'  ) return ALIGN_END
	assert(false, 'invalid align {0}', s)
}

function parse_valign(s) {
	if (s == 's') return ALIGN_STRETCH
	if (s == 'c') return ALIGN_CENTER
	if (s == 't') return ALIGN_START
	if (s == 'b') return ALIGN_END
	if (s == '[') return ALIGN_START
	if (s == ']') return ALIGN_END
	if (s == 'stretch') return ALIGN_STRETCH
	if (s == 'center' ) return ALIGN_CENTER
	if (s == 'top'    ) return ALIGN_START
	if (s == 'bottom' ) return ALIGN_END
	assert(false, 'invalid valign {0}', s)
}

// paddings and margins, applied to the next box cmd and then they are reset.
let px1, px2, py1, py2
let mx1, mx2, my1, my2

ui.padding = function(_px1, _px2, _py1, _py2) {
	px1 = _px1 ?? 0
	px2 = _px2 ?? _px1 ?? 0
	py1 = _py1 ?? _px1 ?? 0
	py2 = _py2 ?? _py1 ?? _px1 ?? 0
}
ui.p = ui.padding
ui.padding_left   = function(p) { px1 = p }; ui.pl = ui.padding_left
ui.padding_right  = function(p) { px2 = p }; ui.pr = ui.padding_right
ui.padding_top    = function(p) { py1 = p }; ui.pt = ui.padding_top
ui.padding_bottom = function(p) { py2 = p }; ui.pb = ui.padding_bottom

ui.margin = function(_mx1, _mx2, _my1, _my2) {
	mx1 = _mx1 ?? 0
	mx2 = _mx2 ?? _mx1 ?? 0
	my1 = _my1 ?? _mx1 ?? 0
	my2 = _my2 ?? _my1 ?? _mx1 ?? 0
}
ui.m = ui.margin
ui.margin_left   = function(m) { mx1 = m }; ui.ml = ui.margin_left
ui.margin_right  = function(m) { mx2 = m }; ui.mr = ui.margin_right
ui.margin_top    = function(m) { my1 = m }; ui.mt = ui.margin_top
ui.margin_bottom = function(m) { my2 = m }; ui.mb = ui.margin_bottom

function reset_paddings() {
	px1 = 0
	py1 = 0
	px2 = 0
	py2 = 0
	mx1 = 0
	my1 = 0
	mx2 = 0
	my2 = 0
}

function ui_cmd_box(cmd, fr, align, valign, min_w, min_h, ...args) {
	let i = ui_cmd(cmd,
		0, // x
		0, // y
		min_w ?? 0,
		min_h ?? 0,
		px1, py1, px2, py2,
		mx1, my1, mx2, my2,
		fr ?? 1,
		parse_align  (align  ?? 's'),
		parse_valign (valign ?? 's'),
		...args
	)
	reset_paddings()
	return i
}

// NOTE: `ct` is short for container, which must end with ui.end().
function ui_cmd_box_ct(cmd, fr, align, valign, min_w, min_h, ...args) {
	let i = ui_cmd_box(cmd, fr, align, valign, min_w, min_h,
		0, // next_ext_i
		...args
	)
	ct_stack.push(i)
	return i
}

function ui_hv(cmd, fr, gap, align, valign, min_w, min_h) {
	ui_cmd_box_ct(cmd, fr, align, valign, min_w, min_h,
		gap ?? 0,
		0, // total_fr
	)
}

const CMD_H = cmd_ct('h')
const CMD_V = cmd_ct('v')

ui.h = function(...args) { ui_hv(CMD_H, ...args) }
ui.v = function(...args) { ui_hv(CMD_V, ...args) }

const STACK_ID = S+0

const CMD_STACK = cmd_ct('stack')
ui.stack = function(id, fr, align, valign, min_w, min_h) {
	return ui_cmd_box_ct(CMD_STACK, fr, align, valign, min_w, min_h,
		id)
}

const SB_OVERFLOW =  S+0 // overflow x,y
const SB_CW       =  S+2 // content w,h
const SB_ID       =  S+4
const SB_SX       =  S+5 // scroll x,y

const CMD_SCROLLBOX = cmd_ct('scrollbox')
ui.scrollbox = function(id, fr, overflow_x, overflow_y, align, valign, min_w, min_h, sx, sy) {

	let ss = ui.state(id)
	sx = sx ?? (ss ? ss.get('scroll_x') : 0)
	sy = sy ?? (ss ? ss.get('scroll_y') : 0)

	let i = ui_cmd_box_ct(CMD_SCROLLBOX, fr, align, valign, 0, 0,
		overflow_x ?? 'auto',
		overflow_y ?? 'auto',
		min_w ?? 0, // swapped with content w on `end`
		min_h ?? 0, // swapped with content h on `end`
		id,
		sx ?? 0, // scroll x
		sy ?? 0, // scroll y
	)
	if (ss) {
		ss.set('scroll_x', sx)
		ss.set('scroll_y', sy)
	}
}

const POPUP_SIDE_CENTER       = 0 // only POPUP_SIDE_INNER_CENTER is valid!
const POPUP_SIDE_LEFT         = 1
const POPUP_SIDE_RIGHT        = 2
const POPUP_SIDE_TOP          = 3
const POPUP_SIDE_BOTTOM       = 4
const POPUP_INNER             = 8 // own bit!
const POPUP_SIDE_INNER_CENTER = POPUP_INNER + POPUP_SIDE_CENTER
const POPUP_SIDE_INNER_LEFT   = POPUP_INNER + POPUP_SIDE_LEFT
const POPUP_SIDE_INNER_RIGHT  = POPUP_INNER + POPUP_SIDE_RIGHT
const POPUP_SIDE_INNER_TOP    = POPUP_INNER + POPUP_SIDE_TOP
const POPUP_SIDE_INNER_BOTTOM = POPUP_INNER + POPUP_SIDE_BOTTOM

const POPUP_ALIGN_CENTER = 0
const POPUP_ALIGN_START  = 1
const POPUP_ALIGN_END    = 2

function popup_parse_side(s) {
	if (s == '['           ) return POPUP_SIDE_LEFT
	if (s == ']'           ) return POPUP_SIDE_RIGHT
	if (s == 'l'           ) return POPUP_SIDE_LEFT
	if (s == 'r'           ) return POPUP_SIDE_RIGHT
	if (s == 't'           ) return POPUP_SIDE_TOP
	if (s == 'b'           ) return POPUP_SIDE_BOTTOM
	if (s == 'ic'          ) return POPUP_SIDE_INNER_CENTER
	if (s == 'il'          ) return POPUP_SIDE_INNER_LEFT
	if (s == 'ir'          ) return POPUP_SIDE_INNER_RIGHT
	if (s == 'it'          ) return POPUP_SIDE_INNER_TOP
	if (s == 'ib'          ) return POPUP_SIDE_INNER_BOTTOM
	if (s == 'left'        ) return POPUP_SIDE_LEFT
	if (s == 'right'       ) return POPUP_SIDE_RIGHT
	if (s == 'top'         ) return POPUP_SIDE_TOP
	if (s == 'bottom'      ) return POPUP_SIDE_BOTTOM
	if (s == 'inner-center') return POPUP_SIDE_INNER_CENTER
	if (s == 'inner-left'  ) return POPUP_SIDE_INNER_LEFT
	if (s == 'inner-right' ) return POPUP_SIDE_INNER_RIGHT
	if (s == 'inner-top'   ) return POPUP_SIDE_INNER_TOP
	if (s == 'inner-bottom') return POPUP_SIDE_INNER_BOTTOM
	assert(false, 'invalid popup side {0}', s)
}

function popup_parse_align(s) {
	if (s == 'c'     ) return POPUP_ALIGN_CENTER
	if (s == '['     ) return POPUP_ALIGN_START
	if (s == ']'     ) return POPUP_ALIGN_END
	if (s == 'center') return POPUP_ALIGN_CENTER
	if (s == 'start' ) return POPUP_ALIGN_START
	if (s == 'end'   ) return POPUP_ALIGN_END
	assert(false, 'invalid align {0}', s)
}

const POPUP_FIT_CHANGE_SIDE = 1
const POPUP_FIT_CONSTRAIN   = 2

function popup_parse_flags(s) {
	return (
		(s.includes('change_side') ? POPUP_FIT_CHANGE_SIDE : 0) |
		(s.includes('constrain'  ) ? POPUP_FIT_CONSTRAIN   : 0)
	)
}

const POPUP_ID        = S+0
const POPUP_LAYER     = S+1
const POPUP_TARGET_I  = S+2
const POPUP_SIDE      = S+3
const POPUP_ALIGN     = S+4
const POPUP_FLAGS     = S+5
const POPUP_FONT      = S+6
const POPUP_FONT_SIZE = S+7

const POPUP_TARGET_SCREEN = -1
const POPUP_TARGET_PARENT = -2

const CMD_POPUP = cmd_ct('popup')
ui.popup = function(id, layer1, target_i, side, align, min_w, min_h, flags) {
	layer1 = layer1 || layer
	// TODO: fr, align, valign are not used. find a way to remove them.
	let i = ui_cmd_box_ct(CMD_POPUP, 0, 's', 's', min_w, min_h,
		id,
		layer1,
		repl(target_i, 'screen', POPUP_TARGET_SCREEN) ?? POPUP_TARGET_PARENT,
		popup_parse_side(side ?? 't'),
		popup_parse_align(align ?? 'c'),
		popup_parse_flags(flags ?? 'change_side constrain'),
		// inherited state
		font,
		font_size,
	)
	begin_layer(layer1, i)
	ui.begin_color(color)
}

const CMD_END = cmd('end')
ui.end = function(cmd) {
	let i = assert(ct_stack.pop(), 'end command outside container')
	if (cmd && a[i-1] != cmd)
		assert(false, 'closing {0} instead of {1}', cmd_names[cmd], C(a, i))
	let end_i = ui_cmd(CMD_END, i)
	a[i+NEXT_EXT_I] = a[end_i-2] // next_i

	if (a[i-1] == CMD_POPUP) {
		end_layer()
		ui.end_color()
	}
}
ui.end_h         = function() { ui.end(CMD_H) }
ui.end_v         = function() { ui.end(CMD_V) }
ui.end_stack     = function() { ui.end(CMD_STACK) }
ui.end_scrollbox = function() { ui.end(CMD_SCROLLBOX) }
ui.end_popup     = function() { ui.end(CMD_POPUP) }

const BORDER_SIDE_T = 1
const BORDER_SIDE_R = 2
const BORDER_SIDE_B = 4
const BORDER_SIDE_L = 8
const BORDER_SIDE_ALL = 15

function parse_border_sides(s) {
	if (!s) // 0, null, undefined
		return 0
	if (s == true || s == 'all') // true, 1, 'all'
		return BORDER_SIDE_ALL
	let b = (
		(s.includes('l') ? BORDER_SIDE_L : 0) |
		(s.includes('r') ? BORDER_SIDE_R : 0) |
		(s.includes('t') ? BORDER_SIDE_T : 0) |
		(s.includes('b') ? BORDER_SIDE_B : 0)
	)
	if (s.starts('-'))
		b = ~b & BORDER_SIDE_ALL
	return b
}

const BB_ID   = 0
const BB_CT_I = 1

const CMD_BB = cmd('bb') // border-background
ui.bb = function(id, bg_color, sides, border_color, border_radius) {
	let ct_i = assert(ct_stack.at(-1), 'bb outside container')
	ui_cmd(CMD_BB, id, ct_i, bg_color, parse_border_sides(sides), border_color, border_radius)
}

const CMD_SHADOW = cmd('shadow')
ui.shadow = function(color, blur, x, y) {
	ui_cmd(CMD_SHADOW, color, blur, x, y)
}

const TEXT_ASC = S-1
const TEXT_ID  = S+0
const TEXT_S   = S+1

const TEXT_MEASURE = -1

const CMD_TEXT = cmd('text')
ui.text = function(id, s, align, valign, fr, min_w, min_h) {
	// NOTE: min_w and min_h are measured, not given.
	ui_cmd_box(CMD_TEXT, fr ?? 0, align ?? '[', valign ?? 'c',
			min_w ?? TEXT_MEASURE,
			min_h ?? TEXT_MEASURE,
		0, // ascent
		id,
		s,
	)
}

let color_stack = []

const CMD_COLOR = cmd('color')
ui.begin_color = function(s) {
	color_stack.push(color)
	ui_cmd(CMD_COLOR, s)
	color = s
}

ui.end_color = function() {
	let s = color_stack.pop()
	ui_cmd(CMD_COLOR, s)
	color = s
}

const CMD_FONT = cmd('font')
ui.font = function(s) {
	if (font == s) return
	ui_cmd(CMD_FONT, s)
	font = s
}

const CMD_FONT_SIZE = cmd('font_size')
ui.font_size = function(s) {
	if (font_size == s) return
	ui_cmd(CMD_FONT_SIZE, s)
	font_size = s
}

function set_font(a, i) {
	font = a[i]
	cx.font = font_size + 'px ' + font
}

function set_font_size(a, i) {
	font_size = a[i]
	cx.font = font_size + 'px ' + font
}

function get_next_ext_i(a, i) {
	let cmd = a[i-1]
	if (cmd < 0) // container
		return a[i+NEXT_EXT_I]
	return a[i-2] // next_i
}

// measuring phase (per-axis) ------------------------------------------------

// calculate a[i+2]=min_w (for axis=0) or a[i+3]=min_h (for axis=1) of all boxes
// by walking the container tree bottom-up (non-recursive, uses ct_stack).
// the minimum dimensions include margins and paddings.

function is_main_axis(cmd, axis) {
	return (
		(cmd == CMD_V ? 1 : 2) == axis ||
		(cmd == CMD_H ? 0 : 2) == axis
	)
}

function paddings(a, i, axis) {
	return (
		a[i+MX1+axis] + a[i+MX2+axis] +
		a[i+PX1+axis] + a[i+PX2+axis]
	)
}

function add_ct_min_wh(a, axis, w, fr) {
	let i = ct_stack.at(-1)
	if (i == null) // root ct
		return
	let cmd = a[i-1]
	let main_axis = is_main_axis(cmd, axis)
	let min_w = a[i+2+axis]
	if (main_axis) {
		a[i+FLEX_TOTAL_FR] += fr
		let gap = a[i+FLEX_GAP]
		a[i+2+axis] = min_w + w + gap
	} else {
		a[i+2+axis] = max(min_w, w)
	}
}

measure[CMD_FONT] = set_font
measure[CMD_FONT_SIZE] = set_font_size

measure[CMD_TEXT] = function(a, i, axis) {
	let fr = a[i+FR]
	if (!axis) { // measure once
		let s = a[i+TEXT_S]
		let m = cx.measureText(s)
		let asc = m.fontBoundingBoxAscent
		let dsc = m.fontBoundingBoxDescent
		let m_x = a[i+2] == TEXT_MEASURE
		let m_y = a[i+3] == TEXT_MEASURE
		if (m_x) a[i+2] = ceil(m.width)
		if (m_y) a[i+3] = ceil(asc+dsc)
		a[i+TEXT_ASC] = (m_x && m_y ? 1 : -1) * round(asc)
	}
	a[i+2+axis] += paddings(a, i, axis)
	let w = a[i+2+axis]
	add_ct_min_wh(a, axis, w, fr)
}

function ct_stack_push(a, i) {
	ct_stack.push(i)
}

measure[CMD_H        ] = ct_stack_push
measure[CMD_V        ] = ct_stack_push
measure[CMD_STACK    ] = ct_stack_push
measure[CMD_SCROLLBOX] = ct_stack_push
measure[CMD_POPUP    ] = ct_stack_push

measure[CMD_END] = function(a, _, axis) {
	let i = assert(ct_stack.pop(), 'end command outside a container')
	let p = paddings(a, i, axis)
	let cmd = a[i-1]
	if (cmd == CMD_SCROLLBOX) {
		let co_min_w = a[i+2+axis] // content min_w
		let sb_min_w = a[i+SB_CW+axis] + p // scrollbox min_w
		a[i+SB_CW+axis] = co_min_w
		a[i+2+axis] = sb_min_w
		let fr = a[i+FR]
		add_ct_min_wh(a, axis, sb_min_w, fr)
	} else if (cmd == CMD_POPUP) {
		a[i+2+axis] += p
		// popups don't affect their target's layout so no add_ct_min_wh() call.
	} else {
		let main_axis = is_main_axis(cmd, axis)
		if (main_axis)
			a[i+2+axis] = max(0, a[i+2+axis] - a[i+FLEX_GAP]) // remove last element's gap
		a[i+2+axis] += p
		let min_w = a[i+2+axis]
		let fr    = a[i+FR]
		add_ct_min_wh(a, axis, min_w, fr)
	}
}

function measure_all(axis) {
	check_stacks()
	reset_all()
	let i = 2
	let n = a.length
	while (i < n) {
		let cmd    = a[i-1]
		let next_i = a[i-2]
		let measure_f = measure[cmd]
		if (measure_f)
			measure_f(a, i, axis)
		i = next_i
	}
	check_stacks()
}

// positioning phase (per-axis) ----------------------------------------------

// calculate a[i+0]=x, a[i+2]=w (for axis=0) or a[i+1]=y, a[i+3]=h (for axis=1)
// of all boxes by walking the container tree top-down, and using different
// positioning algorithms based on container type (recursive).
// the resulting boxes at a[i+0..3] exclude margins and paddings.
// scrolling and popup positioning is done at a later stage.

function align_w(a, i, axis, sw) {
	let align = a[i+ALIGN+axis]
	if (align == ALIGN_STRETCH)
		return sw
	return a[i+2+axis] // min_w
}

function align_x(a, i, axis, sx, sw) {
	let align = a[i+ALIGN+axis]
	if (align == ALIGN_END) {
		let min_w = a[i+2+axis]
		return sx + sw - min_w
	} else if (align == ALIGN_CENTER) {
		let min_w = a[i+2+axis]
		return sx + round((sw - min_w) / 2)
	} else {
		return sx
	}
}

// outer-box (ct_x, ct_w) -> inner-box (x, w).
function inner_x(a, i, axis, ct_x) {
	return ct_x + a[i+MX1+axis] + a[i+PX1+axis]
}
function inner_w(a, i, axis, ct_w) {
	return ct_w - paddings(a, i, axis)
}

position[CMD_TEXT] = function(a, i, axis, sx, sw) {
	a[i+2+axis] = sw // stretch min_w to sw
	let x = inner_x(a, i, axis, align_x(a, i, axis, sx, sw))
	let w = inner_w(a, i, axis, align_w(a, i, axis, sw))
	a[i+0+axis] = x
	a[i+2+axis] = w
}

function position_children_cross_axis(a, i, axis, sx, sw) {

	i = a[i-2] // next_i
	while (a[i-1] != CMD_END) {

		let cmd = a[i-1]
		let position_f = position[cmd]
		if (position_f) {
			// position item's children recursively.
			position_f(a, i, axis, sx, sw)
		}

		i = get_next_ext_i(a, i)
	}
}

function position_flex(a, i, axis, sx, sw) {

	sx = inner_x(a, i, axis, align_x(a, i, axis, sx, sw))
	sw = inner_w(a, i, axis, align_w(a, i, axis, sw))

	a[i+0+axis] = sx
	a[i+2+axis] = sw

	if (is_main_axis(a[i-1], axis)) {

		let next_i   = a[i-2]
		let gap      = a[i+FLEX_GAP]
		let total_fr = a[i+FLEX_TOTAL_FR]

		// compute total gap.
		let gap_w = 0
		if (gap) {
			let n = 0
			let i = next_i
			while (a[i-1] != CMD_END) {
				if (position[a[i-1]])
					n++
				i = get_next_ext_i(a, i)
			}
			gap_w = max(0, (n - 1) * gap)
		}

		let total_w = sw - gap_w

		// compute total overflow width and total free width.
		let total_overflow_w = 0
		let total_free_w     = 0
		i = next_i
		while (a[i-1] != CMD_END) {

			let cmd = a[i-1]
			if (position[cmd]) {

				let min_w = a[i+2+axis]
				let fr    = a[i+FR]

				let flex_w = total_w * max(0, fr) / total_fr
				let overflow_w = max(0, min_w - flex_w)
				let free_w = max(0, flex_w - min_w)
				total_overflow_w += overflow_w
				total_free_w     += free_w

			}

			i = get_next_ext_i(a, i)
		}

		// distribute the overflow to children which have free space to
		// take it. each child shrinks to take in the percent of the overflow
		// equal to the child's percent of free space.
		i = next_i
		while (a[i-1] != CMD_END) {

			let cmd = a[i-1]
			let position_f = position[cmd]

			if (position_f) {

				let min_w = a[i+2+axis]
				let fr    = a[i+FR]

				// compute item's stretched width.
				let flex_w = total_w * fr / total_fr
				let sw
				if (min_w > flex_w) { // overflow
					sw = min_w
				} else {
					let free_w = flex_w - min_w
					let free_p = free_w / total_free_w
					let shrink_w = total_overflow_w * free_p
					if (shrink_w != shrink_w) // total_free_w == 0
						shrink_w = 0
					sw = floor(flex_w - shrink_w)
				}

				// TODO: check if this is the last element and if it is,
				// set `sw = total_w - sx` so that it eats up all rounding errors.

				// position item's children recursively.
				position_f(a, i, axis, sx, sw)

				sw += gap
				sx += sw

			}

			i = get_next_ext_i(a, i)
		}

	} else {

		position_children_cross_axis(a, i, axis, sx, sw)

	}

}
position[CMD_H] = position_flex
position[CMD_V] = position_flex

position[CMD_STACK] = function(a, i, axis, sx, sw) {
	let x = inner_x(a, i, axis, align_x(a, i, axis, sx, sw))
	let w = inner_w(a, i, axis, align_w(a, i, axis, sw))
	a[i+0+axis] = x
	a[i+2+axis] = w
	position_children_cross_axis(a, i, axis, x, w)
}

// NOTE: scrolling is done later in the translation phase.
position[CMD_SCROLLBOX] = function(a, i, axis, sx, sw) {
	let x = inner_x(a, i, axis, align_x(a, i, axis, sx, sw))
	let w = inner_w(a, i, axis, align_w(a, i, axis, sw))
	a[i+0+axis] = x
	a[i+2+axis] = w
	let content_w = a[i+SB_CW+axis]
	position_children_cross_axis(a, i, axis, x, max(content_w, w))
}

// NOTE: popup positioning is done later in the translation phase.
position[CMD_POPUP] = function(a, i, axis) {
	let w = inner_w(a, i, axis, a[i+2+axis])
	a[i+2+axis] = w
	position_children_cross_axis(a, i, axis, 0, w)
}

function position_all(axis) {
	let ct_w = axis ? a.h : a.w
	let i = 2
	let cmd = a[i-1]
	let min_w = a[i+2+axis]
	let position_f = position[cmd]
	position_f(a, i, axis, 0, max(min_w, ct_w))
}

// translation phase ---------------------------------------------------------

// do scrolling and popup positioning and offset all boxes (top-down, recursive).

translate[CMD_TEXT] = function(a, i, dx, dy) {
	a[i+0] += dx
	a[i+1] += dy
}

function translate_children(a, i, dx, dy) {
	let ct_i = i
	i = a[i-2] // next_i
	while (a[i-1] != CMD_END) {
		let cmd = a[i-1]
		let next_ext_i = get_next_ext_i(a, i)
		let translate_f = translate[cmd]
		if (translate_f)
			translate_f(a, i, dx, dy, ct_i)
		i = next_ext_i
	}
}

function translate_ct(a, i, dx, dy) {
	a[i+0] += dx
	a[i+1] += dy
	translate_children(a, i, dx, dy)
}

translate[CMD_H    ] = translate_ct
translate[CMD_V    ] = translate_ct
translate[CMD_STACK] = translate_ct

translate[CMD_SCROLLBOX] = function(a, i, dx, dy) {

	let x  = a[i+0] + dx
	let y  = a[i+1] + dy
	let w  = a[i+2]
	let h  = a[i+3]
	let cw = a[i+SB_CW+0]
	let ch = a[i+SB_CW+1]
	let sx = a[i+SB_SX+0]
	let sy = a[i+SB_SX+1]

	a[i+0] = x
	a[i+1] = y

	sx = max(0, min(sx, cw - w))
	sy = max(0, min(sy, ch - h))

	let psx = sx / (cw - w)
	let psy = sy / (ch - h)

	let id = a[i+SB_ID]
	if (id) {
		for (let axis = 0; axis < 2; axis++) {

			let [visible, tx, ty, tw, th] = scrollbar_rect(a, i, axis)
			if (!visible)
				continue

			// wheel scrolling
			if (axis && wheel_dy && ui.hit(id)) {
				let sy0 = ui.state(id).get('scroll_y') ?? 0
				sy = clamp(sy - wheel_dy, 0, ch - h)
				ui.state(id).set('scroll_y', sy)
				a[i+SB_SX+1] = sy
			}

			// drag-scrolling
			let sbar_id = id+'.scrollbar'+axis
			let cs = ui.captured(sbar_id)
			if (cs) {
				if (!axis) {
					let psx0 = cs.get('ps0')
					let dpsx = (mx - mx0) / (w - tw)
					sx = clamp(psx0 + dpsx, 0, 1) * (cw - w)
					ui.state(id).set('scroll_x', sx)
					a[i+SB_SX+0] = sx
				} else {
					let psy0 = cs.get('ps0')
					let dpsy = (my - my0) / (h - th)
					sy = clamp(psy0 + dpsy, 0, 1) * (ch - h)
					ui.state(id).set('scroll_y', sy)
					a[i+SB_SX+1] = sy
				}
				break
			} else {
				if (!ui.hit(sbar_id))
					continue
				let cs = ui.capture(sbar_id)
				if (!cs)
					continue
				cs.set('ps0', !axis ? psx : psy)
			}
		}
	}

	translate_children(a, i, dx - sx, dy - sy)

}

{
let x, y
function position_popup(w, h, side, align, tx1, ty1, tx2, ty2) {

	let tw = tx2 - tx1
	let th = ty2 - ty1

	if (side == POPUP_SIDE_RIGHT) {
		;[x, y] = [tx2, ty1]
	} else if (side == POPUP_SIDE_LEFT) {
		;[x, y] = [tx1 - w, ty1]
	} else if (side == POPUP_SIDE_TOP) {
		;[x, y] = [tx1, ty1 - h]
	} else if (side == POPUP_SIDE_BOTTOM) {
		;[x, y] = [tx1, ty2]
	} else if (side == POPUP_SIDE_INNER_RIGHT) {
		;[x, y] = [tx2 - w, ty1]
	} else if (side == POPUP_SIDE_INNER_LEFT) {
		;[x, y] = [tx1, ty1]
	} else if (side == POPUP_SIDE_INNER_TOP) {
		;[x, y] = [tx1, ty1]
	} else if (side == POPUP_SIDE_INNER_BOTTOM) {
		;[x, y] = [tx1, ty2 - h]
	} else if (side == POPUP_SIDE_INNER_CENTER) {
		;[x, y] = [
			tx1 + round((tw - w) / 2),
			ty1 + round((th - h) / 2)
		]
	} else {
		assert(false)
	}

	let sd = side & ~POPUP_INNER
	let sdx = sd == POPUP_SIDE_LEFT || sd == POPUP_SIDE_RIGHT
	let sdy = sd == POPUP_SIDE_TOP  || sd == POPUP_SIDE_BOTTOM
	if (align == POPUP_ALIGN_CENTER && sdy)
		x = x + round((tw - w) / 2)
	else if (align == POPUP_ALIGN_CENTER && sdx)
		y = y + round((th - h) / 2)
	else if (align == POPUP_ALIGN_END && sdy)
		x = x + tw - w
	else if (align == POPUP_ALIGN_END && sdx)
		y = y + th - h
}
translate[CMD_POPUP] = function(a, i, dx_not_used, dy_not_used, ct_i) {

	let d = 10
	let bw = a.w
	let bh = a.h

	let tx1, ty1, tx2, ty2

	let target_i = a[i+POPUP_TARGET_I]

	if (target_i == POPUP_TARGET_SCREEN) {

		ct_i = null

		tx1 = d
		ty1 = d
		tx2 = bw - d
		ty2 = bh - d

	} else {

		if (target_i >= 0)
			ct_i = target_i

		tx1 = a[ct_i+0] - a[ct_i+PX1+0]
		ty1 = a[ct_i+1] - a[ct_i+PX1+1]
		tx2 = a[ct_i+2] + tx1 + a[ct_i+PX2+0]
		ty2 = a[ct_i+3] + ty1 + a[ct_i+PX2+1]

	}

	tx1 += a[i+PX1+0] + a[i+MX1+0]
	ty1 += a[i+PX1+1] + a[i+MX1+1]
	tx2 -= a[i+PX2+0] + a[i+MX2+0]
	ty2 -= a[i+PX2+1] + a[i+MX2+1]

	let w     = a[i+2]
	let h     = a[i+3]
	let side  = a[i+POPUP_SIDE]
	let align = a[i+POPUP_ALIGN]
	let flags = a[i+POPUP_FLAGS]

	position_popup(w, h, side, align, tx1, ty1, tx2, ty2)

	if (flags & POPUP_FIT_CHANGE_SIDE) {

		// if popup doesn't fit the screen, first try to change its side
		// or alignment and relayout, and if that doesn't work, its offset.

		let out_x1 = x < d
		let out_y1 = y < d
		let out_x2 = x + w > (bw - d)
		let out_y2 = y + h > (bh - d)

		let re
		if (side == POPUP_SIDE_BOTTOM && out_y2) {
			re = 1; side = POPUP_SIDE_TOP
		} else if (side == POPUP_SIDE_TOP && out_y1) {
			re = 1; side = POPUP_SIDE_BOTTOM
		} else if (side == POPUP_SIDE_RIGHT && out_x2) {
			re = 1; side = POPUP_SIDE_LEFT
		} else if (side == POPUP_SIDE_TOP && out_x1) {
			re = 1; side = POPUP_SIDE_BOTTOM
		}

		let vert =
				side == POPUP_SIDE_BOTTOM
			|| side == POPUP_SIDE_TOP
			|| side == POPUP_SIDE_INNER_BOTTOM
			|| side == POPUP_SIDE_INNER_TOP

		if (align == POPUP_ALIGN_END && ((vert && out_x2) || (!vert && out_y2))) {
			re = 1; align = POPUP_ALIGN_START
		} else if (align == POPUP_ALIGN_START && ((vert && out_x1) || (!vert && out_y1))) {
			re = 1; align = POPUP_ALIGN_END
		}

		if (re)
			position_popup(w, h, side, align, tx1, ty1, tx2, ty2)

	}

	// if nothing else works, adjust the offset to fit the screen.
	if (flags & POPUP_FIT_CONSTRAIN) {
		let ox2 = max(0, x + w - (bw - d))
		let ox1 = min(0, x - d)
		let oy2 = max(0, y + h - (bh - d))
		let oy1 = min(0, y - d)
		x -= ox1 ? ox1 : ox2
		y -= oy1 ? oy1 : oy2
	}

	a[i+0] = x
	a[i+1] = y

	translate_children(a, i, x, y)

}
}

function translate_all() {
	let i = 2
	let cmd = a[i-1]
	let translate_f = translate[cmd]
	translate_f(a, i, 0, 0)
}

// drawing phase -------------------------------------------------------------

draw[CMD_POPUP] = function(a, i) {

	let popup_layer = a[i+POPUP_LAYER]
	if (popup_layer != layer)
		return true

	font      = a[i+POPUP_FONT]
	font_size = a[i+POPUP_FONT_SIZE]

	cx.font = font_size + 'px ' + font
}

draw[CMD_TEXT] = function(a, i) {

	let x   = a[i+0]
	let y   = a[i+1]
	let s   = a[i+TEXT_S]
	let asc = a[i+TEXT_ASC]

	if (asc < 0) { // clip
		let w = a[i+2]
		let h = a[i+3]
		cx.save()
		cx.beginPath()
		cx.rect(x, y, w, h)
		cx.clip()
	}

	cx.textAlign = 'left'
	cx.fillStyle = color
	cx.fillText(s, x, y + abs(asc))

	if (asc < 0) {
		cx.restore()
	}

	draw_debug_box(a, i)
}

let scrollbar_rect
{
let r = [false, 0, 0, 0, 0]
scrollbar_rect = function(a, i, axis) {
	let x  = a[i+0]
	let y  = a[i+1]
	let w  = a[i+2]
	let h  = a[i+3]
	let cw = a[i+SB_CW+0]
	let ch = a[i+SB_CW+1]
	let sx = a[i+SB_SX+0]
	let sy = a[i+SB_SX+1]
	sx = max(0, min(sx, cw - w))
	sy = max(0, min(sy, ch - h))
	let psx = sx / (cw - w)
	let psy = sy / (ch - h)
	let pw = w / cw
	let ph = h / ch
	let thickness = 10
	let visible, tx, ty, tw, th
	let h_visible = pw < 1
	let v_visible = ph < 1
	let both_visible = h_visible && v_visible && 1 || 0
	if (!axis) {
		visible = h_visible
		if (visible) {
			let bw = w - both_visible * thickness
			tw = pw * bw
			th = thickness
			tx = psx * (bw - tw)
			ty = h - th
		}
	} else {
		visible = v_visible
		if (visible) {
			let bh = h - both_visible * thickness
			th = ph * bh
			tw = thickness
			ty = psy * (bh - th)
			tx = w - tw
		}
	}
	r[0] = visible
	r[1] = x + tx
	r[2] = y + ty
	r[3] = tw
	r[4] = th
	return r
}
}

draw[CMD_SCROLLBOX] = function(a, i) {

	let x = a[i+0]
	let y = a[i+1]
	let w = a[i+2]
	let h = a[i+3]

	cx.save()
	cx.beginPath()
	cx.rect(x, y, w, h)
	cx.clip()
}

draw[CMD_END] = function(a, end_i) {

	let i = a[end_i]
	if (a[i-1] == CMD_SCROLLBOX)
		cx.restore()

	if (a[i-1] == CMD_SCROLLBOX) {
		let id = a[i+SB_ID]
		for (let axis = 0; axis < 2; axis++) {

			let [visible, tx, ty, tw, th] = scrollbar_rect(a, i, axis)
			if (!visible)
				continue

			let sbar_id = id+'.scrollbar'+axis
			let cs = ui.captured(sbar_id)
			let hs = ui.hovers(sbar_id)

			cx.beginPath()
			cx.rect(tx, ty, tw, th)
			cx.fillStyle = cs && 'green' || hs && 'red' || 'gray'
			cx.fill()

		}
	}

	draw_debug_box(a, i)
}

let border_paths; {

function T  (cx, x1, y1, x2, y2, r) { cx.moveTo(x1, y1); cx.lineTo(x2, y1) }
function R  (cx, x1, y1, x2, y2, r) { cx.moveTo(x2, y1); cx.lineTo(x2, y2) }
function B  (cx, x1, y1, x2, y2, r) { cx.moveTo(x2, y2); cx.lineTo(x1, y2) }
function L  (cx, x1, y1, x2, y2, r) { cx.moveTo(x1, y2); cx.lineTo(x1, y1) }
function TB (cx, x1, y1, x2, y2, r) { cx.moveTo(x1, y1); cx.lineTo(x2, y1); cx.moveTo(x2, y2); cx.lineTo(x1, y2) }
function RL (cx, x1, y1, x2, y2, r) { cx.moveTo(x2, y1); cx.lineTo(x2, y2); cx.moveTo(x1, y2); cx.lineTo(x1, y1) }
function TR (cx, x1, y1, x2, y2, r) { cx.moveTo(x1, y1); cx.lineTo(x2-r, y1); if (r) cx.arcTo(x2, y1, x2, y1+r, r); cx.lineTo(x2, y2) }
function RB (cx, x1, y1, x2, y2, r) { cx.moveTo(x2, y1); cx.lineTo(x2, y2-r); if (r) cx.arcTo(x2, y2, x2-r, y2, r); cx.lineTo(x1, y2) }
function BL (cx, x1, y1, x2, y2, r) { cx.moveTo(x2, y2); cx.lineTo(x1+r, y2); if (r) cx.arcTo(x1, y2, x1, y2-r, r); cx.lineTo(x1, y1) }
function LT (cx, x1, y1, x2, y2, r) { cx.moveTo(x1, y2); cx.lineTo(x1, y1+r); if (r) cx.arcTo(x1, y1, x1+r, y1, r); cx.lineTo(x2, y1) }
function TRB(cx, x1, y1, x2, y2, r) { cx.moveTo(x1, y1); cx.lineTo(x2-r, y1); if (r) cx.arcTo(x2, y1, x2, y1+r, r); cx.lineTo(x2, y2-r); if (r) cx.arcTo(x2, y2, x2-r, y2, r); cx.lineTo(x1, y2) }
function RBL(cx, x1, y1, x2, y2, r) { cx.moveTo(x2, y1); cx.lineTo(x2, y2-r); if (r) cx.arcTo(x2, y2, x2-r, y2, r); cx.lineTo(x1+r, y2); if (r) cx.arcTo(x1, y2, x1, y2-r, r); cx.lineTo(x1, y1) }
function BLT(cx, x1, y1, x2, y2, r) { cx.moveTo(x2, y2); cx.lineTo(x1+r, y2); if (r) cx.arcTo(x1, y2, x1, y2-r, r); cx.lineTo(x1, y1+r); if (r) cx.arcTo(x1, y1, x1+r, y1, r); cx.lineTo(x2, y1) }
function LTR(cx, x1, y1, x2, y2, r) { cx.moveTo(x1, y2); cx.lineTo(x1, y1+r); if (r) cx.arcTo(x1, y1, x1+r, y1, r); cx.lineTo(x2-r, y1); if (r) cx.arcTo(x2, y1, x2, y1+r, r); cx.lineTo(x2, y2) }

border_paths = [noop, T, R, TR, B, TB, RB, TRB, L, LT, RL, LTR, BL, BLT, RBL]
}

let c2d = CanvasRenderingContext2D.prototype
if (!c2d.roundRect) { // Firefox doesn't have it
	c2d.roundRect = function(x1, y1, w, h, r) {
		let x2 = x1 + w
		let y2 = y1 + h
		cx.moveTo(x2-r, y1); if (r) cx.arcTo(x2, y1, x2, y1+r, r)
		cx.lineTo(x2, y2-r); if (r) cx.arcTo(x2, y2, x2-r, y2, r)
		cx.lineTo(x1+r, y2); if (r) cx.arcTo(x1, y2, x1, y2-r, r)
		cx.lineTo(x1, y1+r); if (r) cx.arcTo(x1, y1, x1+r, y1, r)
		cx.closePath()
	}
}

function border_path(cx, x1, y1, x2, y2, sides, radius) {
	cx.beginPath()
	if (sides == BORDER_SIDE_ALL)
		if (!radius)
			cx.rect(x1, y1, x2-x1, y2-y1)
		else
			cx.roundRect(x1, y1, x2-x1, y2-y1, radius)
	else
		border_paths[sides](cx, x1, y1, x2, y2, radius)
}

let shadow_set
draw[CMD_SHADOW] = function(a, i) {
	cx.shadowColor   = a[i+0]
	cx.shadowBlur    = a[i+1]
	cx.shadowOffsetX = a[i+2]
	cx.shadowOffsetY = a[i+3]
	shadow_set = true
}

draw[CMD_BB] = function(a, i) {
	let ct_i = a[i+1]
	let px1 = a[ct_i+PX1+0]
	let py1 = a[ct_i+PX1+1]
	let px2 = a[ct_i+PX2+0]
	let py2 = a[ct_i+PX2+1]
	let x   = a[ct_i+0] - px1
	let y   = a[ct_i+1] - py1
	let w   = a[ct_i+2] + px1 + px2
	let h   = a[ct_i+3] + py1 + py2
	let bg_color      = a[i+2]
	let border_sides  = a[i+3]
	let border_color  = a[i+4]
	let border_radius = a[i+5]
	if (bg_color != null) {
		cx.fillStyle = bg_color
		border_path(cx, x, y, x + w, y + h, BORDER_SIDE_ALL, border_radius)
		cx.fill()
	}
	if (shadow_set) {
		cx.shadowBlur    = 0
		cx.shadowOffsetX = 0
		cx.shadowOffsetY = 0
		shadow_set = false
	}
	if (border_sides) {
		cx.strokeStyle = border_color
		cx.lineWidth = 1
		cx.lineCap = 'square'
		border_path(cx, x + .5, y + .5, x + w - .5, y + h - .5, border_sides, border_radius)
		cx.stroke()
	}
}

draw[CMD_COLOR] = function(a, i) {
	color = a[i]
}

draw[CMD_FONT] = set_font
draw[CMD_FONT_SIZE] = set_font_size

function draw_all() {
	for (layer of a.layers) {
		for (let i of layer) {
			let next_ext_i = get_next_ext_i(a, i)
			check_stacks()
			reset_all()
			while (i < next_ext_i) {
				let draw_f = draw[a[i-1]]
				if (draw_f && draw_f(a, i))
					i = get_next_ext_i(a, i)
				else
					i = a[i-2] // next_i
			}
			check_stacks()
		}
	}
}

// hit-testing phase ---------------------------------------------------------

let hit_set = set() // {id}

let hit_state_map_freelist = map_freelist()
let hit_state_maps = map() // {id->map}

function hit_set_id(id) {
	if (id)
		hit_set.add(id)
}

ui.hit = function(id) {
	return hit_set.has(id)
}

ui.hovers = function(id) {
	if (!id)
		return
	if (!ui.hit(id))
		return
	let m = hit_state_maps.get(id)
	if (!m) {
		m = hit_state_map_freelist()
		hit_state_maps.set(id, m)
	}
	return m
}

function hit_rect(x, y, w, h) {
	return (
		(mx >= x && mx < x + w) &&
		(my >= y && my < y + h)
	)
}

function hit_box(a, i) {
	let x = a[i+0]
	let y = a[i+1]
	let w = a[i+2]
	let h = a[i+3]
	return hit_rect(x, y, w, h)
}

hit[CMD_TEXT] = function(a, i) {
	let x = a[i+0]
	let y = a[i+1]
	let w = a[i+2]
	let h = a[i+3]
	if (hit_rect(x, y, w, h)) {
		hit_set_id(a[i+TEXT_ID])
		hit_template(a, i, x, y, w, h)
		return true
	}
}

function hit_children(a, i) {

	// hit direct children in reverse paint order.
	let ct_i = i
	let next_ext_i = get_next_ext_i(a, i)
	let end_i = a[next_ext_i-3] // prev_i
	i = a[end_i-3] // prev_i
	let found
	while (i > ct_i) {
		if (a[i-1] == CMD_END)
			i = a[i] // start_i
		let hit_f = hit[a[i-1]]
		if (hit_f && hit_f(a, i)) {
			found = true
			break
		}
		i = a[i-3] // prev_i
	}

	return found
}

hit[CMD_SCROLLBOX] = function(a, i) {
	let id = a[i+SB_ID]
	if (!id)
		return

	let x = a[i+0]
	let y = a[i+1]
	let w = a[i+2]
	let h = a[i+3]

	// fast-test the outer box since we're clipping the contents.
	if (!hit_rect(x, y, w, h))
		return

	hit_set_id(id)

	hit_template(a, i, x, y, w, h)

	// test the scrollbars
	for (let axis = 0; axis < 2; axis++) {
		let [visible, tx, ty, tw, th] = scrollbar_rect(a, i, axis)
		if (!visible)
			continue
		if (!hit_rect(tx, ty, tw, th))
			continue
		hit_set_id(id+'.scrollbar'+axis)
		return true
	}

	// test the children
	hit_children(a, i)

	return true
}

hit[CMD_POPUP] = function(a, i) {

	let popup_layer = a[i+POPUP_LAYER]
	if (popup_layer != layer)
		return

	return hit_children(a, i)
}

function hit_flex(a, i) {
	if (hit_children(a, i))
		return true
	let x = a[i+0]
	let y = a[i+1]
	let w = a[i+2]
	let h = a[i+3]
	if (hit_rect(x, y, w, h))
		hit_template(a, i, x, y, w, h)
}

hit[CMD_H] = hit_flex
hit[CMD_V] = hit_flex

hit[CMD_STACK] = function(a, i) {
	if (hit_children(a, i)) {
		hit_set_id(a[i+STACK_ID])
		return true
	}
	if (hit_box(a, i)) {
		hit_set_id(a[i+STACK_ID])
		let x = a[i+0]
		let y = a[i+1]
		let w = a[i+2]
		let h = a[i+3]
		hit_template(a, i, x, y, w, h)
		return true
	}
}

hit[CMD_BB] = function(a, i) {
	let ct_i = a[i+1]
	let px1 = a[ct_i+PX1+0]
	let py1 = a[ct_i+PX1+1]
	let x = a[ct_i+0] - px1
	let y = a[ct_i+1] - py1
	let w = a[ct_i+2] + px1 + px2
	let h = a[ct_i+3] + py1 + py2
	if (hit_rect(x, y, w, h)) {
		hit_set_id(a[i+BB_ID])
		hit_template(a, i, x, y, w, h)
		return true
	}
}

function hit_all() {

	hit_template_id = null
	hit_template_i0 = null
	hit_template_i1 = null

	for (let m of hit_state_maps.values())
		hit_state_map_freelist(m)
	hit_state_maps.clear()
	hit_set.clear()

	if (mx == null)
		return

	// iterate layers in reverse order.
	for (let j = a.layers.length-1; j >= 0; j--) {
		layer = a.layers[j]
		// iterate layer's cointainers in reverse order.
		for (let k = layer.length-1; k >= 0; k--) {
			reset_all()
			let i = layer[k]
			let hit_f = hit[a[i-1]]
			if (hit_f(a, i)) {
				j = -1
				break
			}
		}
	}
	layer = null

}

// animation frame -----------------------------------------------------------

let want_redraw = true

ui.redraw = function() {
	want_redraw = true
}

function redraw_all() {
	while (want_redraw) {
		want_redraw = false
		a.length = 0
		for (let layer of a.layers)
			layer_clear(layer)
		check_stacks()

		let i = ui.stack()
		begin_layer(layer_base, i)
		make_frame()
		ui.end()
		end_layer()
		id_state_gc()

		measure_all(0); position_all(0) // x-axis
		measure_all(1); position_all(1) // y-axis
		translate_all()

		if (!want_redraw)
			draw_all()
		reset_all()
		reset_mouse()
	}
}

reset_all()

// template widget -----------------------------------------------------------

let targs = {}
let tprops = {}

targs.text  = function(t) { return [t.id, t.s, t.align, t.valign, t.fr] }
targs.h     = function(t) { return [t.fr, t.gap, t.align, t.valign, t.min_w, t.min_h] }
targs.v     = targs.h
targs.stack = function(t) { return [t.id, t.fr, t.align, t.valign, t.min_w, t.min_h] }
targs.bb    = function(t) { return [t.id, t.bg_color, t.sides, t.border_color, t.border_radius] }

tprops.text = {
	id     : {type: 'id'  , },
	s      : {type: 'text', },
	align  : {type: 'enum', enum_values: 's c l r', default: 'l'},
	valign : {type: 'enum', enum_values: 's c t b', default: 'c'},
	fr     : {type: 'fr'  , },
}

tprops.h = {
	fr     : {type: 'fr'  , },
	gap    : {type: 'size', },
	align  : {type: 'enum', enum_values: 's c l r', default: 's'},
	valign : {type: 'enum', enum_values: 's c t b', default: 's'},
	min_w  : {type: 'size', default: 0},
	min_h  : {type: 'size', default: 0},
}
tprops.v = tprops.h

tprops.stack = {
	id     : {type: 'id'  , },
	fr     : {type: 'fr'  , },
	align  : {type: 'enum', enum_values: 's c l r', default: 's'},
	valign : {type: 'enum', enum_values: 's c t b', default: 's'},
	min_w  : {type: 'size', default: 0},
	min_h  : {type: 'size', default: 0},
}

tprops.bb = {
	id            : {type: 'id'   , },
	bg_color      : {type: 'color', },
	sides         : {type: 'enum' , enum_values: 't r b l tb rl tr rb lt bl -l -b -r -t all', default: 'all'},
	bg_color      : {type: 'color', },
	border_color  : {type: 'color', },
	border_radius : {type: 'size' , default: 0},
}

let hit_template_id
let hit_template_i0
let hit_template_i1
let selected_template_id
let selected_template_root_t
let selected_template_node_t
let selected_template_node_i

function template_select_node(id, root_t, node_t, node_i) {
	selected_template_id = id
	selected_template_root_t = root_t
	selected_template_node_t = node_t
	selected_template_node_i = node_i
	ui.redraw()
}

function template_find_node(a, i, t, t_i) {
	if (i == t_i)
		return t
	if (t.e) {
		let ch_t_i = a[t_i-2] // next_i
		for (let ch_t of t.e) {
			let found_t = template_find_node(a, i, ch_t, ch_t_i)
			if (found_t)
				return found_t
			ch_t_i = get_next_ext_i(a, ch_t_i)
		}
	}
}
function hit_template(a, i, x, y, w, h) {
	let id = hit_template_id
	if (id && i >= hit_template_i0 && i < hit_template_i1) {
		let hs = ui.hovers(id)
		let root_t = hs.get('root')
		let node_t = template_find_node(a, i, root_t, hit_template_i0)
		hs.set('node', node_t)
		if (clickup)
			template_select_node(id, root_t, node_t, i)
		return true
	}
}

function template_add(t) {
	let cmd = cmd_name_map.get(t.t)
	let targs_f = assert(targs[t.t], 'unknown type {0}', t.t)
	let args = targs_f(t)
	t.i = a.length + 2
	ui[t.t](...args)
	if (t.e)
		for (let ch_t of t.e)
			template_add(ch_t, 0)
	if (cmd < 0)
		ui.end()
}

function template_drag_point(id, ch_t, ch_i, ha, va) {
	let ct_i = ch_i
	if (a[ct_i-1] == CMD_BB)
		ct_i = a[ct_i+BB_CT_I]
	ui.popup('', layer_handle, ct_i, ha, va)
		ui.drag_point(id+'.'+ha+va, 0, 0, 'red')
	ui.end_popup()
}

ui.template = function(id, t, ...stack_args) {
	ui.stack('', ...stack_args)
	let i0 = a.length+2 // index of first cmd's arg#1
	template_add(t)
	let i1 = a.length+2 // index of next cmd's arg#1
	ui.template_overlay(id, t, i0, i1)
	let ch_t = selected_template_node_t
	let ch_i = selected_template_node_i
	if (t == selected_template_root_t) {
		template_editor(id, t, ch_t)
		template_drag_point(id, ch_t, ch_i, 'l', '[')
		template_drag_point(id, ch_t, ch_i, 'l', 'c')
		template_drag_point(id, ch_t, ch_i, 'l', ']')
		template_drag_point(id, ch_t, ch_i, 'r', '[')
		template_drag_point(id, ch_t, ch_i, 'r', 'c')
		template_drag_point(id, ch_t, ch_i, 'r', ']')
	}
	ui.end_stack()
}

ui.box_widget('template_overlay', {
	create: function(cmd, id, t, i0, i1) {
		return ui_cmd_box(cmd, 1, 's', 's', 0, 0, id, t, i0, i1)
	},
	hit: function(a, i) {
		let id = a[i+S-1]
		let t  = a[i+S+0]
		let i0 = a[i+S+1]
		let i1 = a[i+S+2]
		if (hit_box(a, i)) {
			hit_template_id = id
			hit_template_i0 = i0
			hit_template_i1 = i1
			hit_set_id(id)
			let hs = ui.hovers(id)
			hs.set('root', t)
		}
	},
	draw: function(a, i) {
		let id = a[i+S-1]
		let sel_id = selected_template_id
		if (sel_id && sel_id == id) {
			let t = selected_template_node_t
			let i = t.i
			if (a[i-1] == CMD_BB)
				i = a[i+BB_CT_I]
			let x = a[i+0]
			let y = a[i+1]
			let w = a[i+2]
			let h = a[i+3]
			cx.strokeStyle = 'magenta'
			cx.lineWidth = 1
			cx.beginPath()
			cx.rect(
				x + .5,
				y + .5,
				w - .5,
				h - .5,
			)
			cx.stroke()

		}
	},
})

function draw_node(id, t_t, t, depth) {
	ui.m(depth * 20, 0, 0, 0)
	//ui.stack('', 1)
		//ui.bb('', 'blue')
		let hit = ui.hit(t)
		if (hit && click)
			template_select_node(id, t_t, t)
		ui.begin_color(hit ? '#fff' : '#ccc')
		ui.text(t, t.t, 'l', 'c', 1)
		ui.end_color()
	//ui.end()
	if (t.e)
		for (let ct of t.e)
			draw_node(id, t_t, ct, depth+1)
}
function template_editor(id, t, ch_t) {

	ui.begin_toolbox(id+'.tree_toolbox', 'Tree', ']', 100, 100)
		ui.scrollbox(id+'.tree_toolbox_sb', 1, null, null, null, null, 200, 200)
			ui.bb('', '#ccc')
			ui.p(10)
			ui.v(1, 10, 's', 't')
				ui.bb('', '#333')
				draw_node(id, t, t, 0)
			ui.end_v()
		ui.end_scrollbox()
	ui.end_toolbox(id+'.tree_toolbox')

	ui.begin_toolbox(id+'.prop_toolbox', 'Props', ']', 100, 400)
		ui.scrollbox(id+'.prop_toolbox_sb', 1, null, null, null, null, 200, 200)
			ui.font_size(14)
			ui.v(1, 0, 's', 't')
			ui.bb('', '#333')
			let defs = tprops[ch_t.t]
			for (let k in defs) {
				let def = defs[k]
				let v = ch_t[k]
				ui.h()
					ui.bb('', null, 'b', '#666')
					let vs = v != null ? str(v) : (def.default ?? '')
					ui.mb(1)
					ui.p(8, 8, 5, 5)
					ui.text('', k , 'l', null, 1, 20)
					ui.mb(1)
					ui.p(8, 8, 5, 5)
					ui.stack()
						ui.bb('', v, 'l', '#888')
						if (def.type == 'color') {
							ui.bb('', v, 'l', '#888')
						} else {
							ui.begin_color(v != null ? '#fff' : '#888')
							ui.text('', vs, 'l', null, 1, 20)
							ui.end_color()
						}
					ui.end_stack()
				ui.end_h()
			}
			ui.end_v()
		ui.end_scrollbox()
	ui.end_toolbox(id+'.prop_toolbox')

}

// drag point widget ---------------------------------------------------------

ui.widget('drag_point', {
	create: function(cmd, id, cx, cy, color, on_drag) {
		let hit = ui.hit(id)
		return ui_cmd(cmd, cx, cy, color, id, on_drag)
	},
	position: function(a, i, axis, sx, sw) {
		a[i+0+axis] = sx
	},
	translate: function(a, i, dx, dy) {
		a[i+0] += dx
		a[i+1] += dy
	},
	draw: function(a, i) {
		let r = 5
		let x     = a[i+0]
		let y     = a[i+1]
		let color = a[i+2]
		cx.fillStyle = color
		cx.beginPath()
		cx.rect(x-r, y-r, 2*r, 2*r)
		cx.fill()
	},
	hit: function(a, i) {
		let r = 5
		let x  = a[i+0]
		let y  = a[i+1]
		let id = a[i+3]
		if (hit_rect(x-r, y-r, 2*r, 2*r)) {
			hit_set_id(id)
			return true
		}
	},
})

// drag & drop ---------------------------------------------------------------

{
let out = [0, 0]
ui.drag = function(id, move, dx0, dy0) {
	let move_x = !move || move == 'x' || move == 'xy'
	let move_y = !move || move == 'y' || move == 'xy'
	let dx = dx0 ?? 0
	let dy = dy0 ?? 0
	let cs = ui.captured(id)
	let state
	if (cs) {
		if (move_x) { dx = cs.get('drag_x0') + (mx - mx0) }
		if (move_y) { dy = cs.get('drag_y0') + (my - my0) }
		state = clickup ? 'drop' : 'dragging'
	} else if (ui.hit(id)) {
		if (click) {
			let cs = ui.capture(id)
			if (cs) {
				if (move_x) cs.set('drag_x0', dx)
				if (move_y) cs.set('drag_y0', dy)
				state = 'drag'
			}
		} else
			state = 'hover'
	}
	out[0] = state
	out[1] = dx
	out[2] = dy
	return out
}
}

// toolbox widget ------------------------------------------------------------

ui.begin_toolbox = function(id, title, align, x0, y0) {

	let align_start = parse_align(align || '[') == ALIGN_START
	let [dstate, dx, dy] = ui.drag(id+'.title')
	let s = ui.state(id)
	let mx1 =  align_start ? (s.get('mx1') ?? x0) + dx : 0
	let mx2 = !align_start ? (s.get('mx2') ?? x0) - dx : 0
	let my1 = (s.get('my1') ?? y0) + dy
	let my2 = (s.get('my2') ?? y0) - dy
	let min_w = s.get('min_w')
	let min_h = s.get('min_h')
	if (dstate == 'drop') {
		s.set('mx1', mx1)
		s.set('mx2', mx2)
		s.set('my1', my1)
		s.set('my2', my2)
	}

	ui.m(mx1, mx2, my1, my2)
	ui.popup(id+'.popup', layer_popup, null, 'it', align, min_w, min_h, 'move')
		ui.p(1)
		ui.bb('', null, 1, 'red')
		ui.stack()
			ui.v() // title / body split
				ui.h(0) // title bar
					ui.bb(id+'.title', 'red')
					ui.p(5)
					ui.text('', title)
				ui.end_h()
}

ui.end_toolbox = function(id) {
			ui.end_v()
			ui.resizer(id)
		ui.end_stack()
	ui.end_popup()
}

// all-sides resizer widget --------------------------------------------------

{
// check if a point (x0, y0) is inside rect (x, y, w, h)
// offseted by d1 internally and d2 externally.
let hit = function(x0, y0, d1, d2, x, y, w, h) {
	x = x - d1
	y = y - d1
	w = w + d1 + d2
	h = h + d1 + d2
	return x0 >= x && x0 <= x + w && y0 >= y && y0 <= y + h
}

function hit_sides(x0, y0, d1, d2, x, y, w, h) {
	if (hit(x0, y0, d1, d2, x, y, 0, 0))
		return 'top_left'
	else if (hit(x0, y0, d1, d2, x + w, y, 0, 0))
		return 'top_right'
	else if (hit(x0, y0, d1, d2, x, y + h, 0, 0))
		return 'bottom_left'
	else if (hit(x0, y0, d1, d2, x + w, y + h, 0, 0))
		return 'bottom_right'
	else if (hit(x0, y0, d1, d2, x, y, w, 0))
		return 'top'
	else if (hit(x0, y0, d1, d2, x, y + h, w, 0))
		return 'bottom'
	else if (hit(x0, y0, d1, d2, x, y, 0, h))
		return 'left'
	else if (hit(x0, y0, d1, d2, x + w, y, 0, h))
		return 'right'
}

let cursors = {
	bottom       : 'ns-resize',
	right        : 'ew-resize',
	bottom_right : 'nwse-resize',
	// TODO:
	//top          : 'ns-resize',
	//left         : 'ew-resize',
	//top_left     : 'nwse-resize',
	//top_right    : 'nesw-resize',
	//bottom_left  : 'nesw-resize',
}

ui.widget('resizer', {
	create: function(cmd, ct_id, id) {
		id = id || ct_id+'.resizer'
		return ui_cmd_box(cmd, 1, 's', 's', 0, 0, id, ct_id)
	},
	position: function(a, i, axis, x, w) {
		a[i+0+axis] = x
		a[i+2+axis] = w
	},
	translate: function(a, i, dx, dy) {
		a[i+0] += dx
		a[i+1] += dy
	},
	hit: function(a, i) {

		let x = a[i+0]
		let y = a[i+1]
		let w = a[i+2]
		let h = a[i+3]

		let id    = a[i+S-1]
		let ct_id = a[i+S+0]

		let borders = 2

		let side = hit_sides(mx, my, 5, 5, x, y, w, h)
		if (side) {
			hit_set_id(id)
			let rs = ui.hovers(id)
			rs.set('side', side)
			rs.set('measured_x', x)
			rs.set('measured_y', y)
			rs.set('measured_w', w + borders)
			rs.set('measured_h', h + borders)
		}

		let [dstate, dx, dy] = ui.drag(id)
		let hs = ui.hovers(id)
		let cs = ui.captured(id)
		set_cursor()
		if (dstate == 'hover') {
			let side = hs.get('side')
			set_cursor(cursors[side])
			return true
		}
		if (dstate == 'drag') {
			let side = hs.get('side')
			set_cursor(cursors[side])
			cs.set('side', side)
			if (side == 'right' || side == 'bottom_right') {
				let min_w = hs.get('measured_w')
				cs.set('min_w', min_w)
			}
			if (side == 'bottom' || side == 'bottom_right') {
				let min_h = hs.get('measured_h')
				cs.set('min_h', min_h)
			}
		}
		if (dstate == 'drag' || dstate == 'dragging' || dstate == 'drop') {
			let side = cs.get('side')
			set_cursor(cursors[side])
			if (side == 'right' || side == 'bottom_right') {
				let min_w = cs.get('min_w')
				ui.state(ct_id).set('min_w', min_w + dx)
			}
			if (side == 'bottom' || side == 'bottom_right') {
				let min_h = cs.get('min_h')
				ui.state(ct_id).set('min_h', min_h + dy)
			}
		}

	},
})

}

// color picker --------------------------------------------------------------

// hsl is in (0..360, 0..1, 0..1)
function h2rgb(m1, m2, h) {
	if (h<0) h = h+1
	if (h>1) h = h-1
	if (h*6<1)
		return m1+(m2-m1)*h*6
	else if (h*2<1)
		return m2
	else if (h*3<2)
		return m1+(m2-m1)*(2/3-h)*6
	else
		return m1
}
function hsl_to_rgb(d, i, h, s, L) {
	h = h / 360
	let m2 = L <= .5 ? L*(s+1) : L+s-L*s
	let m1 = L*2-m2
	d[i+0] = 255 * h2rgb(m1, m2, h+1/3)
	d[i+1] = 255 * h2rgb(m1, m2, h)
	d[i+2] = 255 * h2rgb(m1, m2, h-1/3)
	d[i+3] = 255
}

function get_idata(s, key, w, h) {
	let idata = s.get(key)
	if (!idata
		|| s.get(key+'.w') != w
		|| s.get(key+'.h') != h
	) {
		idata = cx.createImageData(w, h)
		s.set(key, idata)
		s.set(key+'.w', w)
		s.set(key+'.h', h)
	}
	return idata
}

function draw_cross(x0, y0, w, h, sat, lum, color) {
	if (sat == null) return
	let x = round(x0 + lerp(sat, 0, 1, 0, w-1)) + .5
	let y = round(y0 + lerp(lum, 0, 1, 0, h-1)) + .5
	let d = 10
	cx.strokeStyle = color
	cx.lineWidth = 1
	cx.beginPath()
	cx.moveTo(x, y); cx.lineTo(x+d, y)
	cx.moveTo(x, y); cx.lineTo(x-d, y)
	cx.moveTo(x, y); cx.lineTo(x, y+d)
	cx.moveTo(x, y); cx.lineTo(x, y-d)
	cx.stroke()
}

function draw_hsl_square(s, x, y, w, h, hue, hit_sat, hit_lum, sel_sat, sel_lum) {

		let idata = get_idata(s, 'hsl_square', w, h)

		if (idata.hue != hue) {
			let d = idata.data
			let w = idata.width
			let h = idata.height
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					let sat = lerp(x, 0, w-1, 0, 1)
					let lum = lerp(y, 0, h-1, 1, 0)
					hsl_to_rgb(d, (y * w + x) * 4, hue, sat, lum)
				}
			}
			idata.hue = hue
		}

		cx.putImageData(idata, x, y)

		draw_cross(x, y, w, h, hit_sat, hit_lum, '#888')
		draw_cross(x, y, w, h, sel_sat, sel_lum, '#000')
}

function draw_hue_line(x, y, h, w, hue, color) {
	if (hue == null) return
	cx.strokeStyle = color
	cx.lineWidth = 1
	cx.beginPath()
	let hue_y = lerp(hue, 0, 360, 0, h-1)
	cx.moveTo(x    , y + hue_y - 1 + .5)
	cx.lineTo(x + w, y + hue_y - 1 + .5)
	cx.stroke()
}

function draw_hue_bar(s, x, y, w, h, hit_hue, sel_hue) {

		let idata = get_idata(s, 'hue_bar', w, h)

		if (!idata.ready) {
			let d = idata.data
			let w = idata.width
			let h = idata.height
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					let hue = lerp(y, 0, h-1, 0, 360)
					hsl_to_rgb(d, (y * w + x) * 4, hue, 1, .5)
				}
			}
			idata.ready = true
		}

		cx.putImageData(idata, x, y)

		draw_hue_line(x, y, h, w, hit_hue, '#888')
		draw_hue_line(x, y, h, w, sel_hue, '#000')
}

{
let w = 256
let h = 256
ui.box_widget('color_picker', {

	create: function(cmd, id) {
		return ui_cmd_box(cmd, 1, 'c', 'c', 200, 200, id)
	},

	draw: function(a, i) {

		let x = a[i+0]
		let y = a[i+1]
		let sw = a[i+2]
		let sh = a[i+3]
		let id = a[i+S-1]
		let s = ui.state(id)

		let hs = ui.hovers(id)
		let hit = hs && hs.get('hit')

		if (click) {
			if (hit == 'hue_bar') {
				s.set('hue', hs.get('hue'))
			} else if (hit == 'hsl_square') {
				s.set('sat', hs.get('sat'))
				s.set('lum', hs.get('lum'))
			}
		}

		draw_hsl_square(s, x, y, w, h,
			s.get('hue'),
			hs?.get('sat'),
			hs?.get('lum'),
			s.get('sat'),
			s.get('lum'),
		)
		draw_hue_bar(s, x+w+10, y, 20, h,
			hs?.get('hue'),
			s.get('hue'),
		)

	},

	hit: function(a, i) {
		let id = a[i+S-1]
		let x = a[i+0]
		let y = a[i+1]

		if (hit_rect(x, y, w, h)) {
			hit_set_id(id)
			let hs = ui.hovers(id)
			hs.set('hit', 'hsl_square')
			hs.set('sat', lerp(mx - x, 0, w-1, 0, 1))
			hs.set('lum', lerp(my - y, 0, h-1, 0, 1))
			return true
		}

		if (hit_rect(x+w+10, y, 20, w)) {
			hit_set_id(id)
			let hs = ui.hovers(id)
			hs.set('hit', 'hue_bar')
			hs.set('hue', lerp(my-y, 0, h-1, 0, 360))
			return true
		}

	},

})
}

// testbed -------------------------------------------------------------------

let test_template = {
	t: 'v', fr: 2, gap: 20, e: [
		{t: 'text', id: 't1', s: 'TP Hello!'},
		{t: 'stack', id: 'st1', fr: 1, e: [
			{t: 'bb', id: 'r1', bg_color: 'hsl(120deg 50% 16%)'},
		]},
	]}

function make_frame() {

	ui.font('Arial')
	ui.font_size(16)

	ui.m(50, null, 50)
	ui.h(1, 20)
		ui.text('t1', 'Hello1!')
		ui.stack('', 1)
			ui.bb('', 'hsl(0deg 0% 16%)')
			if (1) {
			ui.scrollbox('sb1', 1)
				ui.m(50, 50, 0, 0)
				ui.p(20)
				ui.v(1, 20, 'c', 'c')
					// ui.bg('hsl(0deg 0% 16%)')
					ui.shadow('black', 5, 2, 2)
					ui.bb('', 'blue', 1, 'hsl(0 0% 100%)', 20)
					// ui.padding(10, 10, 10, 10)
					ui.text('t2', '[Hello Hello Hello Hello Hello]', '[', 'c', 1)
					// ui.padding(10, 10, 10, 10)
					ui.text('t3', ( max_frame_duration * 1000).dec(1)+' ms', '[', 'c', 1)
					ui.text('t4', (last_frame_duration * 1000).dec(1)+' ms', '[', 'c', 1)
					if (1) {
						ui.m(0, 0, -20, 0)
						ui.popup('p1', layer_popup, null, 'b')
							ui.bb('', 'hsl(0 100% 50% / .5)', 1, 'hsl(0 0% 100%)', 5)
							ui.p(20)
							ui.text('tp1', 'Wasup?')
						ui.end_popup()
					}
				ui.end_v()
			ui.end_scrollbox()
			}
		ui.end_stack()
		ui.m(10)
		ui.p(10)
		ui.stack()
			ui.bb('', 'blue')
			ui.color_picker('cp1')
		ui.end_stack()
		if (0) {
		ui.stack('', 1, 'c', 'c')
			ui.bb('', null, 'blt', 'red', 10)
			ui.text('t4', 'Hello Again!', 'c', 'c', 1)
		ui.end_stack()
		}
		ui.template('tpl1', test_template)
		// ui.text('t3', '...and again.', 'c', 'c', 1)
	ui.end_h()

	// redraw()

}

// debugging -----------------------------------------------------------------

function draw_debug_box(a, i) {
	if (!DEBUG) return
	// if (a[i-1] != CMD_POPUP) return
	let x = a[i+0]
	let y = a[i+1]
	let w = a[i+2]
	let h = a[i+3]
	let mx1 = a[i+MX1+0]
	let my1 = a[i+MX1+1]
	let mx2 = a[i+MX2+0]
	let my2 = a[i+MX2+1]
	let px1 = a[i+PX1+0]
	let py1 = a[i+PX1+1]
	let px2 = a[i+PX2+0]
	let py2 = a[i+PX2+1]
	cx.beginPath()
	cx.fillStyle = 'hsl(240deg 100% 50% / .4)'
	cx.rect(x, y, w, h)
	cx.fill()
	cx.beginPath()
	cx.fillStyle = 'hsl(120deg 100% 50% / .4)'
	cx.rect(x+mx1, y+my1, w-mx1-mx2, h-my1-my2)
	cx.fill()
	cx.beginPath()
	cx.fillStyle = 'hsl(0deg 100% 50% / .4)'
	cx.rect(x+mx1+px1, y+my1+py1, w-mx1-mx2-px1-px2, h-my1-my2-py1-py2)
	cx.fill()
}

function pr_layer(a) {
	let i = 2
	let depth = 0
	let n = a.length
	let pr1 = pr
	while (i < n) {
		let cmd = a[i-1]
		if (cmd == CMD_END)
			depth--
		let indent = (' ').repeat(depth)
		let cmd_s = cmd_names[cmd]
		if (cmd < 0) {
			let next_ext_i = a[i+NEXT_EXT_I]
			let next_ext_cmd_s = cmd_names[a[next_ext_i-1]]
			pr1(indent + '(' + cmd_s, i)
			depth++
		} else if (cmd == CMD_END) {
			pr1(indent + ')', i)
		} else {
			pr1(indent + cmd_s, i)
		}
		let next_i = a[i-2]
		i = next_i
	}
	assert(depth == 0)
}

resize_canvas()

}()) // module function
