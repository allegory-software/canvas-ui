/*

	Canvas IMGUI library with flexbox, widgets and UI designer.
	Written by Cosmin Apreutesei. Public Domain.

*/

(function () {
"use strict"
let G = window

// declare `ui = window` to get rid of the ui namespace.
let ui = G.ui || {}
G.ui = ui

ui.DEBUG = 0

// utilities ------------------------------------------------------------------

// single-value filter.
let repl = function(x, v, z) { return x === v ? z : x }

let isarray = Array.isArray
let isstr = s => typeof s == 'string'
let isnum = n => typeof n == 'number'
let isbool = b => typeof b == 'boolean'
let isfunc = f => typeof f == 'function'

function assert(ret, ...args) {
	if (!ret)
		throw (args.length ? args.join('') : 'assertion failed')
	return ret
}
ui.assert = assert

let pr = console.log
let trace = console.trace

let floor = Math.floor
let ceil  = Math.ceil
let round = Math.round
let max   = Math.max
let min   = Math.min
let abs   = Math.abs

// NOTE: returns x1 if x1 < x0, which enables the idiom
// `a[clamp(i, 0, b.length-1)]` to return undefined when b is empty.
function clamp(x, x0, x1) {
	return min(max(x, x0 ?? -1/0), x1 ?? 1/0)
}

function lerp(x, x0, x1, y0, y1) {
	return y0 + (x-x0) * ((y1-y0) / (x1 - x0))
}

function dec(x, d) { return x.toFixed(d) }

function num(s) {
	let x = parseFloat(s)
	return x != x ? undefined : x
}

let str = String

let obj = () => Object.create(null)
let set = (iter) => new Set(iter)
let map = (iter) => new Map(iter)

let assign = Object.assign

function noop() {}

let json = JSON.stringify

function clock() { return performance.now() / 1000 }

function memoize(f) {
	let t = map()
	return function(x) {
		if (t.has(x))
			return t.get(x)
		let y = f(x)
		t.set(x, y)
		return y
	}
}

function hash32(s) {
	let hash = 0
	for (let i = 0, n = s.length; i < n; i++) {
		hash = ((hash << 5) - hash) + s.charCodeAt(i)
		hash |= 0 // convert to 32bit integer
	}
	return hash
}

function freelist(cons) {
	let fl = []
	return function(o) {
		if (o) {
			o.clear()
			fl.push(o)
		} else {
			o = fl.pop()
			return o || cons()
		}
	}
}

function map_freelist() {
	return freelist(map)
}

// when using capture_pointer(), setting the cursor for the element that
// is hovered doesn't work anymore, so use this hack instead.
{
let style = document.createElement('style')
document.documentElement.appendChild(style)
ui.set_cursor = function(cursor) {
	// TODO: use style API here, it's probably faster.
	style.innerHTML = cursor && captured_id ? `* {cursor: ${cursor} !important; }` : ''
	canvas.style.cursor = cursor ?? 'initial'
}
}

// styles --------------------------------------------------------------------

{
let style = document.createElement('style')
document.documentElement.appendChild(style)
style.innerHTML = `

* { box-sizing: border-box; }

html, body {
	width: 100%;
	height: 100%;
	padding: 0;
	margin: 0;
	border: 0;
	overflow: hidden;
}

body {
	display: flex;
}

.ui-screen {
	position: relative; /* all inner elements are positioned relative to it */
	overflow: hidden; /* because hidden <input> elements go out of screen */
	flex: 1; /* stretch it */
}

.ui-canvas {
	position: absolute;
}

.ui-input, .ui-input:focus {
	position: absolute;
	padding: 0;
	margin: 0;
	border: 0;
	background: none;
	outline: none;
}
`
}

// colors --------------------------------------------------------------------

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
function hsl_to_rgba(d, i, h, s, L, a) {
	h = h / 360
	let m2 = L <= .5 ? L*(s+1) : L+s-L*s
	let m1 = L*2-m2
	d[i+0] = 255 * h2rgb(m1, m2, h+1/3)
	d[i+1] = 255 * h2rgb(m1, m2, h)
	d[i+2] = 255 * h2rgb(m1, m2, h-1/3)
	d[i+3] = a ?? 255
}

ui.hsl = function(h, s, L, a) {
	return `hsla(${dec(h)}, ${dec(s * 100)}%, ${dec(L * 100)}%, ${a ?? 1})`
}

ui.hsl_adjust = function(c, h, s, L, a) {
	return ui.hsl(c[1] * h, c[2] * s, c[3] * L, c[4] * a)
}
// themes --------------------------------------------------------------------

ui.scrollbar_thickness = 6
ui.scrollbar_thickness_active = 12

function array_of_arrays(n) {
	let a = []
	for (let i = 0; i < n; i++)
		a.push([])
	return a
}

function theme_make(name, default_color) {
	themes[name] = {
		name   : name,
		default_color : default_color,
		scrollbar_thickness        : ui.scrollbar_thickness,
		scrollbar_thickness_active : ui.scrollbar_thickness_active,
		fg     : array_of_arrays(63),
		border : array_of_arrays(63),
		bg     : array_of_arrays(63),
		shadow : [],
	}
}
let themes = {}
theme_make('light', 'black')
theme_make('dark' , 'white')

let theme

ui.dark_mode = function(on) {
	theme = on ? themes.dark : themes.light
	ui.redraw()
}

// state parsing -------------------------------------------------------------

const STATE_NORMAL        =  0
const STATE_HOVER         =  1
const STATE_ACTIVE        =  2
const STATE_FOCUSED       =  4
const STATE_ITEM_SELECTED =  8
const STATE_ITEM_FOCUSED  = 16
const STATE_ITEM_ERROR    = 32

let parse_state_combis = memoize(function(s) {
	s = ' '+s
	let b = 0
	if (s.includes(' normal'       )) b |= STATE_NORMAL
	if (s.includes(' hover'        )) b |= STATE_HOVER
	if (s.includes(' active'       )) b |= STATE_ACTIVE
	if (s.includes(' focused'      )) b |= STATE_FOCUSED
	if (s.includes(' item-selected')) b |= STATE_ITEM_SELECTED
	if (s.includes(' item-focused' )) b |= STATE_ITEM_FOCUSED
	if (s.includes(' item-error'   )) b |= STATE_ITEM_ERROR
	return b
})
function parse_state(s) {
	if (!s || s == 'normal') return STATE_NORMAL
	if (s == 'hover') return STATE_HOVER
	if (s == 'active') return STATE_ACTIVE
	return parse_state_combis(s)
}

// text colors ---------------------------------------------------------------

ui.fg_style = function(theme, name, state, h, s, L, a) {
	let state_i = parse_state(state)
	themes[theme].fg[state_i][name] = isarray(h) ? h : [ui.hsl(h, s, L, a), h, s, L, a]
}

ui.fg = function(name, state, theme1) {
	let state_i = parse_state(state)
	theme1 = theme1 ? themes[theme1] : theme
	return theme1.fg[state_i][name] ?? theme.fg[0][name]
}

//           theme    name     state       h     s     L    a
// ---------------------------------------------------------------------------
ui.fg_style('light', 'text' , 'normal' ,   0, 0.00, 0.00)
ui.fg_style('light', 'text' , 'hover'  ,   0, 0.00, 0.30)
ui.fg_style('light', 'text' , 'active' ,   0, 0.00, 0.40)
ui.fg_style('light', 'label', 'normal' ,   0, 0.00, 0.00)
ui.fg_style('light', 'label', 'hover'  ,   0, 0.00, 0.00, 0.9)
ui.fg_style('light', 'link' , 'normal' , 222, 0.00, 0.50)
ui.fg_style('light', 'link' , 'hover'  , 222, 1.00, 0.70)
ui.fg_style('light', 'link' , 'active' , 222, 1.00, 0.80)

ui.fg_style('dark' , 'text' , 'normal' ,   0, 0.00, 0.90)
ui.fg_style('dark' , 'text' , 'hover'  ,   0, 0.00, 1.00)
ui.fg_style('dark' , 'text' , 'active' ,   0, 0.00, 1.00)
ui.fg_style('dark' , 'label', 'normal' ,   0, 0.00, 0.95, 0.7)
ui.fg_style('dark' , 'label', 'hover'  ,   0, 0.00, 0.90, 0.9)
ui.fg_style('dark' , 'link' , 'normal' ,  26, 0.88, 0.60)
ui.fg_style('dark' , 'link' , 'hover'  ,  26, 0.99, 0.70)
ui.fg_style('dark' , 'link' , 'active' ,  26, 0.99, 0.80)

ui.fg_style('light', 'button-danger', 'normal', 0, 0.54, 0.43)
ui.fg_style('dark' , 'button-danger', 'normal', 0, 0.54, 0.43)

// border colors -------------------------------------------------------------

ui.border_style = function(theme, name, state, h, s, L, a) {
	let state_i = parse_state(state)
	themes[theme].border[state_i][name] = isarray(h) ? h : [ui.hsl(h, s, L, a), h, s, L, a]
}

ui.border = function(name, state, theme1) {
	let state_i = parse_state(state)
	theme1 = theme1 ? themes[theme1] : theme
	return theme1.border[state_i][name] ?? theme.border[0][name]
}

//               theme    name        state       h    s    L     a
// ---------------------------------------------------------------------------
ui.border_style('light', 'light'   , 'normal' ,   0,   0,   0, 0.10)
ui.border_style('light', 'light'   , 'hover'  ,   0,   0,   0, 0.30)
ui.border_style('light', 'intense' , 'normal' ,   0,   0,   1, 0.30)
ui.border_style('light', 'intense' , 'hover'  ,   0,   0,   1, 0.50)

ui.border_style('dark' , 'light'   , 'normal' ,   0,   0,   1, 0.09)
ui.border_style('dark' , 'light'   , 'hover'  ,   0,   0,   1, 0.03)
ui.border_style('dark' , 'intense' , 'normal' ,   0,   0,   1, 0.20)
ui.border_style('dark' , 'intense' , 'hover'  ,   0,   0,   1, 0.40)

// background colors ---------------------------------------------------------

ui.bg_style = function(theme, name, state, h, s, L, a, is_dark) {
	let state_i = parse_state(state)
	themes[theme].bg[state_i][name] = isarray(h) ? h : [ui.hsl(h, s, L, a), h, s, L, a, is_dark]
}

ui.bg = function(name, state, theme1) {
	let state_i = parse_state(state)
	theme1 = theme1 ? themes[theme1] : theme
	return theme1.bg[state_i][name] ?? theme.bg[0][name]
}

//           theme    name      state       h     s     L     a
// -------------------------------------------------------------
ui.bg_style('light', 'bg0'   , 'normal' ,   0, 0.00, 0.50)
ui.bg_style('light', 'bg'    , 'normal' ,   0, 0.00, 1.00)
ui.bg_style('light', 'bg'    , 'hover'  ,   0, 0.00, 0.95)
ui.bg_style('light', 'bg'    , 'active' ,   0, 0.00, 0.93)
ui.bg_style('light', 'bg1'   , 'normal' ,   0, 0.00, 0.95)
ui.bg_style('light', 'bg1'   , 'hover'  ,   0, 0.00, 0.93)
ui.bg_style('light', 'bg1'   , 'active' ,   0, 0.00, 0.90)
ui.bg_style('light', 'bg2'   , 'normal' ,   0, 0.00, 0.85)
ui.bg_style('light', 'bg2'   , 'hover'  ,   0, 0.00, 0.82)
ui.bg_style('light', 'bg3'   , 'normal' ,   0, 0.00, 0.70)
ui.bg_style('light', 'bg3'   , 'hover'  ,   0, 0.00, 0.75)
ui.bg_style('light', 'bg3'   , 'active' ,   0, 0.00, 0.80)
ui.bg_style('light', 'alt'   , 'normal' ,   0, 0.00, 1.08)
ui.bg_style('light', 'smoke' , 'normal' ,   0, 0.00, 1.00, 0.80)
ui.bg_style('light', 'input' , 'normal' ,   0, 0.00, 0.98)
ui.bg_style('light', 'input' , 'hover'  ,   0, 0.00, 0.94)
ui.bg_style('light', 'input' , 'active' ,   0, 0.00, 0.90)

ui.bg_style('dark' , 'bg0'   , 'normal' , 216, 0.28, 0.80)
ui.bg_style('dark' , 'bg'    , 'normal' , 216, 0.28, 0.10)
ui.bg_style('dark' , 'bg'    , 'hover'  , 216, 0.28, 0.12)
ui.bg_style('dark' , 'bg'    , 'active' , 216, 0.28, 0.14)
ui.bg_style('dark' , 'bg1'   , 'normal' , 216, 0.28, 0.15)
ui.bg_style('dark' , 'bg1'   , 'hover'  , 216, 0.28, 0.19)
ui.bg_style('dark' , 'bg1'   , 'active' , 216, 0.28, 0.22)
ui.bg_style('dark' , 'bg2'   , 'normal' , 216, 0.28, 0.22)
ui.bg_style('dark' , 'bg2'   , 'hover'  , 216, 0.28, 0.25)
ui.bg_style('dark' , 'bg3'   , 'normal' , 216, 0.28, 0.29)
ui.bg_style('dark' , 'bg3'   , 'hover'  , 216, 0.28, 0.31)
ui.bg_style('dark' , 'bg3'   , 'active' , 216, 0.28, 0.33)
ui.bg_style('dark' , 'alt'   , 'normal' , 260, 0.28, 0.11)
ui.bg_style('dark' , 'smoke' , 'normal' ,   0, 0.00, 0.00, 0.70)
ui.bg_style('dark' , 'input' , 'normal' , 216, 0.28, 0.17)
ui.bg_style('dark' , 'input' , 'hover'  , 216, 0.28, 0.21)
ui.bg_style('dark' , 'input' , 'active' , 216, 0.28, 0.25)

ui.bg_style('light', 'scrollbar', 'normal' ,   0, 0.00, 0.70, 0.5)
ui.bg_style('light', 'scrollbar', 'hover'  ,   0, 0.00, 0.75, 0.8)
ui.bg_style('light', 'scrollbar', 'active' ,   0, 0.00, 0.80, 0.8)

ui.bg_style('dark' , 'scrollbar', 'normal' , 216, 0.28, 0.37, 0.5)
ui.bg_style('dark' , 'scrollbar', 'hover'  , 216, 0.28, 0.39, 0.8)
ui.bg_style('dark' , 'scrollbar', 'active' , 216, 0.28, 0.41, 0.8)

ui.bg_style('light', 'button', 'normal' , ui.bg('bg', 'normal', 'light'))
ui.bg_style('light', 'button', 'hover'  , ui.bg('bg', 'hover' , 'light'))
ui.bg_style('light', 'button', 'active' , ui.bg('bg', 'active', 'light'))

ui.bg_style('dark' , 'button', 'normal' , ui.bg('bg', 'normal', 'dark'))
ui.bg_style('dark' , 'button', 'hover'  , ui.bg('bg', 'hover' , 'dark'))
ui.bg_style('dark' , 'button', 'active' , ui.bg('bg', 'active', 'dark'))

ui.bg_style('light', 'button-primary', 'normal' , ui.fg('link', 'normal', 'light'))
ui.bg_style('light', 'button-primary', 'hover'  , ui.fg('link', 'hover' , 'light'))
ui.bg_style('light', 'button-primary', 'active' , ui.fg('link', 'active', 'light'))

ui.bg_style('dark' , 'button-primary', 'normal' , ui.fg('link', 'normal', 'dark'))
ui.bg_style('dark' , 'button-primary', 'hover'  , ui.fg('link', 'hover' , 'dark'))
ui.bg_style('dark' , 'button-primary', 'active' , ui.fg('link', 'active', 'dark'))

ui.bg_style('light', 'search'          , 'normal',  60,  1.00, 0.80) // quicksearch text bg
ui.bg_style('light', 'info'            , 'normal', 200,  1.00, 0.30) // info bubbles
ui.bg_style('light', 'focused-invalid' , 'normal',   0,  1.00, 0.60)
ui.bg_style('light', 'warn'            , 'normal',  39,  1.00, 0.50) // warning bubbles

// input value states
ui.bg_style('light', 'new'             , 'normal', 240, 1.00, 0.97)
ui.bg_style('light', 'modified'        , 'normal', 120, 1.00, 0.93)
ui.bg_style('light', 'new-modified'    , 'normal', 180, 0.55, 0.87)

ui.bg_style('dark' , 'new'             , 'normal', 240, 0.35, 0.27)
ui.bg_style('dark' , 'modified'        , 'normal', 120, 0.59, 0.24)
ui.bg_style('dark' , 'new-modified'    , 'normal', 157, 0.18, 0.20)

// grid cell & row states. these need to be opaque!
ui.bg_style('light', 'cell', 'item-focused'                       ,   0, 0.00, 0.93)
ui.bg_style('light', 'cell', 'item-selected'                      ,   0, 0.00, 0.91)
ui.bg_style('light', 'cell', 'item-focused item-selected'         ,   0, 0.00, 0.87)
ui.bg_style('light', 'cell', 'item-focused focused'               ,   0, 0.00, 0.87)
ui.bg_style('light', 'cell', 'item-focused item-selected focus'   , 139 / 239 * 360, 141 / 240, 206 / 240)
ui.bg_style('light', 'cell', 'item-selected focused'              , 139 / 239 * 360, 150 / 240, 217 / 240)

ui.bg_style('light', 'row' , 'item-focused focused'               , 139 / 239 * 360, 150 / 240, 231 / 240)
ui.bg_style('light', 'row' , 'item-focused'                       , 139 / 239 * 360,   0 / 240, 231 / 240)
ui.bg_style('light', 'row' , 'item-focused item-error'            ,   0, 1.00, 0.60)

ui.bg_style('dark' , 'cell', 'item-focused'                       , 195, 0.06, 0.12)
ui.bg_style('dark' , 'cell', 'item-selected'                      ,   0, 0.00, 0.20)
ui.bg_style('dark' , 'cell', 'item-focused item-selected'         , 208, 0.11, 0.23)
ui.bg_style('dark' , 'cell', 'item-focused focused'               ,   0, 0.00, 0.23)
ui.bg_style('dark' , 'cell', 'item-focused item-selected focused' , 211, 0.62, 0.24)
ui.bg_style('dark' , 'cell', 'item-selected focused'              , 211, 0.62, 0.19)

ui.bg_style('dark' , 'row' , 'item-focused focused'               , 212, 0.61, 0.13)
ui.bg_style('dark' , 'row' , 'item-focused'                       ,   0, 0.00, 0.13)
ui.bg_style('dark' , 'row' , 'item-focused item-error'            ,   0, 1.00, 0.60)

// canvas --------------------------------------------------------------------

let screen = document.createElement('div')
screen.classList.add('ui-screen')

let canvas = document.createElement('canvas')
canvas.classList.add('ui-canvas')
canvas.setAttribute('tabindex', 0)
screen.appendChild(canvas)

document.body.appendChild(screen)

let cx = canvas.getContext('2d')
ui.cx = cx

let a = []

let screen_w, screen_h, dpr

function resize_canvas() {
	let dpr1 = devicePixelRatio
	let screen_r = screen.getBoundingClientRect()
	let w = floor(screen_r.width  * dpr1)
	let h = floor(screen_r.height * dpr1)
	if (screen_w == w && screen_h == h && dpr == dpr1)
		return
	dpr = dpr1
	screen_w = w
	screen_h = h
	canvas.style.width  = (screen_w / dpr) + 'px'
	canvas.style.height = (screen_h / dpr) + 'px'
	canvas.width  = screen_w
	canvas.height = screen_h
	a.w = screen_w
	a.h = screen_h
	animate()
}
window.addEventListener('resize', resize_canvas)

let raf_id
ui.max_frame_duration = 0
ui.last_frame_duration = 0
function raf_animate() {
	raf_id = null
	let t0 = clock()
	cx.clearRect(0, 0, canvas.width, canvas.height)
	want_redraw = true
	redraw_all()
	ui.last_frame_duration = clock() - t0
	if (ui.max_frame_duration)
		ui.max_frame_duration = max(ui.last_frame_duration, ui.max_frame_duration)
	else
		ui.max_frame_duration = 0.000001
}
function animate() {
	if (raf_id) return
	raf_id = requestAnimationFrame(raf_animate)
}
ui.animate = animate

document.addEventListener('DOMContentLoaded', resize_canvas)

// input event handling ------------------------------------------------------

ui.pressed = false
ui.click = false
ui.clickup = false
let captured_id = null
ui.wheel_dy = 0
ui.trackpad = false
ui.mouseenter = false
ui.mouseleave = false

function reset_mouse() {
	if (ui.clickup)
		captured_id = null
	ui.click = false
	ui.clickup = false
	ui.wheel_dy = 0
	ui.trackpad = false
	ui.mouseenter = false
	ui.mouseleave = false
}

function update_mouse(ev) {
	ui.mx = round(ev.clientX * dpr)
	ui.my = round(ev.clientY * dpr)
}

canvas.addEventListener('pointerdown', function(ev) {
	update_mouse(ev)
	if (ev.which == 1) {
		ui.click = true
		ui.pressed = true
		this.setPointerCapture(ev.pointerId)
		hit_all()
		animate()
	}
})

canvas.addEventListener('pointerup', function(ev) {
	update_mouse(ev)
	if (ev.which == 1) {
		ui.pressed = false
		ui.clickup = true
		this.releasePointerCapture(ev.pointerId)
		hit_all()
		animate()
	}
})

canvas.addEventListener('pointermove', function(ev) {
	update_mouse(ev)
	hit_all()
	animate()
})

canvas.addEventListener('pointerenter', function(ev) {
	update_mouse(ev)
	if (!captured_id)
		ui.mouseenter = true
})

canvas.addEventListener('pointerleave', function(ev) {
	if (!captured_id) {
		ui.mx = null
		ui.my = null
		ui.mouseleave = true
	}
	ui.set_cursor()
	hit_all()
	animate()
})

canvas.addEventListener('wheel', function(ev) {
	ui.wheel_dy = ev.wheelDeltaY
	if (!ui.wheel_dy)
		return
	ui.trackpad = ev.wheelDeltaY === -ev.deltaY * 3
	update_mouse(ev)
	hit_all()
	animate()
})

let capture_state = map()

ui.capture = function(id) {
	if (!id)
		return
	if (captured_id)
		return
	if (!ui.pressed)
		return
	if (!ui.realhit(id))
		return
	captured_id = id
	capture_state.clear()
	ui.mx0 = ui.mx
	ui.my0 = ui.my
	return capture_state
}

ui.captured = function(id) {
	if (!id)
		return
	if (captured_id != id)
		return
	return capture_state
}

let key_state = map()

canvas.addEventListener('keydown', function(ev) {
	key_state.set(ev.key.toLowerCase(), 'down')
	animate()
})

canvas.addEventListener('keyup', function(ev) {
	key_state.set(ev.key.toLowerCase(), 'up')
	animate()
})

ui.keydown = function(id, key) {
	return ui.focused_id == id && key_state.get(key) == 'down'
}

ui.keyup = function(key) {
	return ui.focused_id == id && key_state.get(key) == 'up'
}

function reset_keys() {
	key_state.clear()
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
	layer1.push(i)
	layer_stack.push(layer)
	layer = layer1
}

function end_layer() {
	layer = layer_stack.pop()
}

// scopes --------------------------------------------------------------------

let scope_freelist = map_freelist()
let scope_stack = []
let scope = null

function begin_scope() {
	scope_stack.push(scope)
	// scope creation is delayed to first call of scope_set().
	// TODO: could COW be faster here with deep scopes?
	// TODO: would parallel per-key stacks be faster here instead of one stack of maps?
	scope = null
}

function end_scope() {
	let ended_scope = scope
	scope = scope_stack.pop()
	if (ended_scope) {
		end_color(ended_scope)
		end_theme(ended_scope)
		end_font(ended_scope)
		end_font_size(ended_scope)
		end_font_weight(ended_scope)
		end_line_gap(ended_scope)
		scope_freelist(ended_scope)
	}
}

function scope_get(k) {
	// look in current scope
	if (scope) {
		let v = scope.get(k)
		if (v !== undefined)
			return v
	}
	// look in parent scopes
	for (let i = scope_stack.length-1; i >= 0; i--) {
		let scope = scope_stack[i]
		if (scope) {
			let v = scope.get(k)
			if (v !== undefined)
				return v
		}
	}
}

function scope_set(k, v) {
	scope = scope ?? scope_freelist()
	scope.set(k, v)
}

function scope_prev_var(ended_scope, k) {
	let v = ended_scope.get(k)
	if (v === undefined) return
	let v0 = scope_get(k)
	if (v === v0) return
	return v0
}

ui.scope = begin_scope
ui.end_scope = end_scope

// id state maps -------------------------------------------------------------

let id_state_map_freelist = map_freelist()
let id_state_maps  = map() // {id->map}
let id_current_set = set() // {id}
let id_remove_set  = set() // {id}

function keepalive(id) {
	id_current_set.add(id)
	id_remove_set.delete(id)
}

ui.state_map = function(id) {
	if (!id)
		return
	keepalive(id)
	let m = id_state_maps.get(id)
	if (!m) {
		m = id_state_map_freelist()
		id_state_maps.set(id, m)
	}
	return m
}

ui.state = function(id, k) {
	if (!id)
		return
	let m = id_state_maps.get(id)
	if (!m)
		return
	keepalive(id)
	return m.get(k)
}

ui.state_set = function(id, k, v) {
	ui.state_map(id).set(k, v)
}

function id_state_gc() {
	for (let id of id_remove_set) {
		let m = id_state_maps.get(id)
		let free = m.get('free')
		if (free)
			free(m, id)
		id_state_maps.delete(id)
		id_state_map_freelist(m)
	}
	id_remove_set.clear()
	let empty = id_remove_set
	id_remove_set = id_current_set
	id_current_set = empty
}

ui.on_free = function(id, free1) {
	let s = ui.state_map(id)
	let free0 = s.get('free')
	if (!free0) {
		s.set('free', free1)
	} else {
		s.set('free', function(s, id) {
			free0(s, id)
			free1(s, id)
		})
	}
}

// measure state -------------------------------------------------------------

let measure_req = []

ui.measure = function(id) {
	let i = assert(ct_stack.at(-1), 'measure outside container')
	measure_req.push(id, i)
}

function measure_req_all() {
	for (let k = 0, n = measure_req.length; k < n; k += 2) {
		let id = measure_req[k+0]
		let i  = measure_req[k+1]
		let s = ui.state_map(id)
		s.set('x', a[i+0])
		s.set('y', a[i+1])
		s.set('w', a[i+2])
		s.set('h', a[i+3])
	}
	measure_req.length = 0
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
	assert(!cmd_names[code], 'duplicate command code ',code,' for ',name)
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

let color, font, font_size, font_weight, line_gap

ui.default_theme = themes.dark
ui.default_font = 'Arial'
ui.font_size_normal = 14

function reset_all() {
	theme = ui.default_theme
	color = ui.fg('text')[0]
	font = ui.default_font
	font_size = ui.font_size_normal
	font_weight = 'normal'
	line_gap = 0.5
	reset_paddings()
	scope_set('color', color)
	scope_set('theme', theme)
	scope_set('font', font)
	scope_set('font_size', font_size)
	scope_set('font_weight', font_weight)
	scope_set('line_gap', line_gap)
	cx.font = font_weight + ' ' + font_size + 'px ' + font
}

function ui_cmd(cmd, ...args) {
	let i0 = a.length+2   // index of this cmd's arg#1
	let i1 = i0+args.length+3 // index of next cmd's arg#1
	a.push(i1, cmd, ...args, i0)
	return i0
}
ui.cmd = ui_cmd

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
	assert(!scope_stack.length, 'scope not closed')
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
	assert(false, 'invalid align ', s)
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
	assert(false, 'invalid valign ', s)
}

// paddings and margins, applied to the next box cmd and then they are reset.
let px1, px2, py1, py2
let mx1, mx2, my1, my2

ui.rem = rem => round(rem * ui.font_size_normal)
ui. em =  em => round( em * font_size)

let rem = ui.rem
ui.sp025 = () => rem( .125)
ui.sp05  = () => rem( .25)
ui.sp075 = () => rem( .375)
ui.sp1   = () => rem( .5)
ui.sp2   = () => rem( .75)
ui.sp4   = () => rem(1)
ui.sp8   = () => rem(2)

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
		max(0, fr ?? 1),
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
	begin_scope()
	return ui_cmd_box_ct(cmd, fr, align, valign, min_w, min_h,
		gap ?? 0,
		0, // total_fr
	)
}

const CMD_H = cmd_ct('h')
const CMD_V = cmd_ct('v')

ui.h = function(...args) { return ui_hv(CMD_H, ...args) }
ui.v = function(...args) { return ui_hv(CMD_V, ...args) }
ui.hv = function(hv, ...args) {
	let cmd = assert(hv == 'h' ? CMD_H : hv == 'v' ? CMD_V : 0)
	return ui_hv(cmd, ...args)
}

const STACK_ID = S+0

const CMD_STACK = cmd_ct('stack')
ui.stack = function(id, fr, align, valign, min_w, min_h) {
	begin_scope()
	return ui_cmd_box_ct(CMD_STACK, fr, align, valign, min_w, min_h,
		id)
}

const SB_OVERFLOW =  S+0 // overflow x,y
const SB_CW       =  S+2 // content w,h
const SB_ID       =  S+4
const SB_SX       =  S+5 // scroll x,y

const CMD_SCROLLBOX = cmd_ct('scrollbox')
ui.scrollbox = function(id, fr, overflow_x, overflow_y, align, valign, min_w, min_h, sx, sy) {

	assert(id, 'scrollbox must have an id')
	let ss = ui.state_map(id)
	sx = sx ?? (ss ? ss.get('scroll_x') : 0)
	sy = sy ?? (ss ? ss.get('scroll_y') : 0)

	begin_scope()
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
ui.sb = ui.scrollbox

const POPUP_SIDE_CENTER       = 0 // only POPUP_SIDE_INNER_CENTER is valid!
const POPUP_SIDE_HORIZ        = 2
const POPUP_SIDE_VERT         = 4
const POPUP_SIDE_INNER        = 8
const POPUP_SIDE_LEFT         = POPUP_SIDE_HORIZ + 0
const POPUP_SIDE_RIGHT        = POPUP_SIDE_HORIZ + 1
const POPUP_SIDE_TOP          = POPUP_SIDE_VERT  + 0
const POPUP_SIDE_BOTTOM       = POPUP_SIDE_VERT  + 1
const POPUP_SIDE_INNER_CENTER = POPUP_SIDE_INNER + POPUP_SIDE_CENTER
const POPUP_SIDE_INNER_LEFT   = POPUP_SIDE_INNER + POPUP_SIDE_LEFT
const POPUP_SIDE_INNER_RIGHT  = POPUP_SIDE_INNER + POPUP_SIDE_RIGHT
const POPUP_SIDE_INNER_TOP    = POPUP_SIDE_INNER + POPUP_SIDE_TOP
const POPUP_SIDE_INNER_BOTTOM = POPUP_SIDE_INNER + POPUP_SIDE_BOTTOM

const POPUP_ALIGN_CENTER  = 0
const POPUP_ALIGN_START   = 1
const POPUP_ALIGN_END     = 2
const POPUP_ALIGN_STRETCH = 3

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
	assert(false, 'invalid popup side ', s)
}

function popup_parse_align(s) {
	if (s == 'c'      ) return POPUP_ALIGN_CENTER
	if (s == '['      ) return POPUP_ALIGN_START
	if (s == ']'      ) return POPUP_ALIGN_END
	if (s == '[]'     ) return POPUP_ALIGN_STRETCH
	if (s == 's'      ) return POPUP_ALIGN_STRETCH
	if (s == 'center' ) return POPUP_ALIGN_CENTER
	if (s == 'start'  ) return POPUP_ALIGN_START
	if (s == 'end'    ) return POPUP_ALIGN_END
	if (s == 'stretch') return POPUP_ALIGN_STRETCH
	assert(false, 'invalid align ', s)
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
const POPUP_COLOR     = S+6
const POPUP_FONT      = S+7
const POPUP_FONT_SIZE = S+8

const POPUP_TARGET_SCREEN = -1
const POPUP_TARGET_PARENT = -2

const CMD_POPUP = cmd_ct('popup')
ui.popup = function(id, layer1, target_i, side, align, min_w, min_h, flags) {
	layer1 = layer1 || layer
	// TODO: fr, align, valign are not used. find a way to remove them.
	begin_scope()
	if (layer1 != layer) {
		force_font(font)
		force_font_size(font_size)
		force_font_weight(font_weight)
		force_line_gap(line_gap)
	}
	let i = ui_cmd_box_ct(CMD_POPUP, 0, 's', 's', min_w, min_h,
		id,
		layer1,
		repl(target_i, 'screen', POPUP_TARGET_SCREEN) ?? POPUP_TARGET_PARENT,
		popup_parse_side(side ?? 't'),
		popup_parse_align(align ?? 'c'),
		popup_parse_flags(flags ?? ''),
	)
	begin_layer(layer1, i)
}

const CMD_END = cmd('end')
ui.end = function(cmd) {
	end_scope()
	let i = assert(ct_stack.pop(), 'end command outside container')
	if (cmd && a[i-1] != cmd)
		assert(false, 'closing ', cmd_names[cmd], ' instead of ', C(a, i))
	let end_i = ui_cmd(CMD_END, i)
	a[i+NEXT_EXT_I] = a[end_i-2] // next_i

	if (a[i-1] == CMD_POPUP) {
		end_layer()
	}
}
ui.end_h         = function() { ui.end(CMD_H) }
ui.end_v         = function() { ui.end(CMD_V) }
ui.end_stack     = function() { ui.end(CMD_STACK) }
ui.end_scrollbox = function() { ui.end(CMD_SCROLLBOX) }
ui.end_popup     = function() { ui.end(CMD_POPUP) }
ui.end_sb = ui.end_scrollbox

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
	if (s.startsWith('-'))
		b = ~b & BORDER_SIDE_ALL
	return b
}

const BB_ID   = 0
const BB_CT_I = 1

const CMD_BB = cmd('bb') // border-background
ui.bb = function(id, bg_color, sides, border_color, border_radius) {
	let s = bg_color
	if (isstr(bg_color))
		bg_color = ui.bg(bg_color) ?? bg_color
	if (isarray(bg_color)) {
		set_theme_dark(bg_color[5] ?? bg_color[3] < .5)
		bg_color = bg_color[0]
	}
	if (isstr(border_color))
		border_color = ui.border(border_color) ?? border_color
	if (isarray(border_color))
		border_color = border_color[0]
	let ct_i = assert(ct_stack.at(-1), 'bb outside container')
	ui_cmd(CMD_BB, id, ct_i, bg_color, parse_border_sides(sides), border_color, border_radius)
}

ui.shadow_style = function(theme, name, x, y, blur, spread, inset, h, s, L, a) {
	themes[theme].shadow[name] = [x, y, blur, spread, inset, ui.hsl(h, s, L, a), h, s, L, a]
}

//               theme    name        x   y  bl sp  inset  h  s  L  a
// ----------------------------------------------------------------------------------
ui.shadow_style('light', 'tooltip' ,  2,  2,  9, 0, false, 0, 0, 0, 0x44 / 0xff)
ui.shadow_style('light', 'toolbox' ,  1,  1,  4, 0, false, 0, 0, 0, 0xaa / 0xff)
ui.shadow_style('light', 'menu'    ,  2,  2,  2, 0, false, 0, 0, 0, 0xaa / 0xff)
ui.shadow_style('light', 'button'  ,  0,  0,  2, 0, false, 0, 0, 0, 0x11 / 0xff)
ui.shadow_style('light', 'thumb'   ,  0,  0,  2, 0, false, 0, 0, 0, 0xbb / 0xff)
ui.shadow_style('light', 'modal'   ,  2,  5, 10, 0, false, 0, 0, 0, 0x88 / 0xff)
ui.shadow_style('light', 'picker'  ,  0,  5, 10, 1, false, 0, 0, 0, 0x22 / 0xff) // large fuzzy shadow

ui.shadow_style('dark', 'tooltip' ,  2,  2,  9, 0, false, 0, 0, 0, 0x44 / 0xff)
ui.shadow_style('dark', 'toolbox' ,  1,  1,  4, 0, false, 0, 0, 0, 0xaa / 0xff)
ui.shadow_style('dark', 'menu'    ,  2,  2,  2, 0, false, 0, 0, 0, 0xaa / 0xff)
ui.shadow_style('dark', 'button'  ,  0,  0,  2, 0, false, 0, 0, 0, 0xff / 0xff)
ui.shadow_style('dark', 'thumb'   ,  1,  1,  2, 0, false, 0, 0, 0, 0xaa / 0xff)
ui.shadow_style('dark', 'modal'   ,  2,  5, 10, 0, false, 0, 0, 0, 0x88 / 0xff)
ui.shadow_style('dark', 'picker'  ,  0,  5, 10, 1, false, 0, 0, 0, 0x22 / 0xff) // large fuzzy shadow

const CMD_SHADOW = cmd('shadow')
ui.shadow = function(x, y, blur, spread, inset, color) {
	if (isstr(x))
		x = assert(theme.shadow[x])
	if (isarray(x))
		[x, y, blur, spread, inset, color] = x
	ui_cmd(CMD_SHADOW, x, y, blur, spread, inset, color)
}

const TEXT_ASC      = S-1
const TEXT_DSC      = S-0
const TEXT_X        = S+1
const TEXT_W        = S+2
const TEXT_ID       = S+3
const TEXT_S        = S+4
const TEXT_FLAGS    = S+5

const TEXT_WRAP      = 3 // bits 0 and 1
const TEXT_WRAP_LINE = 1 // bit 1
const TEXT_WRAP_WORD = 2 // bit 2
const TEXT_EDITABLE  = 4 // bit 3

const CMD_TEXT = cmd('text')
ui.text = function(id, s, fr, align, valign, max_min_w, min_w, min_h, wrap, editable, input_type) {
	// NOTE: min_w and min_h are measured, not given.
	wrap = wrap == 'line' ? TEXT_WRAP_LINE : wrap == 'word' ? TEXT_WRAP_WORD : 0
	if (wrap == TEXT_WRAP_LINE) {
 		if (s.includes('\n'))
			s = s.split('\n')
	} else if (wrap == TEXT_WRAP_WORD) {
		assert(id, 'wrapped text needs id')
		s = word_wrapper(id, s)
	}
	ui_cmd_box(CMD_TEXT, fr ?? 0, align ?? 'c', valign ?? 'c',
		min_w ?? -1, // -1=auto
		min_h ?? -1, // -1=auto
		0, // ascent
		0, // descent
		0, // text_x
		max_min_w ?? -1, // -1=inf
		id,
		ui.state(id, 'text') ?? s,
		wrap | (editable ? TEXT_EDITABLE : 0),
	)
	if (editable)
		input_create(id, input_type)
}
ui.text_editable = function(id, s, fr, align, valign, max_min_w, min_w, min_h, input_type) {
	return ui.text(id, s, fr, align, valign, max_min_w, min_w, min_h, null, true, input_type)
}
ui.text_lines = function(id, s, fr, align, valign, max_min_w, min_w, min_h, editable) {
	return ui.text(id, s, fr, align, valign, max_min_w, min_w, min_h, 'line', editable)
}
ui.text_wrapped = function(id, s, fr, align, valign, max_min_w, min_w, min_h, editable) {
	return ui.text(id, s, fr, align, valign, max_min_w, min_w, min_h, 'word', editable)
}

const CMD_COLOR = cmd('color')
ui.color = function(s, state) {
	if (isstr(s))
		s = ui.fg(s, state) ?? s
	if (isarray(s))
		s = s[0]
	if (color == s) return
	scope_set('color', s)
	ui_cmd(CMD_COLOR, s)
	color = s
}
function end_color(ended_scope) {
	let s = scope_prev_var(ended_scope, 'color')
	if (s === undefined) return
	ui_cmd(CMD_COLOR, s)
	color = s
}

function set_theme_dark(dark) {
	theme = dark ? themes.dark : themes.light
	scope_set('theme', theme)
	ui.color('text')
}
function end_theme(ended_scope) {
	let s = scope_prev_var(ended_scope, 'theme')
	if (s === undefined) return
	theme = s
}

const CMD_FONT = cmd('font')
function force_font(s) {
	scope_set('font', s)
	ui_cmd(CMD_FONT, s)
	font = s
}
function end_font(ended_scope) {
	let s = scope_prev_var(ended_scope, 'font')
	if (s === undefined) return
	ui_cmd(CMD_FONT, s)
	font = s
}
ui.font = function(s) {
	if (font == s) return
	force_font(s)
}

let xsmall  = () => ui.font_size_normal * .72      // 10/14
let small   = () => ui.font_size_normal * .8125    // 12/14
let smaller = () => ui.font_size_normal * .875     // 13/14
let large   = () => ui.font_size_normal * 1.125    // 16/14
let xlarge  = () => ui.font_size_normal * 1.5

const CMD_FONT_SIZE = cmd('font_size')
function force_font_size(s) {
	scope_set('font_size', s)
	ui_cmd(CMD_FONT_SIZE, s)
	font_size = s
}
function end_font_size(ended_scope) {
	let s = scope_prev_var(ended_scope, 'font_size')
	if (s === undefined) return
	ui_cmd(CMD_FONT_SIZE, s)
	font_size = s
}
ui.font_size = function(s) {
	if (font_size == s) return
	force_font_size(s)
}
ui.fs = ui.font_size

const CMD_FONT_WEIGHT = cmd('font_weight')
function force_font_weight(s) {
	scope_set('font_weight', s)
	ui_cmd(CMD_FONT_WEIGHT, s)
	font_weight = s
}
function end_font_weight(ended_scope) {
	let s = scope_prev_var(ended_scope, 'font_weight')
	if (s === undefined) return
	ui_cmd(CMD_FONT_WEIGHT, s)
	font_weight = s
}
ui.font_weight = function(s) {
	if (font_weight == s) return
	force_font_weight(s)
}
ui.bold = function() {
	ui.font_weight('bold')
}

const CMD_LINE_GAP = cmd('line_gap')
function force_line_gap(s) {
	scope_set('line_gap', s)
	ui_cmd(CMD_LINE_GAP, s)
	line_gap = s
}
function end_line_gap(ended_scope) {
	let s = scope_prev_var(ended_scope, 'line_gap')
	if (s === undefined) return
	ui_cmd(CMD_LINE_GAP, s)
	line_gap = s
}
ui.line_gap = function(s) {
	if (line_gap == s) return
	force_line_gap(s)
}
ui.lh = line_gap

function set_font(a, i) {
	font = a[i]
	cx.font = font_weight + ' ' + font_size + 'px ' + font
}

function set_font_size(a, i) {
	font_size = a[i]
	cx.font = font_weight + ' ' + font_size + 'px ' + font
}

function set_font_weight(a, i) {
	font_weight = a[i]
	cx.font = font_weight + ' ' + font_size + 'px ' + font
}

function set_line_gap(a, i) {
	line_gap = a[i]
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
measure[CMD_FONT_WEIGHT] = set_font_weight
measure[CMD_LINE_GAP] = set_line_gap

let word_wrapper_freelist = freelist(function() {

	let s
	let words  = [] // [word1,...]
	let widths = [] // [w1,...]
	let lines  = [] // [line1_i,line1_w,...]
	let sp_w // width of a single space character.
	let ww = {lines: lines, words: words, widths: widths}

	ww.set_text = function(s1) {
		s1 = s1.trim()
		if (s1 == s)
			return
		ww.clear()
		s = s1
	}

	// skip spaces, advancing i1 to the first non-space char and i2
	// to first space char after that, or to 1/0 if no space char was found.
	let i1
	function skip_spaces(s) {
		while (1) {
			let i3 = s.indexOf(' ' , i1); if (i3 == i1) { i1++; continue; }
			let i4 = s.indexOf('\n', i1); if (i4 == i1) { i1++; continue; }
			let i5 = s.indexOf('\r', i1); if (i5 == i1) { i1++; continue; }
			let i6 = s.indexOf('\t', i1); if (i6 == i1) { i1++; continue; }
			return min(
				i3 == -1 ? 1/0 : i3,
				i4 == -1 ? 1/0 : i4,
				i5 == -1 ? 1/0 : i5,
				i6 == -1 ? 1/0 : i6,
			)
		}
	}
	let last_font
	ww.measure = function() {
		if (cx.font == last_font)
			return
		last_font = cx.font
		let m = cx.measureText(' ') // makes garbage!
		sp_w = m.width
		ww.sp_w = sp_w
		ww.asc = m.fontBoundingBoxAscent
		ww.dsc = m.fontBoundingBoxDescent
		if (!s) {
			ww.w = 0
			ww.h = ceil(ww.asc + ww.dsc)
			return
		}
		i1 = 0
		while (i1 < 1/0) {
			let i2 = skip_spaces(s)
			let word = s.substring(i1, i2)
			words.push(word)
			i1 = i2
		}
		ww.min_w = 0
		for (let s of words) {
			let m = cx.measureText(s) // makes garbage!
			widths.push(m.width)
			ww.min_w = max(ww.min_w, m.width)
		}
	}

	let last_ct_w, last_line_gap
	ww.wrap = function(ct_w, align) {
		if (!s)
			return
		if (ct_w == last_ct_w && line_gap * font_size == last_line_gap)
			return
		last_ct_w = ct_w
		last_line_gap = line_gap * font_size
		lines.length = 0
		let line_w = 0
		let max_line_w = 0
		let line_i = 0
		let sep_w = 0
		for (let i = 0, n = widths.length; i <= n; i++) {
			let w = i < n ? widths[i] : 0
			if (i == n || ceil(line_w + sep_w + w) > ct_w) {
				line_w = ceil(line_w)
				max_line_w = max(max_line_w, line_w)
				lines.push(line_i)
				lines.push(line_w)
				line_w = 0
				sep_w = 0
				line_i = i
			}
			line_w += sep_w + w
			sep_w = sp_w
		}
		let line_count = lines.length / 2
		ww.w = ceil(max_line_w)
		ww.h = line_count * ceil(ww.asc + ww.dsc)
			+ (line_count-1) * round(line_gap * font_size)
	}

	ww.clear = function() {
		s = null
		words .length = 0
		widths.length = 0
		lines .length = 0
		last_font = null
		last_ct_w = null
		last_line_gap = null
	}

	return ww
})

function free_word_wrapper(s) {
	let ww = s.get('ww')
	word_wrapper_freelist(ww)
}

function word_wrapper(id, text) {
	let s = ui.state_map(id)
	let ww = s.get('ww')
	if (!ww) {
		ww = word_wrapper_freelist()
		s.set('ww', ww)
		ui.on_free(id, free_word_wrapper)
	}
	ww.set_text(text)
	return ww
}

measure[CMD_TEXT] = function(a, i, axis) {
	let wrap = a[i+TEXT_FLAGS] & TEXT_WRAP
	if (wrap == TEXT_WRAP_WORD) {
		// word-wrapping is the reason for splitting the layouting algorithm
		// into interlaced per-axis measuring and positioning phases.
		let id = a[i+TEXT_ID]
		let ww = a[i+TEXT_S]
		if (!axis) {
			ww.measure()
			let min_w = a[i+2]
			let max_min_w = a[i+TEXT_W]
			if (min_w == -1)
				min_w = ww.min_w
			if (max_min_w != -1)
				min_w = min(max_min_w, min_w)
			a[i+2] = min_w
			a[i+TEXT_ASC] = round(ww.asc)
			a[i+TEXT_DSC] = round(ww.dsc)
		} else {
			let min_h = a[i+3]
			if (min_h == -1)
				min_h = ww.h
			a[i+3] = min_h
		}
	} else if (!axis) {
		// measure everything once on the x-axis phase.
		let s = a[i+TEXT_S]
		let asc
		let dsc
		let text_w
		let text_h
		if (isstr(s)) { // single-line
			let m = cx.measureText(s) // makes garbage!
			asc = m.fontBoundingBoxAscent
			dsc = m.fontBoundingBoxDescent
			text_w = ceil(m.width)
			text_h = ceil(asc+dsc)
		} else { // multi-line, pre-wrapped
			text_w = 0
			text_h = 0
			for (let ss of s) {
				let m = cx.measureText(ss)
				asc = m.fontBoundingBoxAscent
				dsc = m.fontBoundingBoxDescent
				text_w = max(text_w, ceil(m.width))
				text_h += ceil(asc+dsc)
			}
			text_h += (s.length-1) * round(line_gap * font_size)
		}
		let min_w = a[i+2]
		let min_h = a[i+3]
		let max_min_w = a[i+TEXT_W]
		if (min_w == -1) min_w = text_w
		if (min_h == -1) min_h = text_h
		if (max_min_w != -1)
			min_w = min(max_min_w, min_w)
		a[i+2] = min_w
		a[i+3] = min_h
		a[i+TEXT_ASC] = round(asc)
		a[i+TEXT_DSC] = round(dsc)
		a[i+TEXT_W] = text_w + paddings(a, i, 0)
	}
	a[i+2+axis] += paddings(a, i, axis)
	let min_w = a[i+2+axis]
	add_ct_min_wh(a, axis, min_w, a[i+FR])
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
	if (!axis) {
		let wrap = a[i+TEXT_FLAGS] & TEXT_WRAP
		if (wrap == TEXT_WRAP_WORD) {
			let ww = a[i+TEXT_S]
			ww.wrap(sw)
			a[i+2] = ww.w
		} else {
			a[i+2] = a[i+TEXT_W] // we're positioning text_w, not min_w!
		}
		// store the segment we might have to clip the text to.
		a[i+TEXT_X] = sx + a[i+MX1] + a[i+PX1]
		a[i+TEXT_W] = sw - paddings(a, i, 0)
	}
	let x = inner_x(a, i, axis, align_x(a, i, axis, sx, sw))
	let w = inner_w(a, i, axis, align_w(a, i, axis, sw))
	a[i+0+axis] = x
	a[i+2+axis] = w
}

function position_children_cross_axis(a, ct_i, axis, sx, sw) {

	let i = a[ct_i-2] // next_i
	while (a[i-1] != CMD_END) {

		let cmd = a[i-1]
		let position_f = position[cmd]
		if (position_f) {
			// position item's children recursively.
			position_f(a, i, axis, sx, sw, ct_i)
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

		let ct_i = i

		let next_i   = a[i-2]
		let gap      = a[i+FLEX_GAP]
		let total_fr = a[i+FLEX_TOTAL_FR]

		if (!total_fr)
			total_fr = 1

		// compute total gap.
		let gap_w = 0
		if (gap) {
			let n = 0
			let i = next_i
			while (a[i-1] != CMD_END && a[i-1] != CMD_POPUP) {
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

				// TODO: make this agnostic of cmd type
				if (cmd == CMD_POPUP) {
					min_w = 0
					fr = 0
				}

				let flex_w = total_w * fr / total_fr
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

				// TODO: make this agnostic of cmd type
				if (cmd == CMD_POPUP) {
					min_w = 0
					fr = 0
				}

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
				position_f(a, i, axis, sx, sw, ct_i)

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
// NOTE: sw is always 0 because popups have fr=0.
position[CMD_POPUP] = function(a, i, axis, sx, sw, ct_i) {

	// stretched popups stretch to the dimensions of their target.
	let target_i = a[i+POPUP_TARGET_I]
	let side     = a[i+POPUP_SIDE]
	let align    = a[i+POPUP_ALIGN]
	if (side & POPUP_SIDE_INNER && align == POPUP_ALIGN_STRETCH) {
		let d = 10
		if (target_i == POPUP_TARGET_SCREEN) {
			a[i+2+axis] = (axis ? a.h : a.w) - 2*d
		} else {
			if (target_i >= 0)
				ct_i = target_i
			let ct_w = a[ct_i+2+axis] + paddings(a, ct_i, axis)
			a[i+2+axis] = max(a[i+2+axis], ct_w)
		}
	}

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
	a[i+TEXT_X] += dx
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
			if (axis && ui.wheel_dy && ui.hit(id)) {
				let sy0 = ui.state_map(id).get('scroll_y') ?? 0
				sy = clamp(sy - ui.wheel_dy, 0, ch - h)
				ui.state_map(id).set('scroll_y', sy)
				a[i+SB_SX+1] = sy
			}

			// drag-scrolling
			let sbar_id = id+'.scrollbar'+axis
			let cs = ui.captured(sbar_id)
			if (cs) {
				if (!axis) {
					let psx0 = cs.get('ps0')
					let dpsx = (ui.mx - ui.mx0) / (w - tw)
					sx = clamp(psx0 + dpsx, 0, 1) * (cw - w)
					ui.state_map(id).set('scroll_x', sx)
					a[i+SB_SX+0] = sx
				} else {
					let psy0 = cs.get('ps0')
					let dpsy = (ui.my - ui.my0) / (h - th)
					sy = clamp(psy0 + dpsy, 0, 1) * (ch - h)
					ui.state_map(id).set('scroll_y', sy)
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

	let sdx = side & POPUP_SIDE_HORIZ
	let sdy = side & POPUP_SIDE_VERT

	if (align == POPUP_ALIGN_CENTER && sdy)
		x += round((tw - w) / 2)
	else if (align == POPUP_ALIGN_CENTER && sdx)
		y += round((th - h) / 2)
	else if (align == POPUP_ALIGN_END && sdy)
		x += tw - w
	else if (align == POPUP_ALIGN_END && sdx)
		y += th - h
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

		let vert = side & POPUP_SIDE_VERT

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
	a[i+2] = w
	a[i+3] = h

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
}

function input_free(s, id) {
	let input = s.get('input')
	input.remove()
	pr('input free', id)
}

function input_focus(ev) {
	ui.focused_id = this._ui_id
	animate()
}

function input_blur(ev) {
	ui.focused_id = null
	animate()
}

function input_input(ev) {
	let id = this._ui_id
	ui.state_set(id, 'text', this.value)
	animate()
}

function input_keydown(ev) {
	if (ev.key == 'Tab') {
		// ev.preventDefault()
	}
}

function input_create(id, input_type) {
	let input = ui.state(id, 'input')
	if (input)
		return
	input = document.createElement('input')
	input._ui_id = id
	if (input_type)
		input.setAttribute('type', input_type)
	input.classList.add('ui-input')
	input.addEventListener('focus', input_focus)
	input.addEventListener('blur' , input_blur)
	input.addEventListener('input', input_input)
	input.addEventListener('keydown', input_keydown)
	screen.appendChild(input)
	ui.state_set(id, 'input', input)
	ui.on_free(id, input_free)
	return input
}

draw[CMD_TEXT] = function(a, i) {

	let x        = a[i+0]
	let y        = a[i+1]
	let w        = a[i+2]
	let s        = a[i+TEXT_S]
	let asc      = a[i+TEXT_ASC]
	let dsc      = a[i+TEXT_DSC]
	let sx       = a[i+TEXT_X]
	let sw       = a[i+TEXT_W]
	let id       = a[i+TEXT_ID]
	let flags    = a[i+TEXT_FLAGS]
	let wrap     = flags & TEXT_WRAP
	let editable = flags & TEXT_EDITABLE

	if (editable) {
		let input = ui.state(id, 'input')

		input.value = s
		input.style.fontFamily = font
		input.style.fontWeight = font_weight
		input.style.fontSize   = (font_size / dpr)+'px'
		input.style.color      = color
		input.style.left   = (x  / dpr)+'px'
		input.style.top    = (y  / dpr)+'px'
		input.style.width  = (sw / dpr)+'px'

		input.style.opacity = ui.focused(id) ? 1 : 0

		if (ui.focused(id))
			return
	}

	let clip = w > sw

	if (clip) {
		let h = a[i+3]
		cx.save()
		cx.beginPath()
		cx.rect(sx, y, sw, h)
		cx.clip()
	}

	cx.textAlign = 'left'
	cx.fillStyle = color

	if (isstr(s)) {

		cx.fillText(s, x, y + asc)

	} else if (wrap == TEXT_WRAP_LINE) {

		for (let ss of s) {
			cx.fillText(ss, x, y + asc)
			y += asc + dsc + round(line_gap * font_size)
		}

	} else if (wrap == TEXT_WRAP_WORD) {

		let align = a[i+ALIGN]
		let x0 = x
		let ww = s

		for (let k = 0, n = ww.lines.length; k < n; k += 2) {

			let i1     = ww.lines[k]
			let line_w = ww.lines[k+1]
			let i2     = ww.lines[k+2] ?? ww.words.length

			let x
			if (align == ALIGN_END)
				x = x0 + w - line_w
			else if (align == ALIGN_CENTER)
				x = x0 + round((w - line_w) / 2)
			else
				x = x0

			for (let i = i1; i < i2; i++) {
				let s1 = ww.words [i]
				let w1 = ww.widths[i]
				cx.fillText(s1, x, y + asc)
				x += w1 + ww.sp_w
			}

			y += asc + dsc + round(line_gap * font_size)
		}
	}

	if (clip)
		cx.restore()

}

let scrollbar_rect
{
let r = [false, 0, 0, 0, 0]
scrollbar_rect = function(a, i, axis, active) {
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
	let thickness = active ? theme.scrollbar_thickness_active : theme.scrollbar_thickness
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
	if (a[i-1] == CMD_SCROLLBOX) {

		cx.restore()

		let id = a[i+SB_ID]
		for (let axis = 0; axis < 2; axis++) {

			let [visible, tx, ty, tw, th] = scrollbar_rect(a, i, axis)
			if (!visible)
				continue

			let sbar_id = id+'.scrollbar'+axis
			let cs = ui.captured(sbar_id)
			let hs = ui.hovers(sbar_id)

			if (cs || hs)
				[visible, tx, ty, tw, th] = scrollbar_rect(a, i, axis, true)

			cx.beginPath()
			cx.rect(tx, ty, tw, th)
			cx.fillStyle = ui.bg('scrollbar', cs && 'active' || hs && 'hover' || 'normal')[0]
			cx.fill()

		}
	}

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
	cx.shadowOffsetX = a[i+0]
	cx.shadowOffsetY = a[i+1]
	cx.shadowBlur    = a[i+2]
	// TODO: use a[i+3] spread
	// TODO: use a[i+4] inset
	cx.shadowColor   = a[i+5]
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
draw[CMD_FONT_WEIGHT] = set_font_weight
draw[CMD_LINE_GAP] = set_line_gap

function draw_all() {
	screen.style.background = ui.bg('bg')[0]
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

ui.realhit = function(id) {
	return hit_set.has(id)
}

ui.hit = function(id) {
	if (ui.captured(id))
		return true
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
		(ui.mx >= x && ui.mx < x + w) &&
		(ui.my >= y && ui.my < y + h)
	)
}

function hit_box(a, i) {
	let px1 = a[i+PX1+0]
	let py1 = a[i+PX1+1]
	let px2 = a[i+PX2+0]
	let py2 = a[i+PX2+1]
	let x = a[i+0] - px1
	let y = a[i+1] - py1
	let w = a[i+2] + px1 + px2
	let h = a[i+3] + py1 + py2
	return hit_rect(x, y, w, h)
}

hit[CMD_TEXT] = function(a, i) {
	if (hit_box(a, i)) {
		hit_set_id(a[i+TEXT_ID])
		hit_template(a, i)
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

	// fast-test the outer box since we're clipping the contents.
	if (!hit_box(a, i))
		return

	hit_set_id(id)

	hit_template(a, i)

	// test the scrollbars
	for (let axis = 0; axis < 2; axis++) {
		let [visible, tx, ty, tw, th] = scrollbar_rect(a, i, axis, true)
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
	if (hit_box(a, i))
		hit_template(a, i)
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
		hit_template(a, i)
		return true
	}
}

hit[CMD_BB] = function(a, i) {
	let ct_i = a[i+1]
	if (hit_box(a, ct_i)) {
		hit_set_id(a[i+BB_ID])
		hit_template(a, i)
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

	if (ui.mx == null)
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
		measure_req_all()
		a.length = 0
		for (let layer of a.layers)
			layer_clear(layer)
		check_stacks()

		let i = ui.stack()
		begin_layer(layer_base, i)
		ui.set_cursor()
		ui.frame()
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
		reset_keys()
		focusing_id = null
	}
}

reset_all()

// focusing ------------------------------------------------------------------

let focusing_id

ui.focus = function(id) {
	ui.focused_id = id
	focusing_id = id
}

ui.focused = function(id) {
	return id && ui.focused_id == id
}

ui.focusing = function(id) {
	return id && focusing_id == id
}

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

function template_select_node(id, root_t, node_t, node_i) {
	selected_template_id = id
	selected_template_root_t = root_t
	selected_template_node_t = node_t
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
function hit_template(a, i) {
	let id = hit_template_id
	if (id && i >= hit_template_i0 && i < hit_template_i1) {
		let hs = ui.hovers(id)
		let root_t = hs.get('root')
		let node_t = template_find_node(a, i, root_t, hit_template_i0)
		hs.set('node', node_t)
		if (ui.clickup)
			template_select_node(id, root_t, node_t)
		return true
	}
}

function template_add(t) {
	let cmd = cmd_name_map.get(t.t)
	let targs_f = assert(targs[t.t], 'unknown type ', t.t)
	let args = targs_f(t)
	t.i = a.length + 2
	ui[t.t](...args)
	if (t.e)
		for (let ch_t of t.e)
			template_add(ch_t, 0)
	if (cmd < 0)
		ui.end()
}

function template_drag_point(id, ch_t, ct_i, ha, va) {
	ui.popup('', layer_popup, ct_i, ha, va)
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
	let ch_i = ch_t && ch_t.i
	let ct_i = ch_i
	if (a[ct_i-1] == CMD_BB)
		ct_i = a[ct_i+BB_CT_I]
	if (t == selected_template_root_t) {
		template_drag_point(id, ch_t, ct_i, 'l', '[')
		template_drag_point(id, ch_t, ct_i, 'l', 'c')
		template_drag_point(id, ch_t, ct_i, 'l', ']')
		template_drag_point(id, ch_t, ct_i, 'r', '[')
		template_drag_point(id, ch_t, ct_i, 'r', 'c')
		template_drag_point(id, ch_t, ct_i, 'r', ']')
		template_editor(id, t, ch_t)
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
	ui.p(depth * 20, 0, ui.sp05(), ui.sp05())
	ui.stack(t)
		let hit = ui.hit(t)
		if (hit && ui.click)
			template_select_node(id, t_t, t)
		let sel = t == selected_template_node_t
		if (sel)
			ui.bb('', 'selected')
		ui.color('text', hit ? 'hover' : 'normal')
		ui.text('', t.t, 1, 'l')
	ui.end_stack()
	if (t.e)
		for (let ct of t.e)
			draw_node(id, t_t, ct, depth+1)
}
function template_editor(id, t, ch_t) {

	ui.toolbox(id+'.tree_toolbox', 'Tree', ']', 100, 100)
		ui.scrollbox(id+'.tree_toolbox_sb', 1, null, null, null, null, 150, 200)
			ui.p(10)
			ui.v(1, 0, 's', 't')
				draw_node(id, t, t, 0)
			ui.end_v()
		ui.end_scrollbox()
	ui.end_toolbox(id+'.tree_toolbox')

	ui.toolbox(id+'.prop_toolbox', 'Props', ']', 100, 400)
		ui.scrollbox(id+'.prop_toolbox_sb', 1, null, null, null, null, 150, 200)
			ui.v(1, 0, 's', 't')
			let defs = tprops[ch_t.t]
			for (let k in defs) {
				let def = defs[k]
				let v = ch_t[k]
				ui.h()
					ui.bb('', null, 'b', '#666')
					let vs = v != null ? str(v) : (def.default ?? '')
					ui.mb(1)
					ui.p(8, 8, 5, 5)
					ui.text('', k , 1, 'l', 'c', 20)
					ui.mb(1)
					ui.p(8, 8, 5, 5)
					ui.stack()
						if (def.type == 'color') {
							ui.bb('', v, 'l', '#888')
						} else {
							ui.bb('', null, 'l', '#888')
							ui.color(v != null ? '#fff' : '#888')
							ui.text('', vs, 1, 'l', 'c', 20)
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

// button --------------------------------------------------------------------

ui.button = function(id, s, style, align, valign) {
	let hit = ui.hit(id)
	let state = hit ? ui.pressed ? 'active' : 'hover' : 'normal'
	style = style ?? 'button'
	ui.p(ui.sp2(), null, ui.sp1())
	ui.stack(id, 0, align ?? 'c', valign ?? 'c')
		ui.shadow('button')
		ui.bb('', ui.bg(style, state), 1, ui.border('light', state), ui.sp05())
		ui.bold()
		ui.color('text', state)
		ui.text('', s, 0, 'c', 'c')
	ui.end_stack()
	return hit && ui.clickup
}
ui.button_primary = function(id, s, align, valign) {
	return ui.button(id, s, 'button-primary', align, valign)
}
ui.btn = ui.button
ui.btn_pri = ui.button_primary

/*

	<tooltip>         text  target  align  side  kind  icon_visible
	<toaster>         side  align  timeout  spacing
	<list>
	<checklist>
	<menu>
	<tabs>            tabs_side  auto_focus  selected_item_id
	<[v]split>        fixed_side  fixed_size  resizeable  min_size
	<action-band>
	<dlg>
	<toolbox>
	<slides>
	<md>
	<pagenav>
	<label>
	<info>
	<erors>
	<checkbox>
	<toggle>
	<radio>
	<slider>
	<range-slider>
	<input-group>
	<labelbox>
	<input>
	<textarea>
	<[v]select-button>
	<textarea-input>
	<text-input>
	<pass-input>
	<num-input>
	<tags-box>
	<tags-input>
	<dropdown>
	<check-dropdown>
	<calendar>
	<range-calendar>
	<ranges-calendar>
	<date-input>
	<timeofday-input>
	<datetime-input>
	<date-range-input>
	<html-input>
*/

// split ---------------------------------------------------------------------

function split(hv, id, size, unit, fixed_side,
	split_fr, gap, align, valign, min_w, min_h,
) {

	let snap_px = 50
	let splitter_w = 1

	let horiz = hv == 'h'
	let W = horiz ? 'w' : 'h'
	let [state, dx, dy] = ui.drag(id)
	let s = ui.state_map(id)
	let cs = ui.captured(id)
	let max_size = (cs?.get(W) ?? s.get(W) ?? 1/0) - splitter_w
	assert(!unit || unit == 'px' || unit == '%')
	let fixed = unit == 'px'
	size = s.get('size') ?? size
	let fr = fixed ? 0 : (size ?? 0.5)
	let min_size = fixed ? size ?? 0 : 0
	if (state && state != 'hover') {
		if (state == 'drag')
			cs.set(W, s.get(W))
		let size_px = fixed ? min_size : round(fr * max_size)
		size_px += horiz ? dx : dy
		if (size_px < snap_px)
			size_px = 0
		else if (size_px > max_size - snap_px)
			size_px = max_size
		size_px = min(size_px, max_size)
		if (fixed)
			min_size = size_px
		else
			fr = size_px / max_size
		if (state == 'drop')
			s.set('size', fixed ? min_size : fr)
	}

	ui[hv](split_fr, gap, align, valign, min_w, min_h)

	if (state) {
		ui.set_cursor(horiz ? 'ew-resize' : 'ns-resize')
		ui.measure(id)
	}

	// TODO: because max_size is not available on the first frame,
	// the `collapsed` state can be wrong on the first frame! find a way...
	let collapsed = fixed
		? min_size == 0 || (max_size != null && min_size == max_size)
		: fr == 0 || fr == 1

	scope_set('split'   , hv)
	scope_set('split_id', id)
	scope_set('split_collapsed', collapsed)
	scope_set('split_fr2', fixed ? 1 : 1 - fr)

	ui.sb(id+'.scrollbox1', fr, null, null, null, null, min_size)

	return size
}

ui.splitter = function() {

	ui.end_sb()

	let hit_distance = 10

	let hv = scope_get('split')
	let id = scope_get('split_id')
	let collapsed = scope_get('split_collapsed')
	let fr2 = scope_get('split_fr2')
	let b = ui.border('intense', ui.hit(id) ? 'hover' : 'normal')

	if (hv == 'h') {
		ui.stack('', 0, 'l', 's', 1, 0)
			ui.popup('', layer_popup, null, 'it', '[]')
				ui.ml(-hit_distance / 2)
				ui.stack(id, 0, 'l', 's', hit_distance)
					ui.stack('', 1, 'c', 's')
						ui.bb('', null, 'l', b)
					ui.end_stack()
					if (collapsed) {
						ui.stack('', 1, 'c', 'c', 5, 2*ui.sp8())
							ui.bb('', null, 'lr', b)
						ui.end_stack()
					}
				ui.end_stack()
			ui.end_popup()
		ui.end_stack()
	} else {
		ui.stack('', 0, 's', 't', 0, 1)
			ui.popup('', layer_popup, null, 'it', '[]')
				ui.mt(-hit_distance / 2)
				ui.stack(id, 0, 's', 't', 0, hit_distance)
					ui.stack('', 1, 's', 'c')
						ui.bb('', null, 't', b)
					ui.end_stack()
					if (collapsed) {
						ui.stack('', 1, 'c', 'c', 2*ui.sp8(), 5)
							ui.bb('', null, 'tb', b)
						ui.end_stack()
					}
				ui.end_stack()
			ui.end_popup()
		ui.end_stack()
	}

	ui.sb(id+'.scrollbox2', fr2)
}

function end_split(hv) {

	ui.end_sb()

	if (hv == 'h')
		ui.end_h()
	else
		ui.end_v()

}

ui.hsplit = function(...args) { return split('h', ...args) }
ui.vsplit = function(...args) { return split('v', ...args) }

ui.end_hsplit = function() { end_split('h') }
ui.end_vsplit = function() { end_split('v') }

// text-input ----------------------------------------------------------------

ui.input = function(id, s, fr, min_w, min_h) {
	ui.stack('', 0, 's', 's')
		ui.bb('', 'input', 1, ui.border('intense', ui.focused(id) ? 'hover' : 'normal'))
		ui.p(ui.sp1())
		ui.text(id, s, fr, 'l', 'c', null, min_w ?? ui.em(10), min_h, null, true)
	ui.end_stack()
}

ui.label = function(for_id, s) {
	ui.p(ui.sp1())
	ui.text('', s, 1, 'l', 'c')
}

// list ----------------------------------------------------------------------

ui.list = function(id, items, fr, gap, align, valign, item_align, item_valign, item_fr, hv) {
	ui.hv(hv ?? 'v', fr, gap, align, valign, 120)
	let focused_item_i = ui.state(id, 'focused_item_i') ?? 0
	let d =
		ui.keydown(id, 'arrowdown') &&  1 ||
		ui.keydown(id, 'arrowup'  ) && -1 || 0
	if (d) {
		focused_item_i = clamp(focused_item_i + d, 0, items.length-1)
		ui.state_set(id, 'focused_item_i', focused_item_i)
	}
	let i = 0
	for (let item of items) {
		let item_id = id+'.'+i
		if (ui.hit(item_id) && ui.click) {
			ui.focus(id)
			focused_item_i = i
			ui.state_set(id, 'focused_item_i', i)
		}
		i++
	}
	let list_focused = ui.focused(id)
	i = 0
	for (let item of items) {
		let item_id = id+'.'+i
		ui.p(ui.sp05())
		ui.stack(item_id, 0)
			let item_focused = focused_item_i == i
			ui.bb('',
				item_focused
					? ui.bg('cell', list_focused
							? 'item-focused item-selected focused'
							: 'item-focused item-selected')
					: 'bg')
			ui.text('', item, item_fr ?? 1, item_align ?? 'l', item_valign ?? 'c')
		ui.end_stack()
		i++
	}
	ui.end()
	return items[focused_item_i]
}

// drag & drop ---------------------------------------------------------------

{
let out = [null, 0, 0]
ui.drag = function(id, move, dx0, dy0) {
	let move_x = !move || move == 'x' || move == 'xy'
	let move_y = !move || move == 'y' || move == 'xy'
	let dx = dx0 ?? 0
	let dy = dy0 ?? 0
	let cs = ui.captured(id)
	let state
	if (cs) {
		if (move_x) { dx = cs.get('drag_x0') + (ui.mx - ui.mx0) }
		if (move_y) { dy = cs.get('drag_y0') + (ui.my - ui.my0) }
		state = ui.clickup ? 'drop' : 'dragging'
		cs.set('drag_state', state)
	} else if (ui.hit(id)) {
		if (ui.click) {
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

ui.toolbox = function(id, title, align, x0, y0) {

	let align_start = parse_align(align || '[') == ALIGN_START
	let [dstate, dx, dy] = ui.drag(id+'.title')
	let s = ui.state_map(id)
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
	ui.popup(id+'.popup', layer_popup, null, 'it', align, min_w, min_h, 'constrain')
		ui.p(1)
		ui.bb('', 'bg1', 1, 'light')
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

		let side = hit_sides(ui.mx, ui.my, 5, 5, x, y, w, h)
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
		if (dstate == 'hover') {
			let side = hs.get('side')
			ui.set_cursor(cursors[side])
			return true
		}
		if (dstate == 'drag') {
			let side = hs.get('side')
			ui.set_cursor(cursors[side])
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
			ui.set_cursor(cursors[side])
			if (side == 'right' || side == 'bottom_right') {
				let min_w = cs.get('min_w')
				ui.state_map(ct_id).set('min_w', min_w + dx)
			}
			if (side == 'bottom' || side == 'bottom_right') {
				let min_h = cs.get('min_h')
				ui.state_map(ct_id).set('min_h', min_h + dy)
			}
		}

	},
})

}

// color picker --------------------------------------------------------------

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
					hsl_to_rgba(d, (y * w + x) * 4, hue, sat, lum)
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
					hsl_to_rgba(d, (y * w + x) * 4, hue, 1, .5)
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

	create: function(cmd, id, align, valign) {
		return ui_cmd_box(cmd, 1, align ?? 'c', valign ?? 'c', 200, 200, id)
	},

	draw: function(a, i) {

		let x  = a[i+0]
		let y  = a[i+1]
		let sw = a[i+2]
		let sh = a[i+3]
		let id = a[i+S-1]
		let s = ui.state_map(id)

		let cs = ui.captured(id)
		let hs = ui.hovers(id)
		let hit = cs?.get('hit') ?? hs?.get('hit')

		if (ui.click || cs) {
			let cs = ui.capture(id)
			if (ui.click && cs)
				cs.set('hit', hit)
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
			let hs = ui.captured(id) ?? ui.hovers(id)
			hs.set('hit', 'hsl_square')
			hs.set('sat', lerp(ui.mx - x, 0, w-1, 0, 1))
			hs.set('lum', lerp(ui.my - y, 0, h-1, 0, 1))
			return true
		}

		if (hit_rect(x+w+10, y, 20, w)) {
			hit_set_id(id)
			let hs = ui.hovers(id)
			hs.set('hit', 'hue_bar')
			hs.set('hue', lerp(ui.my-y, 0, h-1, 0, 360))
			return true
		}

	},

})
}

// init ----------------------------------------------------------------------

// prevent flicker
theme = ui.default_theme
screen.style.background = ui.bg('bg')[0]

}()) // module function
