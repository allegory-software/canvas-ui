/*

	Canvas IMGUI library with flexbox, widgets and UI designer.
	Written by Cosmin Apreutesei. Public Domain.

LOADING

	<script src=glue.js [global] [extend]>
	<script src=ui.js [global]>

	global flag:   dump the `ui` namespace into `window`.

GLOBLAS

	scrollbar_thickness         = 6
	scrollbar_thickness_active  = 12
	font_size_normal            = 14

THEME DEFINITIONS

	default_theme   = 'dark'
	default_font    = 'Arial'

	* = fg | border | bg
   *_style         (theme, name, state, h, s, L, a, is_dark)      define a color
	shadow_style    (theme, name, x, y, blur, spread, inset, h, s, L, a)  define a shadow

BUILT-IN STYLES

	fg              : text label link button-danger
	bg              : bg bg0 bg1 bg2 bg3 item toggle row
	border          : light intense
	shadow          : button menu modal picker thumb tooltip

BUILT-IN STYLE STATES

	general         : normal hover active focused
	list item       : item-selected item-focused item-error
	grid cell       : new modified

THEME API

	* = fg | border | bg
	*_color         (name, [state], [theme]) -> css_color                 get theme color for fillStyle/strokeStyle
	*_color_hsl     (name, [state], [theme]) -> [css_color, h, s, L, a]   get theme color for hsl_adjust()
	*_color_rgb     (name, [state], [theme]) -> 0xRRGGBB                  get theme color for WebGL, ignoring alpha
	*_color_rgba    (name, [state], [theme]) -> 0xRRGGBBAA                get theme color for WebGL, with alpha
	bg_is_dark      (bg_color) -> t|f                                     based on this, text is white or black
	dark            () -> t|f
	get_theme       () -> dark|light
	hsl             (h, s, L, a) -> css_color              make a CSS color from HSL components
	hsl_adjust      (c, h, s, L, a) -> css_color           make a CSS color from a color_hsl() return value, with h, s, L adjusted
	alpha_adjust    (c, a) -> css_color                    make a CSS color from a color_hsl() return value, with alpha adjusted

	set_shadow      (name)  use in draw callback to set a shadow

RENDERING

	cx              = access to canvas context for drawing
	screen          = access to canvas container div
	animate         ()  request another animation frame
	redraw          ()  request another redraw pass in this frame
	resize          ()  resize canvas and request another animation frame

MOUSE STATE

	pointers        [p1, ...]
	add_pointer     () -> pointer
	pointer         -> p    active pointer

	mx              active pointer x-coord, transformed
	my              active pointer y-coord, transformed
	mx_notrans      active pointer x-coord
	my_notrans      active pointer y-coord
	pressed         active pointer pressed
	click           active pointer clicked
	clickup         active pointer de-clicked
	dblclick        active pointer double-clicked
	wheel_dy        active pointer wheel delta
	trackpad        active pointer is a trackpad

	mouse           = default pointer that tracks the local mouse
	mx0 my0         = mouse position when started dragging
	update_mouse    ()   update mouse coords to current transform
	hit_rect        (x, y, w, h) -> t|f
	hit_bb          (x1, y1, x2, y2) -> t|f  ; bb means boundingbox
	hit_box         (a, i) -> t|f

	captured_id     = id of widget that captured the mouse
	capture         (id) -> captured_state_map         capture the mouse
	captured        (id) -> captured_state_map | null  get captured state if mouse is captured

	hit             (id[, k) -> hit_state_map | v | null    get hit state map if mouse hovers widget and not captured
	hovers          (id) -> hit_state_map | null   get hit state map if mouse hovers widget incl. if mouse captured
	hover           (id) -> hit_state_map       declare that mouse hovers widget
	nohit           ()      exclude last command from hit-testing

	drag            (id, move, dx0, dy0) -> [null|hover|drag|dragging|drop, dx, dy]

	set_cursor      (cursor)   set cursor for this frame

KEYBOARD STATE

	keydown         (key) -> t|f     check if a key was just pressed
	keyup           (key) -> t|f     check if a key was just depressed
	key             (key) -> t|f     check if a key is pressed
	key_events      -> [['down'|'up', key], ...]
	capture_keys    ()    remove current keydown() and keyup() events

LAYERS

	built-in layers : base handle window tooltip open
	layer           (name, index)   define a new layer

SCOPES

	scope           ()
	end_scope       ()
	scope_set       (k, v)
	scope_get       (k) -> v

WIDGET STATE

	keepalive       (id)                 keep another widget alive this frame
	state           (id) -> state_map    get widget state map
	state_init      (id, k, v)           set widget state var if widget is alive
	on_free         (id, free_fn)        add a widget gc hook

FOCUS STATE

	focused_id      = id                 id of focused widget
	focus           (id)                 focus widget
	focused         (id) -> t|f          check if widget is currently focused
	focusing        (id) -> t|f          widget is focusing this frame
	window_focusing   = t                window is focusing this frame
	window_unfocusing = t                window is unfocusing this frame
	window_focused    = t|f              check if window is currently focused

SPACINGS (MARGINS & PADDINGS)

	rem             (rem) -> x   rem units to pixels
	em              (em) -> x    em units to pixels

	sp025           () -> rem( .125)
	sp05            () -> rem( .25)
	sp075           () -> rem( .375)
	sp              () -> rem( .5)
	sp1             () -> rem( .5)
	sp2             () => rem( .75)
	sp4             () => rem(1)
	sp8             () => rem(2)

	p[adding]           ([px1], [py1], [px2], [py2])
	p[adding_]l[eft]    (p)
	p[adding_]r[ight]   (p)
	p[adding_]t[op]     (p)
	p[adding_]b[ottom]  (p)

	m[argin]            ([mx1], [my1], [mx2], [my2])
	m[argin_]l[eft]     (m)
	m[argin_]r[ight]    (m)
	m[argin_]t[op]      (m)
	m[argin_]b[ottom]   (m)

COMMAND RECORDING

	record          ()
	end_record      () -> a1
	play_record     (a1)

WIDGET DEFINITIONS

	cmd             (cmd_id, ...args) -> i0

	widget          (cmd_name, t, is_ct)
	t.measure       : f(a, i, axis)    measure widget on axis (0 for x, 1 for y)
	t.measure_end   : f(a, i, axis)    measure widget on axis at widget's end() call
	t.position      : f(a, i, axis, x, w, ct_i)   position widget on axis
	t.translate     : f(a, i, x, y)               translate widget
	t.draw          : f(a, i, recs)     draw widget
	t.draw_end      : f(a, i)           draw widget at widget's end() call
	t.hit           : f(a, i, recs)     hit-test widget
	t.reindex       : f(a, i, offset)   update widget's internal indices in a
	t.is_flex_child : t|f     has fr at a[i+FR] and min_w/h at a[i+2+axis]
	                          so it can be a child of a flex container.

	measure         (id)        request that widget be measured; puts x,y,w,h in its state map

BOX WIDGET DEFINITIONS

	cmd_box         (cmd, fr, align, valign, min_w, min_h, ...args) -> i0
	box_widget      (cmd_name, t, is_ct)   define a box widget
	box_ct_widget   (cmd_name, t)          define a container box widget

	PX1             = index offset in a for x1 padding; y1 padding at PX1+1
	PX2             = index offset in a for x2 padding; y1 padding at PX2+1
	MX1             = index offset in a for x1 margin; y1 margin at MX1+1
	MX2             = index offset in a for x2 margin; y2 margin at MX2+1
	FR              = index offset in a for fr
	ALIGN           = index offset in a for align
	S               = index offset in a for arg#1 after ui_cmd_box_ct args

	add_ct_min_wh   (a, axis, w)   use in measure callback to declare min width/height

	align_x         (a, i, axis, sx, sw)  use in position callback
	align_w         (a, i, axis, sx, sw)  use in position callback
	inner_x         (a, i, axis, ct_x)    use in position callback
	inner_w         (a, i, axis, ct_x)    use in position callback

	force_scroll    (a, i, sx, sy)  use in translate callback to force-scroll another widget

	ct_i            () -> ct_i    get container index in a; use in widget creation and in measure callback

	popup_target_rect (a, i)  use in draw callback to find a popup's target rect

SCREEN SHARING

	frame           (on_measure, on_frame, fr, align, valign, min_w, min_h)
	shared_screen   (id, answer_con, fr, align, valign, min_w, min_h)

	pack_frame      () -> s     pack current frame for sending over the network
	frame_changed   = noop      hook this for sending frames out

CONTAINERS

	hv              ('h'|'v', fr, gap, align, valign, min_w, min_h)
	h | v           (fr, gap, align, valign, min_w, min_h)
	stack           (id, fr, align, valign, min_w, min_h)
	sb | scrollbox  (id, fr, overflow_x, overflow_y, align, valign, min_w, min_h, sx, sy)
	popup           (id, layer_name, target_i, side, align, min_w, min_h, flags)
	hsplit | vsplit (id, size, unit, fixed_side, split_fr, gap, align, valign, min_w, min_h)
	splitter        ()
	toolbox         (id, title, align, x0, y0, target_i)
	frame           (id, on_measure, on_frame, fr, align, valign, min_w, min_h, ...args)
	end             ()

BORDER & BACKGROUND

	bb              (bg_color, bg_color_state, sides, border_color, border_color_state, border_radius)
	bb_tooltip      (bg_color, bg_color_state,        border_color, border_color_state, border_radius)
	shadow          (x, y, blur, spread, inset, color)

	bg_dots         (id, speed)

TEXT

	color           (color, color_state)
	font            (font)
	fs | font_size  (size)
	font_weight     (weight)
	bold            ()
	nobold          ()
	lh | line_gap   (gap)
	xsmall          ()      ui.font_size(font_size_normal * .72   )   // 10/14
	small           ()      ui.font_size(font_size_normal * .8125 )   // 12/14
	smaller         ()      ui.font_size(font_size_normal * .875  )   // 13/14
	large           ()      ui.font_size(font_size_normal * 1.125 )   // 16/14
	xlarge          ()      ui.font_size(font_size_normal * 1.5   )   // 21/14

	get_font_size   () -> font_size

	text            (id, s, fr, align, valign, max_min_w, min_w, min_h, 'line'|'word'|0, editable, input_type)
	text_editable   (id, s, fr, align, valign, max_min_w, min_w, min_h, input_type)
	text_lines      (id, s, fr, align, valign, max_min_w, min_w, min_h, editable)
	text_wrapped    (id, s, fr, align, valign, max_min_w, min_w, min_h, editable)

	measure_text    (cx, s) -> {w:, asc:, dsc:, {actual|font}BoundingBox{Ascent|Descent|Left|Right}:, }

INPUT

	button          (id, s, fr, align, valign, min_w, min_h, style)
	input           (id, s, fr, min_w, min_h)
	label           (for_id, s, fr, align, valign)
	radio_label     (for_id, for_group_id, s, fr, align, valign)
	dropdown        (id, items, fr, max_min_w, min_w, min_h)
	toggle          (id, fr, align, valign, min_w, min_h)
	checkbox        (cmd, id, fr, align, valign, min_w, min_h)

COLOR PICKER

	color_picker    (id, hue, sat, lum)
	sat_lum_square  (id, hue, sat, lum)
	hue_bar         (id, hue)

UI TEMPLATE EDITOR

	template        (id, t, ...stack_args)

LIST

	[h|v|hv]list    (id, items, fr, align, valign, item_align, item_valign, item_fr, max_min_w, min_w)

OTHER

	drag_point      (id, x, y, color)
	polyline        (id, points, closed, fill_color, fill_color_state, stroke_color, stroke_color_state)
	resizer         (ct_id, id)

TODO

	tooltip         text  target  align  side  kind  icon_visible
	toaster         side  align  timeout  spacing
	checklist
	menu
	tabs            tabs_side  auto_focus  selected_item_id
	action-band
	dialog
	slides
	md
	pagenav
	info
	errors
	range-slider
	input-group
	textarea
	[v]select-button
	textarea-input
	pass-input
	num-input
	tags-box
	tags-input
	check-dropdown
	range-calendar
	ranges-calendar
	date-input
	timeofday-input
	datetime-input
	date-range-input

*/

(function () {
"use strict"
const G = window

let script_attr = k => document.currentScript.hasAttribute(k)
let ui = script_attr('global') || script_attr('ui-global') ? window : {}
G.ui = ui

ui.VERSION = 1

// utilities -----------------------------------------------------------------

const {
	repl,
	isarray, isstr, isnum,
	assert, warn, pr, debug, trace,
	floor, ceil, round, max, min, abs, clamp, logbase, lerp,
	dec, num, str, json, json_arg,
	set, map, array,
	assign, entries, insert, map_assign, remove_value,
	noop, return_true, do_after, do_before,
	runafter,
	memoize,
	freelist,
	hsl_to_rgb_out,
	hsl_to_rgb_hex,
	hsl_to_rgb_int,
	hsl_to_rgba_int,
	PI,
	transform_point_x,
	transform_point_y,
	runevery,
} = glue

let clock_ms = () => performance.now()

let map_freelist   = () => freelist(map)
let array_freelist = () => freelist(array)
let obj_freelist   = () => freelist(obj)

// When capturing the mouse, setting the cursor for the element that
// is hovered doesn't work anymore, so we use this hack instead.
// We haven't even started yet and the DOM is already giving us trouble.
{
let style = document.createElement('style')
document.documentElement.appendChild(style)
ui.set_cursor = function(cursor) {
	// TODO: use style API here, it's probably faster.
	style.innerHTML = cursor && ui.captured_id ? `* {cursor: ${cursor} !important; }` : ''
	canvas.style.cursor = cursor ?? 'initial'
}
}

// styles --------------------------------------------------------------------

ui.css = function(s) {
	let style = document.createElement('style')
	style.innerHTML = s
	document.head.appendChild(style)
}

ui.css(`

* { box-sizing: border-box; }

@font-face { font-family: 'far'    ; src: url('icons/fa-regular-400.woff2'); }
@font-face { font-family: 'fas'    ; src: url('icons/fa-solid-900.woff2'); }
@font-face { font-family: 'fab'    ; src: url('icons/fa-brands-400.woff2'); }
@font-face { font-family: 'lar'    ; src: url('icons/la-regular-400.woff2'); }
@font-face { font-family: 'las'    ; src: url('icons/la-solid-900.woff2'); }
@font-face { font-family: 'lab'    ; src: url('icons/la-brands-400.woff2'); }
@font-face { font-family: 'remix'  ; src: url('icons/remixicon.woff2'); }
@font-face { font-family: 'mio'    ; src: url('icons/material-icons-outlined.woff2'); }

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

.ui-canvas:focus {
	outline: none;
}

.ui-input, .ui-input:focus {
	position: absolute;
	padding: 0;
	margin: 0;
	border: 0;
	background: none;
	outline: none;
}

`)

// colors --------------------------------------------------------------------

function hsl(h, s, L, a) {
	return `hsla(${dec(h)}, ${dec(s * 100)}%, ${dec(L * 100)}%, ${a ?? 1})`
}

function hsl_adjust(c, h, s, L, a) {
	return hsl(c[1] * h, c[2] * s, c[3] * L, (c[4] ?? 1) * (a ?? 1))
}

function alpha_adjust(c, a) {
	return hsl(c[1], c[2], c[3], (c[4] ?? 1) * a)
}

ui.hsl = hsl
ui.hsl_adjust = hsl_adjust
ui.alpha_adjust = alpha_adjust

// themes --------------------------------------------------------------------

ui.scrollbar_thickness = 6
ui.scrollbar_thickness_active = 12

function array_of_objs(n) {
	let a = []
	for (let i = 0; i < n; i++)
		a.push({})
	return a
}

function theme_make(name, is_dark) {
	themes[name] = {
		is_dark : is_dark,
		name    : name,
		// TODO: 255 seems excessive, though it's probably still faster
		// than a hashmap access, dunno...
		fg     : array_of_objs(255),
		border : array_of_objs(255),
		bg     : array_of_objs(255),
		shadow : {},
	}
}
let themes = {}
ui.themes = themes
theme_make('light', false)
theme_make('dark' , true)

// state parsing -------------------------------------------------------------

const STATE_HOVER         =   1
const STATE_ACTIVE        =   2
const STATE_FOCUSED       =   4
const STATE_ITEM_SELECTED =   8
const STATE_ITEM_FOCUSED  =  16
const STATE_ITEM_ERROR    =  32
const STATE_NEW           =  64
const STATE_MODIFIED      = 128

let parse_state_combis = memoize(function(s) {
	s = ' '+s
	let b = 0
	if (s.includes(' hover'        )) b |= STATE_HOVER
	if (s.includes(' active'       )) b |= STATE_ACTIVE
	if (s.includes(' focused'      )) b |= STATE_FOCUSED
	if (s.includes(' item-selected')) b |= STATE_ITEM_SELECTED
	if (s.includes(' item-focused' )) b |= STATE_ITEM_FOCUSED
	if (s.includes(' item-error'   )) b |= STATE_ITEM_ERROR
	if (s.includes(' new'          )) b |= STATE_NEW
	if (s.includes(' modified'     )) b |= STATE_MODIFIED
	return b
})
function parse_state(s) {
	if (!s) return 0
	if (isnum(s)) return s
	if (s == 'normal') return 0
	if (s == 'hover' ) return STATE_HOVER
	if (s == 'active') return STATE_ACTIVE
	return parse_state_combis(s)
}

// styling colors ------------------------------------------------------------

// Colors are defined in HSL so they can be adjusted if needed. Colors are
// specified by (theme, name, state) with state 0 (normal) as fallback.
// Concrete colors can also be specified by prefixing them with a `:` (for
// light colors) or `*` (for dark colors), eg. `:#fff`, `*red`, etc. but that
// throws away the ability to HSL-adjust the color.

function def_color_func(k) {
	function def_color(theme, name, state, h, s, L, a, is_dark) {
		if (theme == '*') { // define color for all themes
			for (let theme_name in themes)
				def_color(theme_name, name, state, h, s, L, a, is_dark)
			return
		}
		let states = themes[theme][k]
		if (state == '*') { // copy all states of a color
			assert(isstr(h), 'expected color name to copy for all states')
			for (let state_i = 0; state_i < states.length; state_i++) {
				let color = states[state_i][h]
				if (color != null)
					states[state_i][name] = color
			}
			return
		}
		let state_i = parse_state(state)
		states[state_i][name] = isnum(h)
			? [hsl(h, s, L, a), h, s, L, a, is_dark]
			: isarray(h) ? h : ui[k+'_color_hsl'](h, s ?? state_i, L ?? theme)
	}
	return def_color
}

let theme
ui.get_theme = () => theme.name
ui.dark = () => theme.is_dark

function lookup_color_hsl_func(k) {
	return function(name, state, theme1) {
		let state_i = parse_state(state)
		theme1 = theme1 ? themes[theme1] : theme
		let c = theme1[k][state_i][name] ?? theme[k][0][name]
		if (!c)
			assert(false, 'no ', k, ' for (', name, ', ',
				repl(state, 0, 'normal'), ', ', theme1.name, ')')
		return c
	}
}

let CC_COLON = ':'.charCodeAt(0) // prefix for light colors
let CC_STAR  = '*'.charCodeAt(0) // prefix for dark colors

function lookup_color_func(hsl_color) {
	return function(name, state, theme) {
		if (name.charCodeAt(0) == CC_COLON) { // custom color
			return name.slice(1)
		}
		return hsl_color(name, state, theme)[0]
	}
}

function lookup_color_rgb_int_func(hsl_color) {
	return function(name, state, theme) {
		let c = hsl_color(name, state, theme)
		return hsl_to_rgb_int(c[1], c[2], c[3])
	}
}

function lookup_color_rgba_int_func(hsl_color) {
	return function(name, state, theme) {
		let c = hsl_color(name, state, theme)
		return hsl_to_rgba_int(c[1], c[2], c[3], c[4])
	}
}

function set_bg_color(color, state) {
	let dark
	assert(isstr(color))
	let c = color.charCodeAt(0)
	if (c == CC_COLON || c == CC_STAR) { // custom color: '*...' or ':...'
		dark = c == CC_STAR
		color = color.slice(1)
	} else {
		let c = bg_color_hsl(color, state)
		dark = c[5] ?? c[3] < .5
		color = c[0]
	}
	theme = dark ? themes.dark : themes.light
	cx.fillStyle = color
}

// text colors ---------------------------------------------------------------

ui.fg_style = def_color_func('fg')
let fg_color_hsl = lookup_color_hsl_func('fg')
let fg_color = lookup_color_func(fg_color_hsl)
ui.fg_color_hsl = fg_color_hsl
ui.fg_color = fg_color
ui.fg_color_rgb  = lookup_color_rgb_int_func(fg_color_hsl)
ui.fg_color_rgba = lookup_color_rgba_int_func(fg_color_hsl)

//           theme    name     state       h     s     L    a
// ---------------------------------------------------------------------------
ui.fg_style('light', 'text'   , 'normal' ,   0, 0.00, 0.00)
ui.fg_style('light', 'text'   , 'hover'  ,   0, 0.00, 0.30)
ui.fg_style('light', 'text'   , 'active' ,   0, 0.00, 0.40)
ui.fg_style('light', 'label'  , 'normal' ,   0, 0.00, 0.00)
ui.fg_style('light', 'label'  , 'hover'  ,   0, 0.00, 0.00, 0.9)
ui.fg_style('light', 'link'   , 'normal' , 222, 0.00, 0.50)
ui.fg_style('light', 'link'   , 'hover'  , 222, 1.00, 0.70)
ui.fg_style('light', 'link'   , 'active' , 222, 1.00, 0.80)

ui.fg_style('dark' , 'text'   , 'normal' ,   0, 0.00, 0.90)
ui.fg_style('dark' , 'text'   , 'hover'  ,   0, 0.00, 1.00)
ui.fg_style('dark' , 'text'   , 'active' ,   0, 0.00, 1.00)
ui.fg_style('dark' , 'label'  , 'normal' ,   0, 0.00, 0.95, 0.7)
ui.fg_style('dark' , 'label'  , 'hover'  ,   0, 0.00, 0.90, 0.9)
ui.fg_style('dark' , 'link'   , 'normal' ,  26, 0.88, 0.60)
ui.fg_style('dark' , 'link'   , 'hover'  ,  26, 0.99, 0.70)
ui.fg_style('dark' , 'link'   , 'active' ,  26, 0.99, 0.80)

ui.fg_style('light', 'marker' , 'normal' ,  61, 1.00, 0.57) // TODO
ui.fg_style('light', 'marker' , 'hover'  ,  61, 1.00, 0.57) // TODO
ui.fg_style('light', 'marker' , 'active' ,  61, 1.00, 0.57) // TODO

ui.fg_style('dark' , 'marker' , 'normal' ,  61, 1.00, 0.57)
ui.fg_style('dark' , 'marker' , 'hover'  ,  61, 1.00, 0.57) // TODO
ui.fg_style('dark' , 'marker' , 'active' ,  61, 1.00, 0.57) // TODO

ui.fg_style('light', 'button-danger', 'normal', 0, 0.54, 0.43)
ui.fg_style('dark' , 'button-danger', 'normal', 0, 0.54, 0.43)

ui.fg_style('light', 'faint' , 'normal' ,  0, 0.00, 0.70)
ui.fg_style('dark' , 'faint' , 'normal' ,  0, 0.00, 0.30)

// border colors -------------------------------------------------------------

ui.border_style = def_color_func('border')
let border_color_hsl = lookup_color_hsl_func('border')
let border_color = lookup_color_func(border_color_hsl)
let border_color_int = lookup_color_rgb_int_func(fg_color_hsl)
let ui_border_color = border_color
ui.border_color_hsl = border_color_hsl
ui.border_color = border_color
ui.border_color_rgb  = lookup_color_rgb_int_func(border_color_hsl)
ui.border_color_rgba = lookup_color_rgba_int_func(border_color_hsl)

//               theme    name        state       h     s     L     a
// ---------------------------------------------------------------------------
ui.border_style('light', 'light'   , 'normal' ,   0,    0,    0, 0.10)
ui.border_style('light', 'light'   , 'hover'  ,   0,    0,    0, 0.30)
ui.border_style('light', 'intense' , 'normal' ,   0,    0,    0, 0.30)
ui.border_style('light', 'intense' , 'hover'  ,   0,    0,    0, 0.40)

ui.border_style('dark' , 'light'   , 'normal' ,   0,    0,    1, 0.09)
ui.border_style('dark' , 'light'   , 'hover'  ,   0,    0,    1, 0.03)
ui.border_style('dark' , 'intense' , 'normal' ,   0,    0,    1, 0.20)
ui.border_style('dark' , 'intense' , 'hover'  ,   0,    0,    1, 0.40)
ui.border_style('dark' , 'marker'  , 'normal' ,  61, 1.00, 0.57, 1.00)

// background colors ---------------------------------------------------------

ui.bg_style = def_color_func('bg')
let bg_color_hsl = lookup_color_hsl_func('bg')
let bg_color = lookup_color_func(bg_color_hsl)
let ui_bg_color = bg_color
ui.bg_color = bg_color
ui.bg_color_hsl = bg_color_hsl
ui.bg_color_rgb  = lookup_color_rgb_int_func(bg_color_hsl)
ui.bg_color_rgba = lookup_color_rgba_int_func(bg_color_hsl)

function bg_is_dark(bg_color) {
	return isarray(bg_color) ? (bg_color[5] ?? bg_color[3] < .5) : theme.is_dark
}
ui.bg_is_dark = bg_is_dark

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
ui.bg_style('light', 'alt'   , 'normal' ,   0, 0.00, 1.08) // bg alternate for grid cells
ui.bg_style('light', 'smoke' , 'normal' ,   0, 0.00, 1.00, 0.80)
ui.bg_style('light', 'input' , 'normal' ,   0, 0.00, 0.98)
ui.bg_style('light', 'input' , 'hover'  ,   0, 0.00, 0.94)
ui.bg_style('light', 'input' , 'active' ,   0, 0.00, 0.90)

ui.bg_style('dark' , 'bg0'   , 'normal' , 216, 0.28, 0.08)
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
ui.bg_style('dark' , 'alt'   , 'normal' , 260, 0.28, 0.13)
ui.bg_style('dark' , 'smoke' , 'normal' ,   0, 0.00, 0.00, 0.70)
ui.bg_style('dark' , 'input' , 'normal' , 216, 0.28, 0.17)
ui.bg_style('dark' , 'input' , 'hover'  , 216, 0.28, 0.21)
ui.bg_style('dark' , 'input' , 'active' , 216, 0.28, 0.25)

// TODO: see if we can find a declarative way to copy fg colors to bg in bulk.
for (let theme of ['light', 'dark']) {
	for (let state of ['normal', 'hover', 'active'])
		for (let fg of ['text', 'link', 'marker'])
			ui.bg_style(theme, fg, state, fg_color_hsl(fg, state, theme))
}

ui.bg_style('light', 'scrollbar', 'normal' ,   0, 0.00, 0.70, 0.5)
ui.bg_style('light', 'scrollbar', 'hover'  ,   0, 0.00, 0.75, 0.8)
ui.bg_style('light', 'scrollbar', 'active' ,   0, 0.00, 0.80, 0.8)

ui.bg_style('dark' , 'scrollbar', 'normal' , 216, 0.28, 0.37, 0.5)
ui.bg_style('dark' , 'scrollbar', 'hover'  , 216, 0.28, 0.39, 0.8)
ui.bg_style('dark' , 'scrollbar', 'active' , 216, 0.28, 0.41, 0.8)

ui.bg_style('*', 'button'        , '*' , 'bg')
ui.bg_style('*', 'button-primary', '*' , 'link')

ui.bg_style('*', 'search' , 'normal',  60,  1.00, 0.80) // quicksearch text bg
ui.bg_style('*', 'info'   , 'normal', 200,  1.00, 0.30) // info bubbles
ui.bg_style('*', 'warn'   , 'normal',  39,  1.00, 0.50) // warning bubbles
ui.bg_style('*', 'error'  , 'normal',   0,  0.54, 0.43) // error bubbles

// input value states
ui.bg_style('light', 'item', 'new'           , 240, 1.00, 0.97)
ui.bg_style('light', 'item', 'modified'      , 120, 1.00, 0.93)
ui.bg_style('light', 'item', 'new modified'  , 180, 0.55, 0.87)
															,
ui.bg_style('dark' , 'item', 'new'           , 240, 0.35, 0.27)
ui.bg_style('dark' , 'item', 'modified'      , 120, 0.59, 0.24)
ui.bg_style('dark' , 'item', 'new modified'  , 157, 0.18, 0.20)

// grid cell & row states. these need to be opaque!
ui.bg_style('light', 'item', 'item-focused'                       ,   0, 0.00, 0.93)
ui.bg_style('light', 'item', 'item-selected'                      ,   0, 0.00, 0.91)
ui.bg_style('light', 'item', 'item-focused item-selected'         ,   0, 0.00, 0.87)
ui.bg_style('light', 'item', 'item-focused focused'               ,   0, 0.00, 0.87)
ui.bg_style('light', 'item', 'item-focused item-selected focused' , 139 / 239 * 360, 141 / 240, 206 / 240)
ui.bg_style('light', 'item', 'item-selected focused'              , 139 / 239 * 360, 150 / 240, 217 / 240)
ui.bg_style('light', 'item', 'item-error'                         ,   0, 0.54, 0.43)
ui.bg_style('light', 'item', 'item-error item-focused'            ,   0, 1.00, 0.60)

ui.bg_style('light', 'row' , 'item-focused focused'               , 139 / 239 * 360, 150 / 240, 231 / 240)
ui.bg_style('light', 'row' , 'item-focused'                       , 139 / 239 * 360,   0 / 240, 231 / 240)
ui.bg_style('light', 'row' , 'item-error item-focused'            ,   0, 1.00, 0.60)

ui.bg_style('dark' , 'item', 'item-focused'                       , 195, 0.06, 0.12)
ui.bg_style('dark' , 'item', 'item-selected'                      ,   0, 0.00, 0.20)
ui.bg_style('dark' , 'item', 'item-focused item-selected'         , 208, 0.11, 0.23)
ui.bg_style('dark' , 'item', 'item-focused focused'               ,   0, 0.00, 0.23)
ui.bg_style('dark' , 'item', 'item-focused item-selected focused' , 211, 0.62, 0.24)
ui.bg_style('dark' , 'item', 'item-selected focused'              , 211, 0.62, 0.19)
ui.bg_style('dark' , 'item', 'item-error'                         ,   0, 0.54, 0.43)
ui.bg_style('dark' , 'item', 'item-error item-focused'            ,   0, 1.00, 0.60)

ui.bg_style('dark' , 'row' , 'item-focused focused'               , 212, 0.61, 0.13)
ui.bg_style('dark' , 'row' , 'item-focused'                       ,   0, 0.00, 0.13)
ui.bg_style('dark' , 'row' , 'item-error item-focused'            ,   0, 1.00, 0.60)

// canvas --------------------------------------------------------------------

// There's only one global canvas stretched to the entire viewport for now
// since we're not planning to have our canvas-based UI embedded in a normal
// HTML page any time soon.

let screen = document.createElement('div')
screen.classList.add('ui-screen')
ui.screen = screen

let canvas = document.createElement('canvas')
canvas.classList.add('ui-canvas')
canvas.setAttribute('tabindex', 0)
screen.appendChild(canvas)

let cx = canvas.getContext('2d')
ui.cx = cx

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
	animate()
}
ui.resize = resize_canvas
window.addEventListener('resize', resize_canvas)

let raf_id
function raf_animate() {
	raf_id = null
	let t0 = clock_ms()
	redraw_all()
	let t1 = clock_ms()
	frame_graph_push('frame_time', t1 - t0)
}
let ready
function animate() {
	if (raf_id) return
	if (!ready) return
	raf_id = requestAnimationFrame(raf_animate)
}
ui.animate = animate

ui.default_theme = document.documentElement.getAttribute('theme') ?? 'light'
ui.default_font  = document.documentElement.getAttribute('font' ) ?? 'Arial'
function set_screen_bg() {
	theme = themes[ui.default_theme]
	document.documentElement.style.background = bg_color('bg')
}
// prevent flicker on load by setting the screen's background color now.
ui.set_default_theme = function(theme) {
	ui.default_theme = theme
	set_screen_bg()
}

document.addEventListener('DOMContentLoaded', function() {
	ready = true
	assert(ui.main, 'ui.main not set')
	document.body.appendChild(ui.screen)
	reset_canvas()
	resize_canvas()
	canvas.focus()
})

// mouse state ---------------------------------------------------------------

// We support multiple pointers for screen sharing / remote control situations
// but only one can be active at any one time, so two users can't hover two
// things at the same time and can't drag multiple things at the same time,
// and other users can't use the mouse while one user is dragging something.
//
// "true" multiple pointer support may sound cool, but it would complicate
// mouse handling *for every widget*, and it would be a nightmare to figure
// out what ops are allowed in the UI while one user is dragging something.

ui.pointers = []

ui.add_pointer = function() {

	let p = {}

	p.mx = null
	p.my = null
	p.pressed = false
	reset_pointer_state(p)

	ui.pointers.push(p)

	p.remove = function() {
		remove_value(ui.pointers, p)
	}

	p.activate = function() {

		if (ui.pointer && ui.pointer != p && ui.pointer.captured)
			return

		ui.pointer = p

		if (!p.captured) {
			if (ui.mx == null && p.mx != null) ui.mouseenter = true
			if (ui.mx != null && p.mx == null) ui.mouseleave = true
		}

		ui.mx         = p.mx
		ui.my         = p.my
		ui.mx_notrans = p.mx
		ui.my_notrans = p.my
		ui.pressed    = p.pressed
		ui.click      = p.click
		ui.clickup    = p.clickup
		ui.dblclick   = p.dblclick
		ui.wheel_dy   = p.wheel_dy
		ui.trackpad   = p.trackpad

		return true
	}

	return p
}

ui.mx0 = null
ui.my0 = null
ui.captured_id = null

ui.mouse = ui.add_pointer()

ui.mouse.activate()

function reset_pointer_state(p) {
	p.click = false
	p.clickup = false
	p.dblclick = false
	p.wheel_dy = 0
	p.trackpad = false
	p.mouseenter = false
	p.mouseleave = false
	p.changed = false
}

function diff_pointer_state(d, s) {
	let o = {}

}

function update_mouse(ev) {
	ui.mouse.mx = round(ev.clientX * dpr)
	ui.mouse.my = round(ev.clientY * dpr)
	ui.mouse.changed = true
}

canvas.addEventListener('pointerdown', function(ev) {
	update_mouse(ev)
	if (ev.button == 0) {
		ui.mouse.click = true
		ui.mouse.pressed = true
		this.setPointerCapture(ev.pointerId)
		ui.mouse.captured = true
	}
	ui.mouse.activate()
	animate()
})

canvas.addEventListener('pointerup', function(ev) {
	update_mouse(ev)
	if (ev.button == 0) {
		ui.mouse.pressed = false
		ui.mouse.clickup = true
		this.releasePointerCapture(ev.pointerId)
		ui.mouse.captured = false
	}
	ui.mouse.activate()
	animate()
})

canvas.addEventListener('dblclick', function(ev) {
	update_mouse(ev)
	if (ev.button == 0) {
		ui.mouse.dblclick = true
	}
	ui.mouse.activate()
	animate()
})

canvas.addEventListener('pointermove', function(ev) {
	update_mouse(ev)
	ui.mouse.activate()
	animate()
})

canvas.addEventListener('pointerenter', function(ev) {
	update_mouse(ev)
	ui.mouse.activate()
	animate()
})

canvas.addEventListener('pointerleave', function(ev) {
	if (ui.pointer != ui.mouse || ui.captured_id == null) {
		ui.mouse.mx = null
		ui.mouse.my = null
	}
	ui.mouse.activate()
	ui.set_cursor()
	animate()
})

// NOTE: wheelDeltaY is 150 in chrome and 120 if FF. Browser developers...
canvas.addEventListener('wheel', function(ev) {
	ui.mouse.wheel_dy = -ev.deltaY
	if (!ui.mouse.wheel_dy)
		return
	ui.mouse.trackpad = ev.wheelDeltaY === -ev.deltaY * 3
	update_mouse(ev)
	ui.mouse.activate()
	animate()
})

function hit_bb(x1, y1, x2, y2) {
	return (
		(ui.mx >= x1 && ui.mx < x2) &&
		(ui.my >= y1 && ui.my < y2)
	)
}
ui.hit_bb = hit_bb
function hit_rect(x, y, w, h) {
	return hit_bb(x, y, x+w, y+h)
}
ui.hit_rect = hit_rect

// mouse pointer on current transform ----------------------------------------

ui.update_mouse = function() {
	let m = cx.getTransform().invertSelf()
	let mx = ui.mx_notrans
	let my = ui.my_notrans
	ui.mx = transform_point_x(m, mx, my)
	ui.my = transform_point_y(m, mx, my)
}

// mouse capture state -------------------------------------------------------

let capture_state = map()

ui.capture = function(id) {
	if (!id)
		return
	if (ui.captured_id != null)
		if (ui.captured_id == id)
			return capture_state
		else
			return
	if (!ui.click)
		return
	let hs = hovers(id)
	if (!hs)
		return
	ui.captured_id = id
	map_assign(capture_state, hs)
	ui.mx0 = ui.mx
	ui.my0 = ui.my
	return capture_state
}

function captured(id) {
	return id && ui.captured_id == id && capture_state || null
}
ui.captured = captured

// drag & drop ---------------------------------------------------------------

{
let out = [null, 0, 0, null]
ui.drag = function(id, axis) {
	let move_x = !axis || axis == 'x' || axis == 'xy'
	let move_y = !axis || axis == 'y' || axis == 'xy'
	let cs = captured(id)
	let state = null
	let dx = 0
	let dy = 0
	if (cs) {
		if (move_x) { dx = ui.mx - ui.mx0 }
		if (move_y) { dy = ui.my - ui.my0 }
		state = ui.clickup ? 'drop' : 'dragging'
		cs.set('drag_state', state)
	} else {
		cs = hit(id)
		if (cs) {
			if (ui.click) {
				cs = ui.capture(id)
				if (cs)
					state = 'drag'
			} else
				state = 'hover'
		}
	}
	out[0] = state
	out[1] = dx
	out[2] = dy
	out[3] = cs
	return out
}
}

// keyboard state ------------------------------------------------------------

let key_state_now = map()
let key_state = set()

ui.key_events = []

canvas.addEventListener('keydown', function(ev) {
	let key = ev.key.toLowerCase()
	key_state_now.set(key, 'down')
	ui.key_events.push(['down', key])
	key_state.add(key)
	animate()
})

canvas.addEventListener('keyup', function(ev) {
	let key = ev.key.toLowerCase()
	key_state_now.set(key, 'up')
	ui.key_events.push(['up', key])
	key_state.delete(key)
	animate()
})

ui.capture_keys = function() {
	key_state_now.clear()
}

ui.keydown = function(key, capture) {
	return key_state_now.get(key) == 'down'
}

ui.keyup = function(key, capture) {
	return key_state_now.get(key) == 'up'
}

ui.key = function(key, capture) {
	return key_state.has(key)
}

// custom events -------------------------------------------------------------

let event_state = map()

ui.fire = function(ev, ...args) {
	event_state.set(ev, args)
}

ui.listen = function(ev) {
	return event_state.get(ev)
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
		end_font(ended_scope)
		end_font_size(ended_scope)
		end_font_weight(ended_scope)
		end_line_gap(ended_scope)
		ended_scope.clear()
		scope_freelist.free(ended_scope)
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
ui.scope_get = scope_get

function scope_set(k, v) {
	scope = scope ?? scope_freelist.alloc()
	scope.set(k, v)
}
ui.scope_set = scope_set

function scope_prev_diff_var(ended_scope, k) {
	let v = ended_scope.get(k)
	if (v === undefined) return
	let v0 = scope_get(k)
	if (v === v0) return
	return v0
}

function scope_stack_check() {
	assert(!scope_stack.length, 'scope not closed')
}

ui.scope = begin_scope
ui.end_scope = end_scope

/* id state maps -------------------------------------------------------------

Persistence between frames is kept in per-id state maps. Widgets need to
call keepalive(id) otherwise their state map is garbage-collected at the end
of the frame. Widgets can also register a `free` callback to be called if
the widget doesn't appear again on a future frame. State updates should be
done inside an update callback registered with keepalive() so that the widget
state can be updated in advance of the widget appearing in the frame in case
the widget state is queried from outside before the widget appears in the frame.
The update callback will be called once per frame, either due to a state access
or when the widget is created in the frame.

*/

let id_state_map_freelist = map_freelist()
let id_state_maps  = map() // {id->map}
let id_current_set = set() // {id}
let id_remove_set  = set() // {id}

ui._id_state_maps = id_state_maps

function keepalive(id, update_f) {
	assert(id, 'id required')
	id_current_set.add(id)
	id_remove_set.delete(id)

	if (update_f) {
		let m = ui.state(id)
		m.set('update', update_f)
	}
}
ui.keepalive = keepalive

function state_update(id, m) {
	let update_f = m.get('update')
	if (!update_f)
		return
	update_f(id, m)
	m.set('update', null)
}

ui.state = function(id, k) {
	if (!id)
		return
	if (ss_id && id != ss_id)
		return
	let m = id_state_maps.get(id)
	if (!m) {
		m = id_state_map_freelist.alloc()
		id_state_maps.set(id, m)
	} else {
		state_update(id, m)
	}
	return k ? m.get(k) : m
}

ui.state_init = function(id, k, v) {
	let s = ui.state(id)
	if (s.has(k)) return
	s.set(k, v)
}

function id_state_gc() {
	for (let id of id_remove_set) {
		let m = id_state_maps.get(id)
		if (!m)
			continue
		assert(!(ui.captured_id == id), 'id removed while captured')
		let free = m.get('free')
		if (free)
			free(m, id)
		id_state_maps.delete(id)
		m.clear()
		id_state_map_freelist.free(m)
	}
	id_remove_set.clear()
	let empty = id_remove_set
	id_remove_set = id_current_set
	id_current_set = empty
}

ui.on_free = function(id, free1) {
	let s = ui.state(id)
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

// command state -------------------------------------------------------------

let color, color_state, font, font_size, font_weight, line_gap

ui.get_font_size = () => font_size

ui.font_size_normal = 14

function reset_canvas() {
	theme = themes[ui.default_theme]
	color = 'text'
	color_state = 0
	font = ui.default_font
	font_size = ui.font_size_normal
	font_weight = 'normal'
	line_gap = 0.5
	scope_set('color', color)
	scope_set('color_state', color_state)
	scope_set('theme', theme)
	scope_set('font', font)
	scope_set('font_size', font_size)
	scope_set('font_weight', font_weight)
	scope_set('line_gap', line_gap)
	cx.font = font_weight + ' ' + font_size + 'px ' + font
	reset_shadow()
}

// focus state ---------------------------------------------------------------

ui.focused_id = null
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

window.addEventListener('blur', function(ev) {
	ui.window_unfocusing = true
	ui.window_focused = false
	key_state.clear()
	key_state_now.clear()
	ui.key_events.length = 0
	animate()
})

ui.window_focused = document.hasFocus()

window.addEventListener('focus', function(ev) {
	ui.window_focusing = true
	ui.window_focused = true
	animate()
})

// container stack -----------------------------------------------------------

// used in both frame creation and measuring stages.

let ct_stack = [] // [ct_i1,...]
ui.ct_stack = ct_stack

ui.ct_i = function() {
	return assert(ct_stack.at(-1), 'no container')
}

function ct_stack_check() {
	if (ct_stack.length) {
		for (let i of ct_stack)
			debug(C(a, i), 'not closed')
		assert(false)
	}
}

// current command recording -------------------------------------------------

// Format of a command recording array:
//
//  next_i, cmd, arg1..n, prev_i, next_i, cmd, arg1..n, ...
//    |            ^        |                    ^
//    |            |        |                    |
//    |            +--------+                    |
//    +------------------------------------------+
//
// With next_i and prev_i we can walk back and forth between commands,
// always landing at the command's arg#1. From the arg#1 index then we have
// the command code at a[i-1], next command's arg#1 at a[i-2] and prev
// command's arg#1 at a[i-3]. To walk the command array as a tree, we check
// when a container starts with `a[i-1] & 1` (all containers have even codes)
// and when it ends with `a[i-1] == CMD_END` (all containers end with the same
// "end" command). To skip all container's children and jump to the next
// sibling we use get_next_ext_i(). To go back to the container's command
// from its "end" command, we use a[i].

let a = [] // current recording.
ui.a = a // published for inspecting only.

let cmd_names = []
let cmd_name_map = map()

function C(a, i) { return cmd_names[a[i-1]] }

let max_cmd    =  0 // even numbers for non-containers (0 is reserved).
let max_cmd_ct = -1 // odd numbers containers
function unsparse(a, i) {
	if (a[i] === undefined)
		a[i] = null
}
function unsparse_all(i) {
	unsparse(measure       , i)
	unsparse(measure_end   , i)
	unsparse(position      , i)
	unsparse(translate     , i)
	unsparse(draw          , i)
	unsparse(draw_end      , i)
	unsparse(hittest       , i)
	unsparse(reindex       , i)
	unsparse(is_flex_child , i)
	unsparse(cmd_names     , i)
}
function cmd(name, is_ct) {
	assert(!cmd_name_map.has(name), 'duplicate command ', name)
	let cmd
	if (is_ct) {
		max_cmd_ct += 2
		cmd = max_cmd_ct
	} else {
		max_cmd += 2
		cmd = max_cmd
	}
	unsparse_all(cmd-1)
	cmd_names[cmd] = name
	cmd_name_map.set(name, cmd)
	return cmd
}
function cmd_ct(name) {
	return cmd(name, true)
}

function ui_cmd(cmd, ...args) {
	let i0 = a.length+2   // index of this cmd's arg#1
	let i1 = i0+args.length+3 // index of next cmd's arg#1
	a.push(i1, cmd, ...args, i0)
	return i0
}
ui.cmd = ui_cmd

// index after the last arg.
let cmd_arg_end_i = (a, i) => a[i-2] - 3

// command recordings --------------------------------------------------------

let rec_freelist = array_freelist()

function rec() {
	let a = rec_freelist.alloc()
	return a
}

function free_rec(a) {
	a.length = 0
	if (a.nohit_set)
		a.nohit_set.clear()
	rec_freelist.free(a)
}

let rec_stack = []

ui.record = function() {
	let a1 = rec()
	rec_stack.push(a)
	a = a1
}

ui.end_record = function() {
	let a1 = a
	a = rec_stack.pop()
	return a1
}

let reindex = []

ui.play_record = function(a1) {

	// fix all indexes in a1 to fit into their new place in a.
	let offset = a.length
	let i = 2
	let n = a1.length
	while (i < n) {
		let next_i = a1[i-2]
		a1[i-2] += offset
		a1[next_i-3] += offset // this cmd's i0
		let cmd = a1[i-1]
		let reindex_f = reindex[cmd]
		if (reindex_f)
			reindex_f(a1, i, offset)
		i = next_i
	}

	a.push(...a1)
	free_rec(a1)
}

function rec_stack_check() {
	assert(!rec_stack.length, 'recordings left unplayed')
}

let recs = []
let rec_i

function begin_rec() {
	let a0 = a
	a = rec()
	rec_i = recs.length
	recs.push(a)
	return a0
}

function end_rec(a0) {
	let a1 = a
	a = a0
	return a1
}

function free_recs() {
	for (let a of recs)
		free_rec(a)
	recs.length = 0
}

// z-layers ------------------------------------------------------------------

let layer_freelist = obj_freelist()
let layer_map = {} // {name->layer}
let layer_arr = [] // [layer1,...]

let layers = [] // [layer1,...]

function ui_layer(name, index) {
	let layer = layer_map[name]
	if (!layer) {
		layer = layer_freelist.alloc() // [popup1_i,...]
		layer.name = assert(name)
		insert(layers, index, layer)
		layer_map[name] = layer
		layer_arr.push(layer)
		layer.i = layer_arr.length-1
		if (!layer.indexes)
			layer.indexes = [] // [rec1_i, ct1_i, rec2_i, ct2_i, ...]
	}
	return layer
}
ui.layer = ui_layer

function clear_layers() {
	for (let layer of layers)
		layer.indexes.length = 0
}

const layer_base =
ui_layer('base'   , 0)
ui_layer('window' , 1) // modals
// all these below must be temporary to work with modals!
ui_layer('overlay', 2) // temporary overlays that must show behind the dragged object.
ui_layer('tooltip', 3)
ui_layer('open'   , 4) // dropdowns, must cover tooltips
ui_layer('handle' , 5) // dragged object

let layer_stack = [] // [layer1_i, ...]
let layer_i // current layer = layer_arr[layer_i]

function begin_layer(layer, i) {
	layer_stack.push(layer_i)
	let layer_i0 = layer_i
	layer_i = layer.i
	// NOTE: adding the cmd on the same layer will just draw it twice but badly
	// since it won't even have the right context!
	if (layer_i != layer_i0)
		layer.indexes.push(rec_i, i)
}

function end_layer() {
	layer_i = layer_stack.pop()
}

ui.begin_layer = function(name) {
	begin_layer(ui_layer(name), a.length+2)
}

ui.end_layer = end_layer

function layer_stack_check() {
	if (layer_stack.length) {
		for (let layer_i of layer_stack)
			debug('layer', layer_arr[layer_i].name, 'not closed')
		assert(false)
	}
}

// rendering phases ----------------------------------------------------------

let measure       = []
let measure_end   = []
let position      = []
let translate     = []
let draw          = []
let draw_end      = []
let hittest       = []
let is_flex_child = []
let pack          = []
let unpack        = []

ui.is_flex_child = is_flex_child

// measuring phase (per-axis) ------------------------------------------------

// walk the element tree bottom-up and call the measure function for each
// element that has it. non-recursive, uses ct_stack and containers'
// measure_end callback to do the work.

function measure_rec(a, axis) {
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
}

// positioning phase (per-axis) ----------------------------------------------

// walk the element tree top-down, and call the position function for each
// element that has it. recursive, uses call stack to pass ct_i.

function position_rec(a, axis, ct_w) {
	let i = 2
	let cmd = a[i-1]
	let min_w = a[i+2+axis]
	let position_f = position[cmd]
	position_f(a, i, axis, 0, max(min_w, ct_w))
}

// translation phase ---------------------------------------------------------

// do scrolling and popup positioning and offset all boxes (top-down, recursive).

function translate_rec(a, x, y) {
	let i = 2
	let cmd = a[i-1]
	let translate_f = translate[cmd]
	if (translate_f)
		translate_f(a, i, x, y)
}

ui.translate = function(a, i) {
	// TODO
}

// drawing phase -------------------------------------------------------------

let theme_stack = []

function draw_cmd(a, i, recs) {
	let next_ext_i = get_next_ext_i(a, i)
	while (i < next_ext_i) {

		let cmd = a[i-1]
		if (cmd & 1) // container
			theme_stack.push(theme)
		else if (cmd == CMD_END)
			theme = theme_stack.pop()

		let draw_f = draw[cmd]
		if (draw_f && draw_f(a, i, recs)) {
			i = get_next_ext_i(a, i)
			if (cmd & 1) // container
				theme = theme_stack.pop()
		} else {
			i = a[i-2] // next_i
		}
	}
}

function draw_frame(recs, layers) {
	let theme_stack_length0 = theme_stack.length
	theme_stack.push(theme)
	theme = themes[ui.default_theme]

	for (let layer of layers) {
		/*global*/ layer_i = layer.i
		let indexes = layer.indexes
		for (let k = 0, n = indexes.length; k < n; k += 2) {
			reset_canvas()
			let rec_i = indexes[k]
			let i     = indexes[k+1]
			let a = recs[rec_i]
			draw_cmd(a, i, recs)
		}
		layer_i = null
	}

	theme = theme_stack.pop()
	assert(theme_stack.length == theme_stack_length0)
}

// hit-testing phase ---------------------------------------------------------

let hit_state_map_freelist = map_freelist()
let hit_state_maps = map() // {id->map}

ui._hit_state_maps = hit_state_maps

function hit(id, k) {
	if (!id) return
	if (ui.captured_id != null) // unavailable while captured
		return
	let m = hit_state_maps.get(id)
	return k ? m?.get(k) : m
}
ui.hit = hit

function hovers(id, k) {
	if (!id) return
	let m = hit_state_maps.get(id)
	return k ? m?.get(k) : m
}
ui.hovers = hovers

function hover(id) {
	if (!id) return
	let m = hit_state_maps.get(id)
	if (!m) {
		m = hit_state_map_freelist.alloc()
		hit_state_maps.set(id, m)
	}
	return m
}
ui.hover = hover

ui.nohit = function() {
	if (!a.nohit_set)
		a.nohit_set = set()
	a.nohit_set.add(a.at(-1))
}

function hit_frame(recs, layers) {

	ui.set_cursor()

	hit_template_id = null
	hit_template_i0 = null

	hit_template_i1 = null
	for (let m of hit_state_maps.values()) {
		m.clear()
		hit_state_map_freelist.free(m)
	}
	hit_state_maps.clear()

	if (ui.mx == null)
		return

	// iterate layers in reverse order.
	for (let j = layers.length-1; j >= 0; j--) {
		let layer = layers[j]
		/*global*/ layer_i = layer.i
		// iterate layer's cointainers in reverse order.
		let indexes = layer.indexes
		for (let k = indexes.length-2; k >= 0; k -= 2) {
			reset_canvas()
			let rec_i = indexes[k]
			let i     = indexes[k+1]
			let a = recs[rec_i]
			let hit_f = hittest[a[i-1]]
			if (!a.nohit_set?.has(i) && hit_f(a, i, recs)) {
				j = -1
				break
			}
		}
	}
	layer_i = null

}

// frame packing -------------------------------------------------------------

// check that cmd is entirely typed.
function check_types(a, i) {
	for (let j = i; j < a[i-2] - 3; j++)
		if (!isnum(a[j]) && !isstr(a[j]))
			pr(C(a, i), j-i, a[j])
}

function check_types_all(a) {
	let i = 2
	while (i < a.length) {
		check_types(a, i)
		i = a[i-2] // next_i
	}
}

let tenc = new TextEncoder()
async function pack_frame_json() {

	let t0 = clock_ms()

	let s = json({
		v: ui.VERSION,
		w: screen_w,
		h: screen_h,
		mx: ui.mouse.mx,
		my: ui.mouse.my,
		recs: recs,
		layers: layers,
	})
	let b = tenc.encode(s)

	let cs = new CompressionStream('gzip')
	let writer = cs.writable.getWriter()
	writer.write(b)
	writer.close()
	let cb = await new Response(cs.readable).arrayBuffer()

	let t1 = clock_ms()

	frame_graph_push('frame_bandwidth'  , (60 * cb.byteLength * 8) / (1024 * 1024)) // Mbps @ 60fps
	frame_graph_push('frame_compression', (cb.byteLength / b.byteLength) * 100)
	frame_graph_push('frame_pack_time'  , t1 - t0)

	return cb
}
let pack_frame = pack_frame_json
ui.pack_frame = pack_frame

// frame unpacking -----------------------------------------------------------

async function decompress_frame(cb) {
	let dcs = new DecompressionStream('gzip')
	let writer = dcs.writable.getWriter()
	writer.write(cb)
	writer.close()
	return await new Response(dcs.readable).arrayBuffer()
}

let tdec = new TextDecoder()
async function unpack_frame_json(ab) {
	let t = json_arg(tdec.decode(ab))
	assert(t.v == ui.VERSION, 'wrong version ', t.v)
	return t
}

async function unpack_frame(cb) {

	let t0 = clock_ms()

	let ab = await decompress_frame(cb)
	let t = await unpack_frame_json(ab)

	let t1 = clock_ms()

	frame_graph_push('frame_unpack_time', t1 - t0)

	return t
}

// p2p connection ------------------------------------------------------------




// measuring requests --------------------------------------------------------

let measure_req = []

ui.measure = function(dest) {
	let i = assert(ct_stack.at(-1), 'measure outside container')
	measure_req.push(dest, a, i)
}

function measure_req_all() {
	for (let k = 0, n = measure_req.length; k < n; k += 3) {
		let dest = measure_req[k+0]
		let a    = measure_req[k+1]
		let i    = measure_req[k+2]
		let s = isstr(dest) ? ui.state(dest) : dest
		s.set('x', a[i+0])
		s.set('y', a[i+1])
		s.set('w', a[i+2])
		s.set('h', a[i+3])
	}
	measure_req.length = 0
}

// animation frame -----------------------------------------------------------

let want_redraw

ui.redraw = function() {
	want_redraw = true
}

function layout_rec(a, x, y, w, h) {
	reset_canvas()

	// x-axis
	measure_rec(a, 0)
	ct_stack_check()
	position_rec(a, 0, w)

	// y-axis
	measure_rec(a, 1)
	ct_stack_check()
	position_rec(a, 1, h)

	translate_rec(a, x, y)
}

function frame_end_check() {
	ct_stack_check()
	layer_stack_check()
	scope_stack_check()
	rec_stack_check()
}

ui.frame_changed = noop

function draw_pointer(p, x0, y0) {
	if (p.mx == null)
		return
	cx.beginPath()
	cx.fillStyle = 'red'
	cx.fillRect(x0 + p.mx, y0 + p.my, 5, 5)
}

function redraw_all() {

	let redraw_count = 0
	while (1) {
		let t0, t1

		want_redraw = false

		t0 = clock_ms()

		hit_frame(recs, layers)

		t1 = clock_ms()
		frame_graph_push('frame_hit_time', t1 - t0)

		measure_req_all()

		clear_layers()
		free_recs()

		t0 = clock_ms()

		begin_rec()
		let i = ui.stack()
		assert(rec_i == 0)
		assert(i == 2)
		begin_layer(layer_base, i)
		ui.main()
		reset_spacings()
		ui.end()
		end_layer()
		frame_end_check()

		t1 = clock_ms()
		frame_graph_push('frame_make_time', t1 - t0)

		t0 = t1

		let a = end_rec()
		layout_rec(a, 0, 0, screen_w, screen_h)

		t1 = clock_ms()
		frame_graph_push('frame_layout_time', t1 - t0)

		id_state_gc()

		if (!want_redraw) {
			t0 = clock_ms()

			cx.clearRect(0, 0, canvas.width, canvas.height)

			draw_frame(recs, layers)

			for (let p of ui.pointers)
				if (p != ui.mouse)
					draw_pointer(p, 0, 0)

			t1 = clock_ms()
			frame_graph_push('frame_draw_time', t1 - t0)

			ui.frame_changed()
		}

		reset_canvas()

		if (ui.clickup) {
			ui.captured_id = null
			capture_state.clear()
		}

		for (let p of ui.pointers)
			reset_pointer_state(p)
		reset_pointer_state(ui)

		key_state_now.clear()
		ui.key_events.length = null
		event_state.clear()
		focusing_id = null
		ui.window_focusing = false
		ui.window_unfocusing = false

		if (!want_redraw)
			break
		redraw_count++
		if (redraw_count > 2) {
			warn('redraw loop detected')
			break
		}
	}
}

// widget API ----------------------------------------------------------------

ui.widget = function(cmd_name, t, is_ct) {
	let reindex_f = t.reindex
	if (is_ct)
		reindex_f = reindex_f ? do_after(box_ct_reindex, reindex_f) : box_ct_reindex
	let _cmd = cmd(cmd_name, is_ct)
	measure       [_cmd] = t.measure
	measure_end   [_cmd] = t.measure_end
	position      [_cmd] = t.position
	translate     [_cmd] = t.translate
	draw          [_cmd] = t.draw
	draw_end      [_cmd] = t.draw_end
	hittest       [_cmd] = t.hit
	reindex       [_cmd] = reindex_f
	is_flex_child [_cmd] = t.is_flex_child
	let create = t.create
	if (create) {
		function wrapper(...args) {
			return create(_cmd, ...args)
		}
		ui[cmd_name] = wrapper
		let setstate = t.setstate
		if (t.setstate) {
			function wrapper(...args) {
				return create(_cmd, ...args)
			}
			ui[cmd_name+'_state'] = wrapper
		}
		return wrapper
	} else {
		return _cmd
	}
}

// box widgets ---------------------------------------------------------------

// a box has min_w, min_h, margin, padding, align, valign, and also `fr`
// if it's is_flex_child. a box can also be a container.
// it's x,y,w,h are calculated by the layouting system using the above.

const PX1        =  4
const PX2        =  6
const MX1        =  8
const MX2        = 10

const FR         = 12 // all `is_flex_child` widgets: fraction from main-axis size.
const ALIGN      = 13 // vert. align at ALIGN+1
const NEXT_EXT_I = 15 // all container-boxes: next command after this one's END command.
const S          = 16 // first index after the ui_cmd_box_ct header.

ui.PX1   = PX1
ui.PX2   = PX2
ui.MX1   = MX1
ui.MX2   = MX2
ui.FR    = FR
ui.ALIGN = ALIGN
ui.S     = S

function spacings(a, i, axis) {
	return (
		a[i+MX1+axis] + a[i+MX2+axis] +
		a[i+PX1+axis] + a[i+PX2+axis]
	)
}

const ALIGN_STRETCH = 0
const ALIGN_START   = 1
const ALIGN_END     = 2
const ALIGN_CENTER  = 3

function parse_align(s) {
	if (isnum(s)) return s
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
	if (isnum(s)) return s
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

// spacings (margins and paddings), applied to the next box cmd and then they are reset.
let px1, px2, py1, py2
let mx1, mx2, my1, my2

ui.rem = rem => round((rem ?? 1) * ui.font_size_normal)
ui. em =  em => round((em  ?? 1) * font_size)

let rem = ui.rem
ui.sp025 = () => rem( .125)
ui.sp05  = () => rem( .25)
ui.sp075 = () => rem( .375)
ui.sp1   = () => rem( .5)
ui.sp2   = () => rem( .75)
ui.sp4   = () => rem(1)
ui.sp8   = () => rem(2)
ui.sp    = ui.sp1

ui.padding = function(_px1, _py1, _px2, _py2) {
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

ui.margin = function(_mx1, _my1, _mx2, _my2) {
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

function reset_spacings() {
	px1 = 0
	py1 = 0
	px2 = 0
	py2 = 0
	mx1 = 0
	my1 = 0
	mx2 = 0
	my2 = 0
}
reset_spacings()

// box command

function ui_cmd_box(cmd, fr, align, valign, min_w, min_h, ...args) {
	let i = ui_cmd(cmd,
		min_w ?? 0, // min_w in measuring phase; x in positioning phase
		min_h ?? 0, // min_h in measuring phase; y in positioning phase
		0, // children's min_w in measuring phase; w in positioning phase
		0, // children's min_h in measuring phase; h in positioning phase
		px1, py1, px2, py2,
		mx1, my1, mx2, my2,
		round(max(0, fr ?? 1) * 1024),
		parse_align  (align  ?? 's'),
		parse_valign (valign ?? 's'),
		...args
	)
	reset_spacings()
	return i
}
ui.cmd_box = ui_cmd_box

// box measure phase

function add_ct_min_wh(a, axis, w) {
	let i = ct_stack.at(-1)
	if (i == null) // root ct
		return
	let cmd = a[i-1]
	let main_axis = is_main_axis(cmd, axis)
	let min_w = a[i+2+axis]
	if (main_axis) {
		let gap = a[i+FLEX_GAP]
		a[i+2+axis] = min_w + w + gap
	} else {
		a[i+2+axis] = max(min_w, w)
	}
}
ui.add_ct_min_wh = add_ct_min_wh

function ct_stack_push(a, i) {
	ct_stack.push(i)
}

// calculate a[i+2]=min_w (for axis=0) or a[i+3]=min_h (for axis=1).
// the minimum dimensions include margins and paddings.
function box_measure(a, i, axis) {
	a[i+2+axis] = max(a[i+2+axis], a[i+0+axis]) // apply own min_w|h
	a[i+2+axis] += spacings(a, i, axis)
	let min_w = a[i+2+axis]
	add_ct_min_wh(a, axis, min_w)
}

// box position phase

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
	return ct_w - spacings(a, i, axis)
}

ui.align_x = align_x
ui.align_w = align_w
ui.inner_x = inner_x
ui.inner_w = inner_w

// calculate a[i+0]=x, a[i+2]=w (for axis=0) or a[i+1]=y, a[i+3]=h (for axis=1).
// the resulting box at a[i+0..3] is the inner box which excludes margins and paddings.
// NOTE: scrolling and popup positioning is done in the translation phase.
function box_position(a, i, axis, sx, sw) {
	a[i+0+axis] = inner_x(a, i, axis, align_x(a, i, axis, sx, sw))
	a[i+2+axis] = inner_w(a, i, axis, align_w(a, i, axis, sw))
}

// box translate phase

function box_translate(a, i, dx, dy) {
	a[i+0] += dx
	a[i+1] += dy
}

// box hit phase

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
ui.hit_box = hit_box

ui.box_widget = function(cmd_name, t, is_ct) {
	let ID = t.ID
	function box_hit(a, i) {
		let x = a[i+0]
		let y = a[i+1]
		let w = a[i+2]
		let h = a[i+3]
		let id = a[i+ID]
		if (hit_rect(x, y, w, h)) {
			hover(id)
			return true
		}
	}
	return ui.widget(cmd_name, {
		measure   : do_after(do_before(box_measure   , t.before_measure  ), t.after_measure  ),
		position  : do_after(do_before(box_position  , t.before_position ), t.after_position ),
		translate : do_after(do_before(box_translate , t.before_translate), t.after_translate),
		hit       : ID != null && box_hit,
		is_flex_child: true,
		...t,
	}, is_ct)
}

// container-box widgets -----------------------------------------------------

function get_next_ext_i(a, i) {
	let cmd = a[i-1]
	if (cmd & 1) // container
		return a[i+NEXT_EXT_I]
	return a[i-2] // next_i
}

// NOTE: `ct` is short for container, which must end with ui.end().
function ui_cmd_box_ct(cmd, fr, align, valign, min_w, min_h, ...args) {
	begin_scope()
	let i = ui_cmd_box(cmd, fr, align, valign, min_w, min_h,
		0, // next_ext_i
		...args
	)
	ct_stack.push(i)
	return i
}

ui.box_ct_widget = function(cmd_name, t) {
	let ret = ui.box_widget(cmd_name, t, true)
	let cmd = cmd_name_map.get(cmd_name)
	ui['end_'+cmd_name] = function() { ui.end(cmd) }
	return ret
}

function box_ct_reindex(a, i, offset) {
	a[i+NEXT_EXT_I] += offset
}

const CMD_END = cmd('end')

ui.end = function(cmd) {
	end_scope()
	let i = assert(ct_stack.pop(), 'end command outside container')
	if (cmd && a[i-1] != cmd)
		assert(false, 'closing ', cmd_names[cmd], ' instead of ', C(a, i))
	let end_i = ui_cmd(CMD_END, i)
	a[i+NEXT_EXT_I] = a[end_i-2] // next_i

	if (a[i-1] == CMD_POPUP) { // TOOD: make this non-specific
		end_layer()
	}
}

reindex[CMD_END] = function(a, i, offset) {
	a[i+0] += offset
}

measure[CMD_END] = function(a, _, axis) {
	let i = assert(ct_stack.pop(), 'end command outside a container')
	let cmd = a[i-1]
	let measure_end_f = measure_end[cmd]
	if (measure_end_f) {
		measure_end_f(a, i, axis)
	} else {
		let main_axis = is_main_axis(cmd, axis)
		let own_min_w = a[i+0+axis]
		let min_w     = a[i+2+axis]
		if (main_axis)
			min_w = max(0, min_w - a[i+FLEX_GAP]) // remove last element's gap
		min_w = max(min_w, own_min_w) + spacings(a, i, axis)
		a[i+2+axis] = min_w
		add_ct_min_wh(a, axis, min_w)
	}
}

draw[CMD_END] = function(a, end_i) {
	let i = a[end_i]
	let draw_end_f = draw_end[a[i-1]]
	if (draw_end_f)
		draw_end_f(a, i)
}

// position phase utils

function position_children_stacked(a, ct_i, axis, sx, sw) {

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

// translate phase utils

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

// hit phase utils

function hit_children(a, i, recs) {

	// hit direct children in reverse paint order.
	let ct_i = i
	let next_ext_i = get_next_ext_i(a, i)
	let end_i = a[next_ext_i-3] // prev_i
	i = a[end_i-3] // prev_i
	let found
	while (i > ct_i) {
		if (a[i-1] == CMD_END)
			i = a[i] // start_i
		let hit_f = hittest[a[i-1]]
		if (hit_f && hit_f(a, i, recs)) {
			found = true
			break
		}
		i = a[i-3] // prev_i
	}

	return found
}

// flex ----------------------------------------------------------------------

const FLEX_GAP = S+0

function ui_hv(cmd, fr, gap, align, valign, min_w, min_h) {
	return ui_cmd_box_ct(cmd, fr, align, valign, min_w, min_h,
		gap ?? 0,
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

ui.end_h = function() { ui.end(CMD_H) }
ui.end_v = function() { ui.end(CMD_V) }

function is_main_axis(cmd, axis) {
	return (
		(cmd == CMD_V ? 1 : 2) == axis ||
		(cmd == CMD_H ? 0 : 2) == axis
	)
}

reindex[CMD_H] = box_ct_reindex
reindex[CMD_V] = box_ct_reindex

measure[CMD_H] = ct_stack_push
measure[CMD_V] = ct_stack_push

function position_flex(a, i, axis, sx, sw) {

	sx = inner_x(a, i, axis, align_x(a, i, axis, sx, sw))
	sw = inner_w(a, i, axis, align_w(a, i, axis, sw))

	a[i+0+axis] = sx
	a[i+2+axis] = sw

	let ct_i = i
	if (is_main_axis(a[i-1], axis)) {

		let i = ct_i

		let next_i = a[i-2]
		let gap    = a[i+FLEX_GAP]

		// compute total gap and total fr.
		let total_fr = 0
		let gap_w = 0
		let n = 0
		i = next_i
		while (a[i-1] != CMD_END) {
			if (is_flex_child[a[i-1]]) {
				total_fr += a[i+FR] / 1024
				n++
			}
			i = get_next_ext_i(a, i)
		}
		gap_w = max(0, (n - 1) * gap)

		if (!total_fr)
			total_fr	= 1

		let total_w = sw - gap_w

		// compute total overflow width and total free width.
		let total_overflow_w = 0
		let total_free_w     = 0
		i = next_i
		while (a[i-1] != CMD_END) {
			if (is_flex_child[a[i-1]]) {

				let min_w = a[i+2+axis]
				let fr    = a[i+FR] / 1024

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
		let ct_sx = sx
		let ct_sw = sw
		while (a[i-1] != CMD_END) {
			if (is_flex_child[a[i-1]]) {

				let min_w = a[i+2+axis]
				let fr    = a[i+FR] / 1024

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
				let position_f = position[a[i-1]]
				position_f(a, i, axis, sx, sw, ct_i)

				sx += sw + gap

			} else {

				let position_f = position[a[i-1]]
				if (position_f)
					position_f(a, i, axis, ct_sx, ct_sw, ct_i)
			}

			i = get_next_ext_i(a, i)
		}

	} else {

		position_children_stacked(a, i, axis, sx, sw)

	}

}
position[CMD_H] = position_flex
position[CMD_V] = position_flex
is_flex_child[CMD_H] = true
is_flex_child[CMD_V] = true

translate[CMD_H] = translate_ct
translate[CMD_V] = translate_ct

function hit_flex(a, i, recs) {
	if (hit_children(a, i, recs))
		return true
	if (hit_box(a, i))
		hit_template(a, i)
}
hittest[CMD_H] = hit_flex
hittest[CMD_V] = hit_flex

// stack ---------------------------------------------------------------------

const STACK_ID = S+0

const CMD_STACK = cmd_ct('stack')

ui.stack = function(id, fr, align, valign, min_w, min_h) {
	return ui_cmd_box_ct(CMD_STACK, fr, align, valign, min_w, min_h,
		id || '')
}

reindex[CMD_STACK] = box_ct_reindex

measure[CMD_STACK] = ct_stack_push

position[CMD_STACK] = function(a, i, axis, sx, sw) {
	let x = inner_x(a, i, axis, align_x(a, i, axis, sx, sw))
	let w = inner_w(a, i, axis, align_w(a, i, axis, sw))
	a[i+0+axis] = x
	a[i+2+axis] = w
	position_children_stacked(a, i, axis, x, w)
}
is_flex_child[CMD_STACK] = true

ui.end_stack = function() { ui.end(CMD_STACK) }

translate[CMD_STACK] = translate_ct

hittest[CMD_STACK] = function(a, i, recs) {
	if (hit_children(a, i, recs)) {
		hover(a[i+STACK_ID])
		return true
	}
	if (hit_box(a, i)) {
		hover(a[i+STACK_ID])
		hit_template(a, i)
	}
}

/*
// clip ----------------------------------------------------------------------

const CMD_CLIP     = cmd('clip')
const CMD_END_CLIP = cmd('end_clip')

const CMD_CLIP_CT_I = 0

ui.clip     = function() { return ui_cmd(CMD_CLIP, ui.ct_i()) }
ui.end_clip = function() { return ui_cmd(CMD_END_CLIP) }

reindex[CMD_CLIP] = function(a, i, offset) {
	a[i+CMD_CLIP_CT_I] += offset
}

draw[CMD_CLIP] = function(a, i) {
	let ct_i = a[i+CMD_CLIP_CT_I]
	let x = a[ct_i+0]
	let y = a[ct_i+1]
	let w = a[ct_i+2]
	let h = a[ct_i+3]
	cx.save()
	cx.beginPath()
	cx.rect(x, y, w, h)
	cx.clip()
}

draw[CMD_END_CLIP] = function() {
	cx.restore()
}
*/

// scrollbox -----------------------------------------------------------------

const SB_OVERFLOW = S+0 // overflow x,y
const SB_CW       = S+2 // content w,h
const SB_ID       = S+4
const SB_SX       = S+5 // scroll x,y
const SB_STATE    = S+7

const SB_OVERFLOW_AUTO    = 0
const SB_OVERFLOW_HIDE    = 1
const SB_OVERFLOW_SCROLL  = 2
const SB_OVERFLOW_CONTAIN = 3 // expand to fit content, like a stack.

function parse_sb_overflow(s) {
	if (s == null   || s == 'auto'   ) return SB_OVERFLOW_AUTO
	if (s === false || s == 'hide'   ) return SB_OVERFLOW_HIDE
	if (s === true  || s == 'scroll' ) return SB_OVERFLOW_SCROLL
	if (               s == 'contain') return SB_OVERFLOW_CONTAIN
	assert(false, 'invalid overflow ', s)
}

const CMD_SCROLLBOX = cmd_ct('scrollbox')

ui.scrollbox = function(id, fr, overflow_x, overflow_y, align, valign, min_w, min_h, sx, sy) {

	overflow_x = parse_sb_overflow(overflow_x)
	overflow_y = parse_sb_overflow(overflow_y)

	if (overflow_x == SB_OVERFLOW_AUTO || overflow_x == SB_OVERFLOW_SCROLL)
		assert(id, 'id required for stateful scrollbox')

	let ss
	if (id) {
		keepalive(id)
		ss = ui.state(id)
		sx = sx ?? ss.get('scroll_x')
		sy = sy ?? ss.get('scroll_y')
	}

	let i = ui_cmd_box_ct(CMD_SCROLLBOX, fr, align, valign, min_w, min_h,
		overflow_x,
		overflow_y,
		0, 0, // content w, h
		id,
		sx ?? 0, // scroll x
		sy ?? 0, // scroll y
		0, // state
	)
	if (ss && sx != 0) ss.set('scroll_x', sx)
	if (ss && sy != 0) ss.set('scroll_y', sy)

	return i
}
ui.sb = ui.scrollbox

ui.scroll_xy = function(a, i, axis) {
	return a[i+SB_SX+axis]
}

ui.end_scrollbox = function() { ui.end(CMD_SCROLLBOX) }
ui.end_sb = ui.end_scrollbox

reindex[CMD_SCROLLBOX] = box_ct_reindex

measure[CMD_SCROLLBOX] = ct_stack_push

measure_end[CMD_SCROLLBOX] = function(a, i, axis) {
	let own_min_w = a[i+0+axis]
	let co_min_w  = a[i+2+axis] // content min_w
	let contain = a[i+SB_OVERFLOW+axis] == SB_OVERFLOW_CONTAIN
	let sb_min_w = max(contain ? co_min_w : 0, own_min_w) // scrollbox min_w
	sb_min_w += spacings(a, i, axis)
	a[i+SB_CW+axis] = co_min_w
	a[i+2+axis] = sb_min_w
	add_ct_min_wh(a, axis, sb_min_w)
}

// NOTE: scrolling is done later in the translation phase.
position[CMD_SCROLLBOX] = function(a, i, axis, sx, sw) {
	let x = inner_x(a, i, axis, align_x(a, i, axis, sx, sw))
	let w = inner_w(a, i, axis, align_w(a, i, axis, sw))
	a[i+0+axis] = x
	a[i+2+axis] = w
	let content_w = a[i+SB_CW+axis]
	position_children_stacked(a, i, axis, x, max(content_w, w))
}
is_flex_child[CMD_SCROLLBOX] = true

// box scroll-to-view box. from box2d.lua.
function scroll_to_view_rect(x, y, w, h, pw, ph, sx, sy) {
	let min_sx = -x
	let min_sy = -y
	let max_sx = -(x + w - pw)
	let max_sy = -(y + h - ph)
	return [
		-clamp(-sx, min_sx, max_sx),
		-clamp(-sy, min_sy, max_sy)
	]
}

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
		let hit_state = 0
		for (let axis = 0; axis < 2; axis++) {

			let [visible, tx, ty, tw, th] = scrollbar_rect(a, i, axis)
			if (!visible)
				continue

			// scroll to view an inner box
			let box = ui.state(id, 'scroll_to_view')
			if (box) {
				let [bx, by, bw, bh] = box
				;[sx, sy] = scroll_to_view_rect(bx, by, bw, bh, w, h, sx, sy)
				a[i+SB_SX+0] = sx
				a[i+SB_SX+1] = sy
				let s = ui.state(id)
				s.set('scroll_x', sx)
				s.set('scroll_y', sy)
				s.delete('scroll_to_view')
			}

			// wheel scrolling
			if (axis && ui.wheel_dy && hit(id)) {
				let sy0 = ui.state(id, 'scroll_y') ?? 0
				sy = clamp(sy - ui.wheel_dy, 0, ch - h)
				ui.state(id).set('scroll_y', sy)
				a[i+SB_SX+1] = sy
			}

			// drag-scrolling
			let sbar_id = id+'.scrollbar'+axis
			let cs = captured(sbar_id)
			let hs
			if (cs) {
				if (!axis) {
					let psx0 = cs.get('ps0')
					let dpsx = (ui.mx - ui.mx0) / (w - tw)
					sx = clamp(round((psx0 + dpsx) * (cw - w)), 0, cw - w)
					ui.state(id).set('scroll_x', sx)
					a[i+SB_SX+0] = sx
				} else {
					let psy0 = cs.get('ps0')
					let dpsy = (ui.my - ui.my0) / (h - th)
					sy = clamp(round((psy0 + dpsy) * (ch - h)), 0, ch - h)
					ui.state(id).set('scroll_y', sy)
					a[i+SB_SX+1] = sy
				}
			} else {
				hs = hit(sbar_id)
				if (!hs)
					continue
				let cs = ui.capture(sbar_id)
				if (cs)
					cs.set('ps0', !axis ? psx : psy)
			}

			// bits 0..1 = horiz state; bits 2..3 = vert. state.
			hit_state |= (cs ? 2 : hs ? 1 : 0) << (2 * axis)
		}
		a[i+SB_STATE] = hit_state
	}

	translate_children(a, i, dx - sx, dy - sy)

}

// can be used inside the translate phase of a widget to re-scroll
// another widget that might have already been scrolled.
ui.force_scroll = function(a, i, sx, sy) {

	let w   = a[i+2]
	let h   = a[i+3]
	let cw  = a[i+SB_CW+0]
	let ch  = a[i+SB_CW+1]
	let sx0 = a[i+SB_SX+0]
	let sy0 = a[i+SB_SX+1]

	sx = max(0, min(sx, cw - w))
	sy = max(0, min(sy, ch - h))

	a[i+SB_SX+0] = sx
	a[i+SB_SX+1] = sy

	// make it persistent
	let id = a[i+SB_ID]
	if (id) {
		let s = ui.state(id)
		s.set('scroll_x', sx)
		s.set('scroll_y', sy)
	}

	translate_children(a, i, sx0-sx, sy0-sy)
}

ui.scroll_to_view = function(id, x, y, w, h) {
	ui.state(id).set('scroll_to_view', [x, y, w, h])
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

let scrollbar_rect; {
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
	let overflow_x = a[i+SB_OVERFLOW+0]
	let overflow_y = a[i+SB_OVERFLOW+1]
	sx = max(0, min(sx, cw - w))
	sy = max(0, min(sy, ch - h))
	let psx = sx / (cw - w)
	let psy = sy / (ch - h)
	let pw = w / cw
	let ph = h / ch
	let thickness = ui.scrollbar_thickness
	let thickness_active = active ? ui.scrollbar_thickness_active : thickness
	let visible, tx, ty, tw, th
	let h_visible = overflow_x != SB_OVERFLOW_HIDE && pw < 1
	let v_visible = overflow_y != SB_OVERFLOW_HIDE && ph < 1
	let both_visible = h_visible && v_visible && 1 || 0
	let bar_min_len = round(2 * ui.font_size_normal)
	if (!axis) {
		visible = h_visible
		if (visible) {
			let bw = w - both_visible * thickness
			tw = max(min(bar_min_len, bw), pw * bw)
			th = thickness_active
			tx = psx * (bw - tw)
			ty = h - th
		}
	} else {
		visible = v_visible
		if (visible) {
			let bh = h - both_visible * thickness
			th = max(min(bar_min_len, bh), ph * bh)
			tw = thickness_active
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

draw_end[CMD_SCROLLBOX] = function(a, i) {

	cx.restore()

	for (let axis = 0; axis < 2; axis++) {

		let state = (a[i+SB_STATE] >> (2 * axis)) & 3
		state = state == 2 && 'active' || state && 'hover' || null

		let [visible, tx, ty, tw, th] = scrollbar_rect(a, i, axis, !!state)

		if (!visible)
			continue

		cx.beginPath()
		cx.rect(tx, ty, tw, th)
		cx.fillStyle = bg_color('scrollbar', state)
		cx.fill()

	}
}

hittest[CMD_SCROLLBOX] = function(a, i, recs) {
	let id = a[i+SB_ID]

	// fast-test the outer box since we're clipping the contents.
	if (!hit_box(a, i))
		return

	hover(id)

	hit_template(a, i)

	// test the scrollbars
	for (let axis = 0; axis < 2; axis++) {
		let [visible, tx, ty, tw, th] = scrollbar_rect(a, i, axis, true)
		if (!visible)
			continue
		if (!hit_rect(tx, ty, tw, th))
			continue
		hover(id+'.scrollbar'+axis)
		return true
	}

	// test the children
	hit_children(a, i, recs)

	return true
}

// popup ---------------------------------------------------------------------

const POPUP_SIDE_CENTER       = 0 // only POPUP_SIDE_INNER_CENTER is valid!
const POPUP_SIDE_LR           = 2
const POPUP_SIDE_TB           = 4
const POPUP_SIDE_INNER        = 8
const POPUP_SIDE_LEFT         = POPUP_SIDE_LR + 0
const POPUP_SIDE_RIGHT        = POPUP_SIDE_LR + 1
const POPUP_SIDE_TOP          = POPUP_SIDE_TB + 0
const POPUP_SIDE_BOTTOM       = POPUP_SIDE_TB + 1
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

const POPUP_ID        = FR      // because fr is not used
const POPUP_SIDE      = ALIGN   // because align is not used
const POPUP_ALIGN     = ALIGN+1 // because valign is not used
const POPUP_LAYER_I   = S+0
const POPUP_TARGET_I  = S+1
const POPUP_FLAGS     = S+2
const POPUP_SIDE_REAL = S+3

const POPUP_TARGET_SCREEN = -1

const CMD_POPUP = cmd_ct('popup')

ui.popup = function(id, layer_name, target_i, side, align, min_w, min_h, flags) {
	let layer = layer_name ? ui_layer(layer_name) : layer_arr[layer_i]
	target_i = repl(target_i, 'screen', POPUP_TARGET_SCREEN) ?? ui.ct_i()
	side  = popup_parse_side  (side  ?? 't')
	align = popup_parse_align (align ?? 'c')
	flags = popup_parse_flags (flags ?? '')

	let i = ui_cmd_box_ct(CMD_POPUP,
		null, // fr -> id
		null, // align -> side
		null, // valign -> align
		min_w, min_h,
		// S+0
		layer.i, target_i, flags,
		side, // side_real
	)
	a[i+POPUP_ID   ] = id
	a[i+POPUP_SIDE ] = side
	a[i+POPUP_ALIGN] = align
	begin_layer(layer, i)
	if (layer.i != layer_i)
		force_scope_vars()
	return i
}

reindex[CMD_POPUP] = function(a, i, offset) {
	box_ct_reindex(a, i, offset)
	if (a[i+POPUP_TARGET_I] >= 0)
		a[i+POPUP_TARGET_I] += offset
}

ui.end_popup = function() { ui.end(CMD_POPUP) }

measure[CMD_POPUP] = ct_stack_push

measure_end[CMD_POPUP] = function(a, i, axis) {
	a[i+2+axis] = max(a[i+2+axis], a[i+0+axis]) // apply own min_w|h
	a[i+2+axis] += spacings(a, i, axis)
	// popups don't affect their target's layout so no add_ct_min_wh() call.
}

// NOTE: popup positioning is done later in the translation phase.
// NOTE: sw is always 0 because popups have fr=0, so we don't use it.
position[CMD_POPUP] = function(a, i, axis, sx, sw) {

	// stretched popups stretch to the dimensions of their target.
	let target_i = a[i+POPUP_TARGET_I]
	let side     = a[i+POPUP_SIDE]
	let align    = a[i+POPUP_ALIGN]
	if (side && align == POPUP_ALIGN_STRETCH) {
		if (target_i == POPUP_TARGET_SCREEN) {
			a[i+2+axis] = (axis ? screen_h : screen_w) - 2*screen_margin
		} else {
			// TODO: align border rects here!
			let ct_w = a[target_i+2+axis] + spacings(a, target_i, axis)
			a[i+2+axis] = max(a[i+2+axis], ct_w)
		}
	}

	let w = inner_w(a, i, axis, a[i+2+axis])
	a[i+2+axis] = w
	position_children_stacked(a, i, axis, 0, w)
}

{
let tx1, ty1, tx2, ty2
let screen_margin = 10

// a popup's target rect is the target's border rect.
function get_popup_target_rect(a, i) {

	let ct_i = a[i+POPUP_TARGET_I]

	if (ct_i == POPUP_TARGET_SCREEN) {

		let d = screen_margin
		tx1 = d
		ty1 = d
		tx2 = screen_w - d
		ty2 = screen_h - d

	} else {

		tx1 = a[ct_i+0] - a[ct_i+PX1+0]
		ty1 = a[ct_i+1] - a[ct_i+PX1+1]
		tx2 = a[ct_i+2] + tx1 + a[ct_i+PX2+0]
		ty2 = a[ct_i+3] + ty1 + a[ct_i+PX2+1]

	}

}

let x, y

function position_popup(w, h, side, align) {

	let tw = tx2 - tx1
	let th = ty2 - ty1

	if (side == POPUP_SIDE_RIGHT) {
		x = tx2 - 1
		y = ty1
	} else if (side == POPUP_SIDE_LEFT) {
		x = tx1 - w + 1
		y = ty1
	} else if (side == POPUP_SIDE_TOP) {
		x = tx1
		y = ty1 - h + 1
	} else if (side == POPUP_SIDE_BOTTOM) {
		x = tx1
		y = ty2 - 1
	} else if (side == POPUP_SIDE_INNER_RIGHT) {
		x = tx2 - w
		y = ty1
	} else if (side == POPUP_SIDE_INNER_LEFT) {
		x = tx1
		y = ty1
	} else if (side == POPUP_SIDE_INNER_TOP) {
		x = tx1
		y = ty1
	} else if (side == POPUP_SIDE_INNER_BOTTOM) {
		x = tx1
		y = ty2 - h
	} else if (side == POPUP_SIDE_INNER_CENTER) {
		x = tx1 + round((tw - w) / 2)
		y = ty1 + round((th - h) / 2)
	} else {
		assert(false)
	}

	let sdx = side & POPUP_SIDE_LR
	let sdy = side & POPUP_SIDE_TB

	if (align == POPUP_ALIGN_CENTER && sdy)
		x += round((tw - w) / 2)
	else if (align == POPUP_ALIGN_CENTER && sdx)
		y += round((th - h) / 2)
	else if (align == POPUP_ALIGN_END && sdy)
		x += tw - w
	else if (align == POPUP_ALIGN_END && sdx)
		y += th - h

}

translate[CMD_POPUP] = function(a, i, dx_not_used, dy_not_used) {

	let bw = screen_w
	let bh = screen_h

	get_popup_target_rect(a, i)

	let spx   = spacings(a, i, 0)
	let spy   = spacings(a, i, 1)
	let w     = a[i+2] + spx
	let h     = a[i+3] + spy
	let side  = a[i+POPUP_SIDE]
	let align = a[i+POPUP_ALIGN]
	let flags = a[i+POPUP_FLAGS]

	position_popup(w, h, side, align)

	if (flags & POPUP_FIT_CHANGE_SIDE) {

		// if popup doesn't fit the screen, first try to change its side
		// or alignment and relayout, and if that doesn't work, its offset.

		let d = screen_margin
		let out_x1 = x < d
		let out_y1 = y < d
		let out_x2 = x + w > (bw - d)
		let out_y2 = y + h > (bh - d)

		let side0 = side
		if (side == POPUP_SIDE_BOTTOM && out_y2)
			side = POPUP_SIDE_TOP
		 else if (side == POPUP_SIDE_TOP && out_y1)
			side = POPUP_SIDE_BOTTOM
		 else if (side == POPUP_SIDE_RIGHT && out_x2)
			side = POPUP_SIDE_LEFT
		 else if (side == POPUP_SIDE_LEFT && out_x1)
			side = POPUP_SIDE_RIGHT

		if (side != side0) {
			position_popup(w, h, side, align)
			a[i+POPUP_SIDE_REAL] = side
		}

	}

	// if nothing else works, adjust the offset to fit the screen.
	if (flags & POPUP_FIT_CONSTRAIN) {
		let d = screen_margin
		let ox2 = max(0, x + w - (bw - d))
		let ox1 = min(0, x - d)
		let oy2 = max(0, y + h - (bh - d))
		let oy1 = min(0, y - d)
		x -= ox1 ? ox1 : ox2
		y -= oy1 ? oy1 : oy2
	}

	x += a[i+MX1+0] + a[i+PX1+0]
	y += a[i+MX1+1] + a[i+PX1+1]

	a[i+0] = x
	a[i+1] = y
	a[i+2] = w - spx
	a[i+3] = h - spy

	translate_children(a, i, x, y)

}

let out = [0, 0, 0, 0]
ui.popup_target_rect = function(a, i) {
	get_popup_target_rect(a, i)
	out[0] = tx1
	out[1] = ty1
	out[2] = tx2
	out[3] = ty2
	return out
}

}

draw[CMD_POPUP] = function(a, i) {
	let popup_layer_i = a[i+POPUP_LAYER_I]
	if (popup_layer_i != layer_i)
		return true
}

hittest[CMD_POPUP] = function(a, i, recs) {

	let popup_layer_i = a[i+POPUP_LAYER_I]
	if (popup_layer_i != layer_i)
		return

	return hit_children(a, i, recs)
}

// tooltip background & border -----------------------------------------------

function tooltip_tip_cut_center(x1, x2, align, r, d) {
	if (align == POPUP_ALIGN_START)
		return x1+r + d/2
	else if (align == POPUP_ALIGN_END)
		return x2-r - d/2
	else if (align == POPUP_ALIGN_CENTER)
		return x2-r - (x2-x1-2*r)/2
}
function tooltip_path(cx, x1, y1, x2, y2, side, tx, ty, b1x, b1y, b2x, b2y, r, d) {
	cx.beginPath()
	// left side
	cx.moveTo(x1, y2-r)
	if (side == POPUP_SIDE_RIGHT) {
		cx.lineTo(x1, b2y)
		cx.lineTo(tx, ty)
		cx.lineTo(x1, b1y)
	}
	cx.lineTo(x1, y1+r); if (r) cx.arcTo(x1, y1, x1+r, y1, r)
	// top side
	if (side == POPUP_SIDE_BOTTOM) {
		cx.lineTo(b1x, y1)
		cx.lineTo(tx, ty)
		cx.lineTo(b2x, y1)
	}
	cx.lineTo(x2-r, y1); if (r) cx.arcTo(x2, y1, x2, y1+r, r)
	// right side
	if (side	== POPUP_SIDE_LEFT) {
		cx.lineTo(x2, b1y)
		cx.lineTo(tx, ty)
		cx.lineTo(x2, b2y)
	}
	cx.lineTo(x2, y2-r); if (r) cx.arcTo(x2, y2, x2-r, y2, r)
	// bottom side
	if (side == POPUP_SIDE_TOP) {
		cx.lineTo(b2x, y2)
		cx.lineTo(tx, ty)
		cx.lineTo(b1x, y2)
	}
	cx.lineTo(x1+r, y2); if (r) cx.arcTo(x1, y2, x1, y2-r, r)
}

const BB_TOOLTIP_CT_I = 0

const CMD_BB_TOOLTIP = cmd('bb_tooltip')

ui.bb_tooltip = function(bg_color, bg_color_state, border_color, border_color_state, border_radius) {
	let ct_i = ui.ct_i()
	assert(a[ct_i-1] == CMD_POPUP, 'bb_tooltip container must be a popup')
	return ui_cmd(CMD_BB_TOOLTIP, ct_i, bg_color ?? 0, parse_state(bg_color_state),
		border_color ?? 0, parse_state(border_color_state),
		round((border_radius ?? 0) * 128),
	)
}

reindex[CMD_BB_TOOLTIP] = function(a, i, offset) {
	a[i+0] += offset
}

cx.fillStyle = bg_color

draw[CMD_BB_TOOLTIP] = function(a, i) {
	let ct_i = a[i+BB_TOOLTIP_CT_I]

	let px1 = a[ct_i+PX1+0]
	let py1 = a[ct_i+PX1+1]
	let px2 = a[ct_i+PX2+0]
	let py2 = a[ct_i+PX2+1]
	let x   = a[ct_i+0] - px1
	let y   = a[ct_i+1] - py1
	let w   = a[ct_i+2] + px1 + px2
	let h   = a[ct_i+3] + py1 + py2

	let bg_color           = a[i+2]
	let bg_color_state     = a[i+3]
	let border_color       = a[i+4]
	let border_color_state = a[i+5]
	let r                  = a[i+6] / 128 // border radius

	let side  = a[ct_i+POPUP_SIDE_REAL]
	let align = a[ct_i+POPUP_ALIGN]

	let T = POPUP_SIDE_TOP
	let B = POPUP_SIDE_BOTTOM
	let L = POPUP_SIDE_LEFT
	let R = POPUP_SIDE_RIGHT
	let S = POPUP_ALIGN_START
	let E = POPUP_ALIGN_END

	let m = ui.sp2() // margin away from the target's corners.
	let d = ui.sp2() // tooltip's tip base width.

	// find tooltip tip's tip point.
	let [tx1, ty1, tx2, ty2] = ui.popup_target_rect(a, ct_i)
	let tx, ty
	if (side == T && align == S) {
		tx = tx1 + m
		ty = ty1
	} else if (side == L && align == S) {
		tx = tx1
		ty = ty1 + m
	} else if (side == T && align == E) {
		tx = tx2 - m
		ty = ty1
	} else if (side == R && align == S) {
		tx = tx2
		ty = ty1 + m
	} else if (side == B && align == S) {
		tx = tx1 + m
		ty = ty2
	} else if (side == L && align == E) {
		tx = tx1
		ty = ty2 - m
	} else if (side == B && align == E) {
		tx = tx2 - m
		ty = ty2
	} else if (side == R && align == E) {
		tx = tx2
		ty = ty2 - m
	} else if (align == POPUP_ALIGN_CENTER) {
		if (side & POPUP_SIDE_TB) {
			tx = tx1 + (tx2 - tx1) / 2
			ty = side == T ? ty1 : ty2
		} else {
			ty = ty1 + (ty2 - ty1) / 2
			tx = side == L ? tx1 : tx2
		}
	}

	// find tooltip tip's base points.
	let bx, by // tip's center point between its two base points.
	let b1x, b1y
	let b2x, b2y
	let x1 = x
	let y1 = y
	let x2 = x1 + w
	let y2 = y1 + h
	if (side & POPUP_SIDE_LR) {
		bx = side == L ? x2 : x1
		by = clamp(ty, y1+r + d/2, y2-r - d/2)
		b1x = bx
		b2x = bx
		b1y = by - d/2
		b2y = by + d/2
	} else {
		by = side == T ? y2 : y1
		bx = clamp(tx, x1+r + d/2, x2-r - d/2)
		b1y = by
		b2y = by
		b1x = bx - d/2
		b2x = bx + d/2
	}

	// align tooltip tip's tip point to its base' center point.
	if (side & POPUP_SIDE_LR) {
		ty = clamp(by, ty1+d, ty2-d)
	} else {
		tx = clamp(bx, tx1+d, tx2-d)
	}

	// in case `m` was too big...
	tx = clamp(tx, tx1, tx2)
	ty = clamp(ty, ty1, ty2)

	if (bg_color) {
		set_bg_color(bg_color, bg_color_state)
		tooltip_path(cx, x, y, x + w, y + h,
			side, tx, ty, b1x, b1y, b2x, b2y, r, d)
		cx.fill()
	}
	if (shadow_set)
		reset_shadow()
	if (border_color) {
		cx.strokeStyle = ui_border_color(border_color, border_color_state)
		cx.lineCap = 'square'
		tooltip_path(cx, x + .5, y + .5, x + w - .5, y + h - .5,
			side, tx, ty, b1x, b1y, b2x, b2y, r, d)
		cx.stroke()
		cx.lineCap = 'butt'
	}

}

// box shadow ----------------------------------------------------------------

ui.shadow_style = function(theme, name, x, y, blur, spread, inset, h, s, L, a) {
	themes[theme].shadow[name] = [x, y, blur, spread, inset, hsl(h, s, L, a), h, s, L, a]
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
ui.shadow_style('dark', 'picker'  ,  0,  2, 15, 1, false, 0, 0, 0, .8)

const CMD_SHADOW = cmd('shadow')

ui.shadow = function(x, y, blur, spread, inset, color) {
	if (isstr(x))
		x = assert(theme.shadow[x])
	if (isarray(x))
		[x, y, blur, spread, inset, color] = x
	ui_cmd(CMD_SHADOW, x, y, blur, spread, inset ? 1 : 0, color)
}

let shadow_set

// TODO: use spread & inset
ui.set_shadow = function(s) {
	let [x, y, blur, spread, inset, color] = assert(theme.shadow[s], 'unknown shadow ', s)
	cx.shadowBlur    = blur
	cx.shadowOffsetX = x
	cx.shadowOffsetY = y
	cx.shadowColor   = color
	shadow_set = true
}

draw[CMD_SHADOW] = function(a, i) {
	cx.shadowOffsetX = a[i+0]
	cx.shadowOffsetY = a[i+1]
	cx.shadowBlur    = a[i+2]
	// TODO: use a[i+3] spread
	// TODO: use a[i+4] inset
	cx.shadowColor   = a[i+5]
	shadow_set = true
}

function reset_shadow() {
	cx.shadowBlur    = 0
	cx.shadowOffsetX = 0
	cx.shadowOffsetY = 0
	shadow_set = false
}

// background & border -------------------------------------------------------

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

const BB_CT_I = 0

const CMD_BB = cmd('bb') // border-background

let border_dashes = {
	dots   : [1, 1],
	dashes : [2, 6],
}

ui.bb = function(
	bg_color, bg_color_state,
	border_sides, border_color, border_color_state, border_radius, border_dash
) {
	if (border_dash)
		assert(border_dashes[border_dash], 'invalid border dash ', border_dash)
	ui_cmd(CMD_BB, ui.ct_i(), bg_color ?? 0, parse_state(bg_color_state),
		parse_border_sides(border_sides), border_color ?? 0, parse_state(border_color_state),
		round((border_radius ?? 0) * 128),
		border_dash ?? null,
	)
}

ui.border = function(border_sides, border_color, border_color_state, border_radius, border_dash) {
	return ui.bb(null, null, border_sides ?? true, border_color,
		border_color_state, border_radius, border_dash)
}

reindex[CMD_BB] = function(a, i, offset) {
	a[i+BB_CT_I] += offset
}

let border_paths
{
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

function bg_path(cx, x1, y1, x2, y2, sides, r) {
	cx.beginPath()
	if (sides == BORDER_SIDE_ALL)
		if (!r)
			cx.rect(x1, y1, x2-x1, y2-y1)
		else
			cx.roundRect(x1, y1, x2-x1, y2-y1, r)
	else {
		let rlb = (sides & BORDER_SIDE_L) && (sides & BORDER_SIDE_B) && r || 0
		let rlt = (sides & BORDER_SIDE_L) && (sides & BORDER_SIDE_T) && r || 0
		let rrt = (sides & BORDER_SIDE_R) && (sides & BORDER_SIDE_T) && r || 0
		let rrb = (sides & BORDER_SIDE_R) && (sides & BORDER_SIDE_B) && r || 0
		cx.moveTo(x1, y2-rlb);
		cx.lineTo(x1, y1+rlt); if (rlt) cx.arcTo(x1, y1, x1+rlt, y1, rlt);
		cx.lineTo(x2-rrt, y1); if (rrt) cx.arcTo(x2, y1, x2, y1+rrt, rrt);
		cx.lineTo(x2, y2-rrb); if (rrb) cx.arcTo(x2, y2, x2-rrb, y2, rrb);
		cx.lineTo(x1+rlb, y2); if (rlb) cx.arcTo(x1, y2, x1, y2-rlb, rlb);
	}
}

function border_path(cx, x1, y1, x2, y2, sides, r) {
	cx.beginPath()
	if (sides == BORDER_SIDE_ALL)
		if (!r)
			cx.rect(x1, y1, x2-x1, y2-y1)
		else
			cx.roundRect(x1, y1, x2-x1, y2-y1, r)
	else
		border_paths[sides](cx, x1, y1, x2, y2, r)
}

draw[CMD_BB] = function(a, i) {
	let ct_i = a[i+BB_CT_I]

	let px1 = a[ct_i+PX1+0]
	let py1 = a[ct_i+PX1+1]
	let px2 = a[ct_i+PX2+0]
	let py2 = a[ct_i+PX2+1]

	let x = a[ct_i+0] - px1
	let y = a[ct_i+1] - py1
	let w = a[ct_i+2] + px1 + px2
	let h = a[ct_i+3] + py1 + py2

	let bg_color           = a[i+1]
	let bg_color_state     = a[i+2]
	let border_sides       = a[i+3]
	let border_color       = a[i+4]
	let border_color_state = a[i+5]
	let border_radius      = a[i+6] / 128
	let border_dash        = a[i+7]

	if (bg_color) {
		set_bg_color(bg_color, bg_color_state)
		bg_path(cx, x, y, x + w, y + h, border_sides, border_radius)
		cx.fill()
	}
	if (shadow_set)
		reset_shadow()
	if (border_sides && border_color) {
		cx.strokeStyle = ui_border_color(border_color, border_color_state)
		cx.lineCap = 'square'
		border_path(cx, x + .5, y + .5, x + w - .5, y + h - .5, border_sides, border_radius)
		if (border_dash)
			cx.setLineDash(border_dashes[border_dash])
		cx.stroke()
		cx.lineCap = 'butt'
		if (border_dash)
			cx.setLineDash(empty_array)
	}
}

// text state ----------------------------------------------------------------

const CMD_COLOR = cmd('color')

function force_color(s, state) {
	if (color != s)
		scope_set('color', s)
	if (color_state != state)
		scope_set('color_state', state)
	ui_cmd(CMD_COLOR, s, state)
	color = s
	color_state = state
}
ui.color = function(s, state) {
	state = state ?? 0
	if (color == s && color_state == state) return
	force_color(s, state)
}
function end_color(ended_scope) {
	let s     = scope_prev_diff_var(ended_scope, 'color')
	let state = scope_prev_diff_var(ended_scope, 'color_state')
	if (s === undefined && state === undefined) return
	if (s !== undefined) color = s; else s = color
	if (state !== undefined) color_state = state; else state = color_state
	ui_cmd(CMD_COLOR, s, state)
}

const CMD_FONT = cmd('font')

function force_font(s) {
	scope_set('font', s)
	ui_cmd(CMD_FONT, s)
	font = s
}
function end_font(ended_scope) {
	let s = scope_prev_diff_var(ended_scope, 'font')
	if (s === undefined) return
	ui_cmd(CMD_FONT, s)
	font = s
}
ui.font = function(s) {
	if (font == s) return
	force_font(s)
}

ui.xsmall  = function() { ui.font_size(ui.font_size_normal * .72   ) } // 10/14
ui.small   = function() { ui.font_size(ui.font_size_normal * .8125 ) } // 12/14
ui.smaller = function() { ui.font_size(ui.font_size_normal * .875  ) } // 13/14
ui.large   = function() { ui.font_size(ui.font_size_normal * 1.125 ) } // 16/14
ui.xlarge  = function() { ui.font_size(ui.font_size_normal * 1.5   ) }

const CMD_FONT_SIZE = cmd('font_size')

function force_font_size(s) {
	scope_set('font_size', s)
	ui_cmd(CMD_FONT_SIZE, s)
	font_size = s
}
function end_font_size(ended_scope) {
	let s = scope_prev_diff_var(ended_scope, 'font_size')
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
	let s = scope_prev_diff_var(ended_scope, 'font_weight')
	if (s === undefined) return
	ui_cmd(CMD_FONT_WEIGHT, s)
	font_weight = s
}
ui.font_weight = function(s) {
	if (font_weight == s) return
	force_font_weight(s)
}
ui.bold   = function() { ui.font_weight('bold') }
ui.nobold = function() { ui.font_weight('normal') }

const CMD_LINE_GAP = cmd('line_gap')

function force_line_gap(s) {
	scope_set('line_gap', s)
	ui_cmd(CMD_LINE_GAP, round(s * 1024))
	line_gap = s
}
function end_line_gap(ended_scope) {
	let s = scope_prev_diff_var(ended_scope, 'line_gap')
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
	line_gap = a[i] / 1024
}

measure[CMD_FONT] = set_font
measure[CMD_FONT_SIZE] = set_font_size
measure[CMD_FONT_WEIGHT] = set_font_weight
measure[CMD_LINE_GAP] = set_line_gap

draw[CMD_COLOR] = function(a, i) {
	color       = a[i+0]
	color_state = a[i+1]
}
draw[CMD_FONT] = set_font
draw[CMD_FONT_SIZE] = set_font_size
draw[CMD_FONT_WEIGHT] = set_font_weight
draw[CMD_LINE_GAP] = set_line_gap

function force_scope_vars() {
	force_color(color, color_state)
	force_font(font)
	force_font_size(font_size)
	force_font_weight(font_weight)
	force_line_gap(line_gap)
}

// text box ------------------------------------------------------------------

const TEXT_ASC      = S-1
const TEXT_DSC      = S-0
const TEXT_X        = S+1
const TEXT_W        = S+2
const TEXT_ID       = S+3
const TEXT_S        = S+4
const TEXT_FLAGS    = S+5

// TEXT_FLAGS
const TEXT_WRAP      = 3 // bits 0 and 1
const TEXT_WRAP_LINE = 1 // bit 1
const TEXT_WRAP_WORD = 2 // bit 2
const TEXT_EDITABLE  = 4 // bit 3
const TEXT_FOCUSED   = 8 // bit 4

const CMD_TEXT = cmd('text')

ui.text = function(id, s, fr, align, valign, max_min_w, min_w, min_h, wrap, editable, input_type) {
	// NOTE: min_w and min_h are by default measured, not given.
	s = s ?? ''
	wrap = wrap == 'line' ? TEXT_WRAP_LINE : wrap == 'word' ? TEXT_WRAP_WORD : 0
	if (wrap == TEXT_WRAP_LINE) {
 		if (s.includes('\n'))
			s = s.split('\n')
	} else if (wrap == TEXT_WRAP_WORD) {
		keepalive(id)
		s = word_wrapper(id, s)
	}
	if (editable) {
		keepalive(id)
		s = ui.state(id, 'text') ?? s
	}
	ui_cmd_box(CMD_TEXT, fr ?? 1, align ?? 'l', valign ?? 'c',
		min_w ?? -1, // -1=auto
		min_h ?? -1, // -1=auto
		0, // ascent
		0, // descent
		0, // text_x
		max_min_w ?? -1, // -1=inf
		id,
		s,
		wrap | (editable ? TEXT_EDITABLE : 0) | (ui.focused(id) ? TEXT_FOCUSED : 0), // flags
	)
	if (editable)
		input_create(id, input_type)

	return s
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

function see(m) {
	let t = {}
	for (let k in m)
		if (typeof(k) != 'function')
			t[k] = m[k]
	return t
}

let measure_text; {
let tm = map()
let TSM = {}
measure_text = function(cx, s) {
	let fm = tm.get(cx.font)
	if (!fm) { fm = map(); tm.set(cx.font, fm); fm.set(TSM, map()) }
	let tsm = fm.get(TSM)
	tsm.set(s, performance.now())
	let m = fm.get(s)
	if (!m) {
		m = cx.measureText(s)
		fm.set(s, m)
		if (m.fontBoundingBoxAscent == null) { // Firefox < 116
			m.fontBoundingBoxAscent  = 1.3 * m.actualBoundingBoxAscent
			m.fontBoundingBoxDescent = 1.3 * m.actualBoundingBoxDescent
		}
	}
	return m
}
ui.measure_text = measure_text

runevery(120, function() {
	let t = performance.now()
	let n = 0
	for (let fm of tm.values()) {
		let tsm = fm.get(TSM)
		for (let [s, ts] of tsm) {
			if (t - ts > 120) {
				tsm.delete(s)
				fm.delete(s)
				n++
			}
		}
	}
	if (n)
		debug('gc text measure ', n)
})

document.fonts.addEventListener('loadingdone', function(ev) {

	// page was already rendered with missing fonts even though we preloaded all fonts.
	for (let font of ev.target) {
		let suffix = ' '+font.family
		for (let [font_spec, fm] of tm) {
			if (font_spec.endsWith(suffix))
				tm.delete(font_spec)
		}
	}

	// this is needed for when the debugger is open in Chrome and Firefox,
	// whether you preload fonts or not.
	animate()
})

}

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
		let m = measure_text(cx, ' ')
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
			let m = measure_text(cx, s)
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
	ww.clear()
	word_wrapper_freelist.free(ww)
}

function word_wrapper(id, text) {
	let s = ui.state(id)
	let ww = s.get('ww')
	if (!ww) {
		ww = word_wrapper_freelist.alloc()
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
			let m = measure_text(cx, s)
			asc = m.fontBoundingBoxAscent
			dsc = m.fontBoundingBoxDescent
			text_w = ceil(m.width)
			text_h = ceil(asc+dsc)
		} else { // multi-line, pre-wrapped
			text_w = 0
			text_h = 0
			for (let ss of s) {
				let m = measure_text(cx, ss)
				asc = m.fontBoundingBoxAscent
				dsc = m.fontBoundingBoxDescent
				text_w = max(text_w, ceil(m.width))
				text_h += ceil(asc+dsc)
			}
			text_h += (s.length-1) * round(line_gap * font_size)
		}
		let min_w = a[i+0]
		let min_h = a[i+1]
		let max_min_w = a[i+TEXT_W]
		if (min_w == -1) min_w = text_w
		if (min_h == -1) min_h = text_h
		if (max_min_w != -1)
			min_w = min(max_min_w, min_w)
		a[i+2] = min_w
		a[i+3] = min_h
		a[i+TEXT_ASC] = round(asc)
		a[i+TEXT_DSC] = round(dsc)
		a[i+TEXT_W] = text_w + spacings(a, i, 0)
	}
	a[i+2+axis] += spacings(a, i, axis)
	let min_w = a[i+2+axis]
	add_ct_min_wh(a, axis, min_w)
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
		a[i+TEXT_W] = sw - spacings(a, i, 0)
	}
	let x = inner_x(a, i, axis, align_x(a, i, axis, sx, sw))
	let w = inner_w(a, i, axis, align_w(a, i, axis, sw))
	a[i+0+axis] = x
	a[i+2+axis] = w
}
is_flex_child[CMD_TEXT] = true

translate[CMD_TEXT] = function(a, i, dx, dy) {
	let s = a[i+TEXT_S]
	a[i+0] += dx
	a[i+1] += dy
	a[i+TEXT_X] += dx
}

function input_free(s, id) {
	let input = s.get('input')
	input.remove()
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
	ui.state(id).set('text', this.value)
	animate()
}

function input_keydown(ev) {
	if (ev.key == 'Tab') {
		// ev.preventDefault()
	}
}

function input_create(id, input_type) {
	let input = ui.state(id, 'input')
	if (!input) {
		input = document.createElement('input')
		input._ui_id = id
		if (input_type)
			input.setAttribute('type', input_type)
		input.classList.add('ui-input')
		input.addEventListener('focus'  , input_focus)
		input.addEventListener('blur'   , input_blur)
		input.addEventListener('input'  , input_input)
		input.addEventListener('keydown', input_keydown)
		screen.appendChild(input)
		ui.state(id).set('input', input)
		ui.on_free(id, input_free)
	}
	return input
}

function remote_input_create(id, input_type) {
	let inputs = ui.state(ss_id, 'inputs')
	let input = inputs.get(id)
	if (!input) {
		input = document.createElement('input')
		input._ui_id = id
		if (input_type)
			input.setAttribute('type', input_type)
		input.classList.add('ui-input')
		input.addEventListener('focus'  , remote_input_focus)
		input.addEventListener('blur'   , remote_input_blur)
		input.addEventListener('input'  , remote_input_input)
		input.addEventListener('keydown', remote_input_keydown)
		screen.appendChild(input)
		inputs.set(id, input)
	}
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
	let focused  = flags & TEXT_FOCUSED

	let col = ui.fg_color(color, color_state)

	if (editable) {
		let input = ui.state(id, 'input')

		if (!input && ss_id)
			input = remote_input_create(id, input_type)

		input.value = s
		input.style.fontFamily = font
		input.style.fontWeight = font_weight
		input.style.fontSize   = (font_size / dpr)+'px'
		input.style.color      = col
		input.style.left   = (x  / dpr)+'px'
		input.style.top    = (y  / dpr)+'px'
		input.style.width  = (sw / dpr)+'px'

		input.style.opacity = focused ? 1 : 0

		if (focused)
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
	cx.fillStyle = col

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

hittest[CMD_TEXT] = function(a, i) {
	if (hit_box(a, i)) {
		hover(a[i+TEXT_ID])
		hit_template(a, i)
		return true
	}
}

// frame widget --------------------------------------------------------------

const FRAME_ON_MEASURE = S-1
const FRAME_ON_FRAME   = S+0
const FRAME_CT_I       = S+1
const FRAME_REC_I      = S+2
const FRAME_LAYER_I    = S+3
const FRAME_ARGS_I     = S+4

ui.FRAME_ARGS_I = FRAME_ARGS_I

let frame = {}

frame.create = function(cmd, on_measure, on_frame, fr, align, valign, min_w, min_h, ...args) {

	let ct_i = ui.ct_i()
	assert(a[ct_i-1] == CMD_SCROLLBOX, 'frame is not inside a scrollbox')

	return ui_cmd_box(cmd, fr, align, valign, min_w, min_h,
		on_measure, on_frame,
		ct_i,
		0, // rec_i
		layer_i,
		...args
	)

}

frame.reindex = function(a, i, offset) {
	a[i+FRAME_CT_I] += offset
}

frame.before_measure = function(a, i, axis) {
	let on_measure = a[i+FRAME_ON_MEASURE]
	let min_w = on_measure(axis)
	if (min_w != null)
		add_ct_min_wh(a, axis, min_w)
}

frame.translate = function(a, i, dx, dy) {

	a[i+0] += dx
	a[i+1] += dy

	let x = a[i+0]
	let y = a[i+1]
	let w = a[i+2]
	let h = a[i+3]

	let ct_i = a[i+FRAME_CT_I]
	let cx = a[ct_i+0]
	let cy = a[ct_i+1]
	let cw = a[ct_i+2]
	let ch = a[ct_i+3]

	let on_frame = a[i+FRAME_ON_FRAME]
	let a0 = begin_rec()
		a[i+FRAME_REC_I] = rec_i
		let layer_i0 = layer_i
		layer_i = a[i+FRAME_LAYER_I]
		let layer_ct_i = ui.stack()
			force_scope_vars()
			on_frame(a, i, x, y, w, h, cx, cy, cw, ch)
			reset_spacings()
		ui.end_stack()
		layer_i = layer_i0
		frame_end_check()
	let a1 = end_rec(a0)
	// pr(json(a1).length)

	layout_rec(a1, x, y, w, h)

}

frame.draw = function(a, i, recs) {
	let layer = layer_arr[layer_i]
	layer_i = a[i+FRAME_LAYER_I]
	let rec_i = a[i+FRAME_REC_I]
	let a1 = recs[rec_i]
	draw_cmd(a1, 2, recs)
}

frame.hit = function(a, i, recs) {
	layer_i = a[i+FRAME_LAYER_I]
	let layer = layer_arr[layer_i]
	let rec_i = a[i+FRAME_REC_I]
	let a1 = recs[rec_i]
	let hit_f = hittest[a1[1]]
	return hit_f(a1, 2, recs)
}

ui.box_widget('frame', frame)

// shared screen widget ------------------------------------------------------

let SS_ID = S-1

let ss = {}

ss.create = function(cmd, id, answer_con, fr, align, valign, min_w, min_h) {

	if (ui.state(id, 'con') != answer_con) {
		ui.state(id).set('con', answer_con)
		answer_con.recv = async function(cb) {
			answer_con.frame = await unpack_frame(cb)
			ui.animate()
		}
		answer_con.pointer = {}
	}

	return ui_cmd_box(cmd, fr, align, valign, min_w, min_h,
		id,
	)

}

ss.measure = function(a, i, axis) {
	let id = a[i+SS_ID]
	let t = ui.state(id, 'con')?.frame
	a[i+2+axis] = max(a[i+2+axis], a[i+0+axis])
	a[i+2+axis] += spacings(a, i, axis) + ((axis ? t?.h : t?.w) ?? 0)
	let min_w = a[i+2+axis]
	add_ct_min_wh(a, axis, min_w)
}

function ss_free_inputs(s) {
	for (let input of s.get('inputs').values())
		input.remove()
}

let ss_id
ss.draw = function(a, i) {
	let id = a[i+SS_ID]
	if (ss_id == id)
		return
	let con = ui.state(id, 'con')
	let frame = con?.frame
	//let frame = a[i+SS_ID]
	if (!frame) return
	let x = a[i+0]
	let y = a[i+1]
	let w = a[i+2]
	let h = a[i+3]
	ss_id = id
	if (!ui.state(id, 'inputs')) {
		ui.state(id).set('inputs', map()) // {id->input}
		ui.on_free(id, ss_free_inputs)
	}
	cx.save()
	cx.translate(x, y)
	draw_frame(frame.recs, frame.layers)
	cx.restore()
	draw_pointer(frame, x, y)
	ss_id = null

	// send mouse state to the remote peer.
	// make sure not to leak mouse state when ouside the shared screen viewport.
	if (ui.mouse.changed) {
		let m = ui.mouse
		let p = con.pointer

		let mx = m.mx
		let my = m.my
		if (mx != null) {
			mx -= x
			my -= y
			if (!m.captured)
				if (mx < 0 || my < 0 || mx >= w || my >= h) {
					mx = null
					my = null
				}
		}

		if (
			mx         != p.mx       ||
			my         != p.my       ||
			m.pressed  != p.pressed  ||
			m.wheel_dy != p.wheel_dy ||
			m.trackpad != p.trackpad
		) {
			p.mx       = mx
			p.my       = my
			p.pressed  = m.pressed
			p.click    = m.click
			p.clickup  = m.clickup
			p.dblclick = m.dblclick
			p.wheel_dy = m.wheel_dy
			p.trackpad = m.trackpad

			con.send(json(p))
		}

	}

}

ui.box_widget('shared_screen', ss)

// template widget -----------------------------------------------------------

let targs  = {}
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
		let hs = hit(id)
		if (!hs)
			return
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
	if (cmd & 1) // container
		ui.end()
}

function template_drag_point(id, ch_t, ct_i, ha, va) {
	ui.popup('', 'handle', ct_i, ha, va)
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
			hover(id).set('root', t)
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
	ui.p(depth * 20, ui.sp05(), 0)
	ui.stack(t)
		let hs = hit(t)
		if (hs && ui.click)
			template_select_node(id, t_t, t)
		let sel = t == selected_template_node_t
		if (sel) {
			ui.bb('item',
				ui.focused(id)
					? 'item-focused item-selected focused'
					: 'item-focused item-selected'
			)
		}
		ui.color('text', hs ? 'hover' : null)
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
	ui.end_toolbox()

	ui.toolbox(id+'.prop_toolbox', 'Props', ']', 100, 400)
		ui.scrollbox(id+'.prop_toolbox_sb', 1, null, null, null, null, 150, 200)
			ui.v(1, 0, 's', 't')
			let defs = tprops[ch_t.t]
			for (let k in defs) {
				let def = defs[k]
				let v = ch_t[k]
				ui.h()
					ui.border('b', 'light')
					let vs = str((v != null ? v : def.default) ?? '')
					ui.mb(1)
					ui.p(8, 5)
					ui.text('', k , 1, 'l', 'c', 20)
					ui.mb(1)
					ui.p(8, 5)
					ui.stack()
						if (def.type == 'color') {
							ui.bb(v, null, 'l', 'light')
						} else {
							ui.border('l', 'light')
							ui.color(v != null ? 'text' : 'label')
							ui.text('', vs, 1, 'l', 'c', 20)
						}
					ui.end_stack()
				ui.end_h()
			}
			ui.end_v()
		ui.end_scrollbox()
	ui.end_toolbox()

}

// drag point widget ---------------------------------------------------------

{
let ARGS  = 2+2+8+1
let COLOR = ARGS+0
let ID    = ARGS+1
let out = [0, 0, null]
ui.widget('drag_point', {
	create: function(cmd, id, x, y, color) {
		color ??= 'red'
		keepalive(id)
		ui.state_init(id, 'x', x)
		ui.state_init(id, 'y', y)
		x = ui.state(id, 'x')
		y = ui.state(id, 'y')
		let [state, dx, dy] = ui.drag(id)
		if (state == 'dragging' || state == 'drop') {
			x += dx
			y += dy
		}
		if (state == 'drop') {
			ui.state(id).set('x', x)
			ui.state(id).set('y', y)
		}

		// NOTE: we're making it a zero-sized box so that a popup can be anchored to it.
		let i = ui_cmd(cmd, x, y,
			0, 0, // w, h
			0, 0, 0, 0, // p
			0, 0, 0, 0, // m
			0, // fr
			color, id,
		)
		out[0] = x
		out[1] = y
		out[2] = i
		return out
	},
	position: function(a, i, axis, sx, sw) {
		a[i+0+axis] += sx
	},
	translate: function(a, i, dx, dy) {
		a[i+0] += dx
		a[i+1] += dy
	},
	draw: function(a, i) {
		let r = 5
		let x     = a[i+0]
		let y     = a[i+1]
		let color = a[i+COLOR]
		cx.fillStyle = color
		cx.beginPath()
		cx.rect(x-r, y-r, 2*r, 2*r)
		cx.fill()
	},
	hit: function(a, i) {
		let r = 5
		let x  = a[i+0]
		let y  = a[i+1]
		let id = a[i+ID]
		if (hit_rect(x-r, y-r, 2*r, 2*r)) {
			hover(id)
			return true
		}
	},
})
}

// button --------------------------------------------------------------------

// NOTE: the button is activated only if the mouse button was released while
// over the button, and only if it was pressed while over the button, even
// though the mouse _is_ captured.

ui.button_stack = function(id, fr, align, valign, min_w, min_h, style) {
	ui.p(ui.sp2(), ui.sp())
	ui.stack(id, fr, align ?? 's', valign ?? 'c', min_w, min_h)
}

ui.button_state = function(id) {
	let cs = ui.capture(id)
	let hs = hit(id) || (cs && hovers(id))
	return cs && hs ? ui.clickup ? 'click' : 'active' : hs ? 'hover' : null
}

ui.button_bb = function(style, state) {
	state = repl(state, 'click', 'hover')
	style = style ?? 'button'
	ui.shadow('button')
	ui.bb(style, state, 1, 'intense', state, ui.sp05())
}

ui.button_text = function(s, state, min_w, min_h) {
	state = repl(state, 'click', 'hover')
	min_h ??= ui.em(1)
	ui.bold()
	ui.color('text', state)
	ui.text('', s, 0, 'c', 'c', null, min_w, min_h)
}

ui.button_icon = function(font, icon, state, min_w, min_h) {
	state = repl(state, 'click', 'hover')
	min_h ??= ui.em(1)
	ui.font(font)
	ui.color('text', state)
	ui.text('', icon, 0, 'c', 'c', min_w, min_w, min_h)
}

ui.end_button_stack = function(state) {
	ui.end_stack()
	return state == 'click'
}

ui.icon_button = function(id, font, icon, fr, align, valign, min_w, min_h, style) {
	ui.button_stack(id, fr, align, valign, min_w, min_h)
	let state = ui.button_state(id)
	ui.button_bb(style, state)
	ui.button_icon(font, icon, state)
	return ui.end_button_stack(state)
}

ui.tool_button = function(id, font, icon, fr, align, valign, min_w, min_h, style) {
	ui.button_stack(id, fr, align, valign, min_w, min_h)
	let state = ui.button_state(id)
	ui.button_bb(style, state)
	ui.button_icon(font, icon, state)
	return ui.end_button_stack(state)
}

ui.button = function(id, s, fr, align, valign, min_w, min_h, style) {
	ui.button_stack(id, fr, align, valign, min_w, min_h)
	let state = ui.button_state(id)
	ui.button_bb(style, state)
	ui.button_text(s, state)
	return ui.end_button_stack(state)
}

ui.button_primary = function(id, s, fr, align, valign, min_w, min_h) {
	return ui.button(id, s, fr, align, valign, min_w, min_h, 'button-primary')
}

ui.btn = ui.button
ui.btn_pri = ui.button_primary

// split ---------------------------------------------------------------------

function split(hv, id, size, unit, fixed_side,
	split_fr, gap, align, valign, min_w, min_h,
) {

	let snap_px = 50
	let splitter_w = 1

	let horiz = hv == 'h'
	let W = horiz ? 'w' : 'h'
	let [state, dx, dy] = ui.drag(id)
	keepalive(id)
	let s = ui.state(id)
	let cs = captured(id)
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
	let st = hit(id) ? 'hover' : null

	if (hv == 'h') {
		ui.stack('', 0, 'l', 's', 1, 0)
			ui.popup('', null, null, 'it', '[]')
				ui.ml(-hit_distance / 2)
				ui.stack(id, 0, 'l', 's', hit_distance)
					ui.stack('', 1, 'c', 's')
						ui.border('l', 'intense', st)
					ui.end_stack()
					if (collapsed) {
						ui.stack('', 1, 'c', 'c', 5, 2*ui.sp8())
							ui.border('lr', 'intense', st)
						ui.end_stack()
					}
				ui.end_stack()
			ui.end_popup()
		ui.end_stack()
	} else {
		ui.stack('', 0, 's', 't', 0, 1)
			ui.popup('', null, null, 'it', '[]')
				ui.mt(-hit_distance / 2)
				ui.stack(id, 0, 's', 't', 0, hit_distance)
					ui.stack('', 1, 's', 'c')
						ui.border('t', 'intense', st)
					ui.end_stack()
					if (collapsed) {
						ui.stack('', 1, 'c', 'c', 2*ui.sp8(), 5)
							ui.border('tb', 'intense', st)
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
	ui.stack('', fr, 's', 's')
		ui.bb('input', null, 1, 'intense', ui.focused(id) ? 'hover' : null)
		ui.p(ui.sp())
		s = ui.text(id, s, 1, 'l', 'c', null, min_w ?? ui.em(12), min_h, null, true)
	ui.end_stack()
	return s
}

ui.label = function(for_id, s, fr, align, valign) {
	let id = for_id+'.label'
	ui.color('text', (hit(id) || hit(for_id)) ? 'hover' : null)
	ui.text(id, s, fr, align ?? 'l', valign ?? 'c')
}

ui.radio_label = function(for_id, for_group_id, s, fr, align, valign) {
	let id = for_id+'.label'
	ui.color('text', (hit(id) || hit(for_id)) ? 'hover' : null)
	ui.text(id, s, fr, align ?? 'l', valign ?? 'c')
}

// list ----------------------------------------------------------------------

ui.valid_list_index = function(i, items) {
	return items.length ? clamp(i, 0, items.length-1) : null
}

function list_update(id, m) {
	let items  = m.get('items')
	let fi     = m.get('focused_item_i')
	let before_fi = fi
	let d = ui.focused(id) && (
			ui.keydown('arrowdown') &&  1 ||
			ui.keydown('arrowup'  ) && -1
		) || 0
	fi = fi != null ? fi + d : d >= 0 ? 0 : items.length-1
	fi = ui.valid_list_index(fi, items)
	let fi_changed = d && 'key'
	let i = 0
	for (let item of items) {
		let item_id = id+'.'+i
		if (hit(item_id) && ui.click) {
			ui.focus(id)
			fi = i
			fi_changed = 'click'
		}
		i++
	}
	m.set('focused_item_i', fi)
	m.set('focused_item_changed', before_fi != fi ? fi_changed : false)
	m.set('item_picked', fi_changed == 'click' || (fi != null && ui.focused(id) && ui.key('enter')))
}
function hvlist(hv, id, items, fr, align, valign, item_align, item_valign, item_fr, max_min_w, min_w) {
	let s = ui.state(id)
	s.set('items', items)
	keepalive(id, list_update)
	let fi = s.get('focused_item_i')
	let list_focused = ui.focused(id)
	let i = 0
	hv = hv || 'v'
	assert(hv == 'v' || hv == 'h')
	ui.hv(hv, fr, 0, align, valign, min_w ?? 120)
	for (let item of items) {
		let item_id = id+'.'+i
		ui.p(ui.sp(), ui.sp05())
		ui.stack(item_id, 0)
			let item_focused = fi == i
			 ui.bb(
			 	item_focused ? 'item' : 'bg',
			 	item_focused
			 		? list_focused
			 			? 'item-focused item-selected focused'
			 			: 'item-focused item-selected'
			 		: null
			 )
			ui.color('text', hit(item_id) ? 'hover' : null)
			ui.text('', item, item_fr,
				item_align  ?? hv == 'v' ? 'l' : 'c',
				item_valign ?? hv == 'v' ? 'c' : 'c',
				max_min_w)
		ui.end_stack()
		i++
	}
	ui.end()
	return items[fi]
}
ui.hvlist = hvlist
ui.vlist = function(...args) { return hvlist('v', ...args) }
ui.hlist = function(...args) { return hvlist('h', ...args) }
ui.list = ui.vlist

// tabs ----------------------------------------------------------------------

ui.tabs = function(id, all_tabs, selected_tab, tab_order, hidden_tabs) {

	let s = ui.state(id)
	selected_tab = s.get('selected_tab') ?? selected_tab
	tab_order = s.get('tab_order') ?? tab_order
	hidden_tabs = s.get('hidden_tabs') ?? hidden_tabs

	let tabs = []
	for (let tab of all_tabs) {
		tab.index = tabs.length
		tabs.push(tab)
	}

	let gap = 0
	ui.stack(id)
	ui.h(0, gap, 'l', 't')

	let drag_state, dx, dy, cs
	let drag_tab_id, drag_tab
	for (drag_tab of tabs) {
		drag_tab_id = id+'.tab.'+drag_tab.id
		;[drag_state, dx, dy, cs] = ui.drag(drag_tab_id)
		if (drag_state) break
	}

	let mover = cs?.get('mover')
	if (!mover && drag_state == 'drag') {
		selected_tab = drag_tab
		ui.state(id).set('selected_tab', selected_tab.id)
	} else if (!mover && drag_state == 'dragging' && abs(dx) > 10) {
		mover = ui.live_move_mixin()
		cs.set('mover', mover)
		mover.movable_element_size = function(vi) {
			let tab = tabs[vi]
			let tab_id = id+'.tab.'+drag_tab.id
			let w = ui.state(tab_id).get('w')
			return w + gap
		}
		mover.set_movable_element_pos = function(i, x, moving, vi) {
			//
		}
		mover.move_element_start(drag_tab.index, 1, 0, tabs.length)
	} else if (mover && drag_state == 'dragging') {
		mover.move_element_update_dx(dx)
	} else if (mover && drag_state == 'drop') {
		array_move(tab_order, drag_tab_i, 1, mover.over_i, true)
		s.set('tab_order', tab_order)
		mover = null
	}

	for (let j = 0, n = tabs.length; j < n; j++) {
		let tab_i = j
		let tab = tabs[tab_i]
		let tab_id = id+'.tab'+tab_i
		let over_gap = mover && tab_i == mover.over_i
		if (over_gap) {
			let tab_i = drag_tab_i
			let tab_id = drag_tab_id
			let w = ui.state(tab_id).get('w')
			ui.stack('', 0, null, null, w)
			ui.end_stack()
		}
		let moving = mover && tab_i == drag_tab_i
		if (moving) {
			ui.popup('', 'overlay', null, 'it', '[')
			ui.ml(max(0, mover.x0 + dx))
		}
		ui.stack(tab_id)
		ui.measure(tab_id)
			let sel = tab == selected_tab
			let hover = drag_state == 'hover' && drag_tab == tab || moving
			ui.bb('bg1', hover ? 'hover' : null)
			ui.p(ui.sp2(), ui.sp1())
			ui.text('', tab.label)
			if (sel) {
				ui.stack('', 1, 's', 'b', null, 2)
					ui.bb('marker')
				ui.end_stack()
			}
		ui.end_stack()
		if (moving) {
			ui.end_popup()
		}
	}
	ui.end_h()
	ui.end_stack()

	return selected_tab
}

// polyline ------------------------------------------------------------------

function set_points(cx, x0, y0, a, pi1, pi2, closed, offset) {
	cx.beginPath()
	let x = a[pi1+0] + offset
	let y = a[pi1+1] + offset
	cx.moveTo(x0 + x, y0 + y)
	for (let i = pi1 + 2; i < pi2; i += 2) {
		let x = a[i+0] + offset
		let y = a[i+1] + offset
		cx.lineTo(x0 + x, y0 + y)
	}
	if (closed)
		cx.closePath()
}

let POLYLINE_STROKE_COLOR       = 5
let POLYLINE_STROKE_COLOR_STATE = 6
let POLYLINE_LINE_WIDTH         = 7
let POLYLINE_POINTS             = 8

ui.widget('polyline', {
	create: function(cmd,
			id, points, closed,
			fill_color, fill_color_state,
			stroke_color, stroke_color_state,
			line_width,
	) {
		if (isstr(points))
			points = points.split(/\s+/).map(num)
		assert(points.length % 2 == 0, 'invalid point array')
		if (!points.length)
			return
		return ui_cmd(cmd, id, ui.ct_i(), (closed ?? 0) ? 1 : 0,
			fill_color   ?? 0, parse_state(fill_color_state  ),
			stroke_color ?? 0, parse_state(stroke_color_state), line_width ?? 1,
			...points)
	},
	measure: function(a, i, axis) {
		if (!axis) {
			let stroke_color = a[i+POLYLINE_STROKE_COLOR]
			let line_width   = a[i+POLYLINE_LINE_WIDTH]
			let pi1 = i+POLYLINE_POINTS
			let pi2 = cmd_arg_end_i(a, i)
			let x1 =  1/0
			let y1 =  1/0
			let x2 = -1/0
			let y2 = -1/0
			for (let i = pi1; i < pi2; i += 2) {
				let x = a[i+0]
				let y = a[i+1]
				x1 = min(x1, x)
				y1 = min(y1, y)
				x2 = max(x2, x)
				y2 = max(y2, y)
			}
			if (stroke_color) {
				let hlw = line_width / 2
				x1 -= hlw
				y1 -= hlw
				x2 += hlw
				y2 += hlw
			}
			add_ct_min_wh(a, 0, x2-x1)
			add_ct_min_wh(a, 1, y2-y1)
		}
	},
	draw: function(a, i) {
		let pi1 = i+POLYLINE_POINTS
		let pi2 = cmd_arg_end_i(a, i)
		let ct_i = a[i+1]
		let x0 = a[ct_i+0]
		let y0 = a[ct_i+1]
		let closed             = a[i+2]
		let fill_color         = a[i+3]
		let fill_color_state   = a[i+4]
		let stroke_color       = a[i+POLYLINE_STROKE_COLOR]
		let stroke_color_state = a[i+POLYLINE_STROKE_COLOR_STATE]
		let line_width         = a[i+POLYLINE_LINE_WIDTH]
		if (fill_color) {
			set_points(cx, x0, y0, a, pi1, pi2, closed, 0)
			cx.fillStyle = bg_color(fill_color, fill_color_state)
			cx.fill()
		}
		if (stroke_color) {
			set_points(cx, x0, y0, a, pi1, pi2, closed, line_width / 2)
			cx.strokeStyle = fg_color(stroke_color, stroke_color_state)
			cx.lineWidth = line_width
			cx.stroke()
			cx.lineWidth = 1
		}
	},
	hit: function(a, i) {
		let id = a[i+0]
		if (!id)
			return
		let ct_i = a[i+1]
		let x0 = a[ct_i+0]
		let y0 = a[ct_i+1]
		let closed = a[i+2]
		let pi1 = i+POLYLINE_POINTS
		let pi2 = cmd_arg_end_i(a, i)
		set_points(cx, x0, y0, a, pi1, pi2, closed)
		if (cx.isPointInPath(mx, my)) {
			hover(id)
			return true
		}
	},
})

// dropdown ------------------------------------------------------------------

ui.dropdown = function(id, items, fr, max_min_w, min_w, min_h) {

	keepalive(id)
	let open = ui.state(id, 'open')
	let foc_i = open ? ui.state(id+'.list', 'focused_item_i') : null
	let sel_i = foc_i ?? ui.state(id, 'i') ?? 0
	sel_i = ui.valid_list_index(sel_i, items)
	ui.state(id).set('i', sel_i)

	let click = hit(id) && ui.click
	let picked = ui.state(id+'.list', 'item_picked')
	let toggle = click
		|| (ui.focused(id) && ui.keydown('enter'))
		|| picked

	if (toggle) {
		open = !open
	} else if (open && ui.click && !hit(id) && !picked && !captured(id+'.list')) {
		open = false
	}

	ui.state(id).set('open', open)

	if (click)
		if (open)
			ui.focus(id+'.list')
		else
			ui.focus(id)

	if (!open && ui.focused(id)) {
		let d = ui.key('arrowup') && -1 || ui.key('arrowdown') && 1 || 0
		if (d) {
			sel_i = ui.valid_list_index(sel_i + d, items)
			ui.state(id).set('i', sel_i)
			ui.state(id+'.list').set('focused_item_i', sel_i)
		}
	}

	let s = sel_i != null ? items[sel_i] : ''

	ui.stack('', fr, 's', 's', min_w ?? ui.em(12), min_h)

		// placeholder to align popup to it.
		ui.m(1)
		ui.p(ui.sp())
		ui.text('', '', 0, 'l', 'c')

		if (open)
			ui.popup(id+'.popup', 'open', null, 'il', 's', 0, 0, 'constrain change_side')

			if (open)
				ui.shadow('picker')

			ui.bb('input', null, 1, 'intense', ui.focused(id) || ui.focused(id+'.list') ? 'hover' : null)

			ui.m(1)
			ui.v()

				ui.stack(id)
					ui.p(ui.sp())
					ui.h(0, ui.sp())
						ui.text('', s, 1, 'l', 'c', max_min_w ?? ui.em(8))
						ui.stack('', 0)
							ui.polyline('', '0 4  7 11  14 4', false, null, null, 'label')
						ui.end_stack()
					ui.end_h()
				ui.end_stack()

				if (open) {
					ui.stack()
						ui.state_init(id+'.list', 'focused_item_i', sel_i)
						ui.list(id+'.list', items, 0, 's', 's', 'l', 'c', 0, max_min_w)
					ui.end_stack()
				}

			ui.end_v()

		if (open)
			ui.end_popup()

	ui.end_stack()
}

// toolbox widget ------------------------------------------------------------

ui.toolbox = function(id, title, align, x0, y0, target_i) {

	keepalive(id)
	let align_start = parse_align(align || '[') == ALIGN_START
	let [dstate, dx, dy] = ui.drag(id+'.title')
	let s = ui.state(id)
	let mx1 =  align_start ? (s.get('mx1') ?? x0) + dx : 0
	let mx2 = !align_start ? (s.get('mx2') ?? x0) - dx : 0
	let my1 =  align_start ? (s.get('my1') ?? y0) + dy : 0
	let my2 = !align_start ? (s.get('my2') ?? y0) - dy : 0
	let min_w = s.get('min_w')
	let min_h = s.get('min_h')
	if (dstate == 'drop') {
		s.set('mx1', mx1)
		s.set('mx2', mx2)
		s.set('my1', my1)
		s.set('my2', my2)
	}

	keepalive(id)
	let ts = ui.state('toolboxes')
	let layers = ts.get('layers')
	if (!layers) {
		layers = []
		ts.set('layers', layers)
	}

	// let z_index = s.get('z_index')
	// let layer = layer_above('toolbox', z_index)

	ui.m(mx1, my1, mx2, my2)
	ui.popup(id+'.popup', 'window', target_i ?? 'screen', 'it', align, min_w, min_h, 'constrain')
		ui.p(1)
		ui.bb('bg1', null, 1, 'intense', null, ui.sp075())
		ui.stack()
			scope_set('toolbox_id', id)
			ui.v() // title / body split
				ui.h(0) // title bar
					ui.stack(id+'.title')
						ui.bb('bg3', null, 0, null, null, ui.sp075() * 0.75)
						ui.p(ui.sp2(), ui.sp())
						ui.text('', title, 0, 'l')
					ui.end_stack()
				ui.end_h()
}

ui.end_toolbox = function() {
			ui.end_v()
			ui.resizer(scope_get('toolbox_id'))
		ui.end_stack()
	ui.end_popup()
}

// all-sides resizer widget --------------------------------------------------

{
// check if a point (x0, y0) is inside rect (x, y, w, h)
// offseted by d1 internally and d2 externally.
function hit(x0, y0, d1, d2, x, y, w, h) {
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
	top          : 'ns-resize',
	left         : 'ew-resize',
	top_left     : 'nwse-resize',
	top_right    : 'nesw-resize',
	bottom_left  : 'nesw-resize',
}

ui.widget('resizer', {
	create: function(cmd, ct_id, id) {
		id = id || ct_id+'.resizer'
		keepalive(id)
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
			let hs = hover(id)
			hs.set('side', side)
			hs.set('measured_x', x)
			hs.set('measured_y', y)
			hs.set('measured_w', w + borders)
			hs.set('measured_h', h + borders)
		}

		let [dstate, dx, dy] = ui.drag(id)
		let hs = hovers(id)
		let cs = captured(id)
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

// toggle --------------------------------------------------------------------

ui.bg_style('*', 'toggle'      , '*', 'bg2')
ui.bg_style('*', 'toggle'      , 'normal item-selected', 'link', 'normal')
ui.bg_style('*', 'toggle'      , 'hover  item-selected', 'link', 'hover' )
ui.bg_style('*', 'toggle-thumb', '*', 'text')

let TOGGLE_ID = S-1

let toggle = {}

function toggle_toggle(id) {
	let clicked = (hit(id) || hit(id+'.label')) && ui.click
	let on
	if (clicked) {
		on = !ui.state(id, 'on')
		ui.state(id).set('on', on)
	}
	return on
}

toggle.create = function(cmd, id, fr, align, valign, min_w, min_h) {
	keepalive(id)
	let on = toggle_toggle(id)
	ui_cmd_box(cmd, fr, align ?? 'c', valign ?? 'c',
		min_w ?? ui.em(2.5),
		min_h ?? ui.em(1.5),
		id)
	return on
}
toggle.ID = TOGGLE_ID

toggle.draw = function(a, i) {

	let x = a[i+0]
	let y = a[i+1]
	let w = a[i+2]
	let h = a[i+3]
	let id = a[i+TOGGLE_ID]

	let hs = hit(id) || hit(id+'.label')
	let on = ui.state(id, 'on')

	// button

	cx.beginPath()
	cx.roundRect(x, y, w, h, 1000)
	let state =
		(on ? STATE_ITEM_SELECTED : 0) |
		(hs ? STATE_HOVER         : 0)
	cx.fillStyle = ui_bg_color('toggle', state)
	cx.fill()

	// thumb

	cx.beginPath()
	let cx1 = on ? x + w - h / 2 : x + h / 2
	let cy1 = y + h / 2
	cx.arc(cx1, cy1, h * .35, 0, 2 * PI)
	cx.closePath()
	ui.set_shadow('button')
	cx.fillStyle = ui_bg_color('toggle-thumb', hs ? 'hover' : null)
	cx.fill()
	reset_shadow()
}

ui.box_widget('toggle', toggle)

// checkbox ------------------------------------------------------------------

let checkbox = {...toggle}

checkbox.create = function(cmd, id, fr, align, valign, min_w, min_h) {
	return toggle.create(cmd, id, fr, align, valign,
		min_w ?? ui.em(1.5),
		min_h ?? ui.em(1.5),
	)
}

checkbox.draw = function(a, i) {

	let x = a[i+0]
	let y = a[i+1]
	let w = a[i+2]
	let h = a[i+3]
	let id = a[i+TOGGLE_ID]

	let hs = hit(id) || hit(id+'.label')
	let on = ui.state(id, 'on')

	let state =
		(on ? STATE_ITEM_SELECTED : 0) |
		(hs ? STATE_HOVER         : 0)
	let bg = bg_color_hsl('toggle', state)
	let fg = fg_color('text', hs ? 'hover' : null, bg_is_dark(bg) ? 'dark' : 'light')
	bg = bg[0]

	// check box

	cx.beginPath()
	cx.roundRect(x, y, w, h, 2)
	cx.fillStyle = bg
	cx.fill()

	// check mark

	cx.beginPath()
	cx.save()
	cx.translate(x, y)
	cx.scale(1/w, 1/h)
	cx.scale(20, 20)
	cx.translate(1, 0)
	cx.moveTo(4, 11)
	cx.lineTo(8, 15)
	cx.lineTo(16, 6)
	cx.strokeStyle = fg
	cx.lineWidth = 1.5
	cx.lineCap = 'round'
	cx.lineJoin = 'round'
	cx.setLineDash([20])
	cx.lineDashOffset = on ? 0 : 20 // TODO: animate
	cx.stroke()
	cx.restore()

}

ui.box_widget('checkbox', checkbox)

// radio ---------------------------------------------------------------------

let radio = {...checkbox}

let RADIO_GROUP_ID = S+0

//|| hit(id+'.label')
radio.create = function(cmd, id, group_id, fr, align, valign, min_w, min_h) {
	keepalive(id)
	keepalive(group_id)
	let clicked = (hit(group_id) || hit(group_id+'.label')) && ui.click
	let clicked_id = clicked && hit(group_id, 'id')
	let on = clicked ? clicked_id == id && !ui.state(id, 'on') : null
	if (clicked) {
		ui.state(id).set('on', false)
		ui.state(clicked_id).set('on', true)
	}
	ui_cmd_box(cmd, fr, align ?? 'c', valign ?? 'c',
		min_w ?? ui.em(1.5),
		min_h ?? ui.em(1.5),
		id,
		group_id)
	return on
}

radio.draw = function(a, i) {

	let x = a[i+0]
	let y = a[i+1]
	let w = a[i+2]
	let h = a[i+3]
	let id = a[i+TOGGLE_ID]

	let hs = hit(id) || hit(id+'.label')
	let on = ui.state(id, 'on')

	let cx1 = x + w / 2
	let cy1 = y + h / 2

	// button

	cx.beginPath()
	cx.arc(cx1, cy1, h * .5, 0, 2 * PI)
	cx.fillStyle = bg_color('toggle', hs ? 'hover' : null)
	cx.fill()

	// bullet

	cx.beginPath()
	cx.arc(cx1, cy1, h * (on ? .15 : 0), 0, 2 * PI) // TODO: animate radius
	cx.closePath()
	ui.set_shadow('button')
	cx.fillStyle = bg_color('toggle-thumb', hs ? 'hover' : null)
	cx.fill()
	reset_shadow()

}

radio.hit = function(a, i) {
	let x = a[i+0]
	let y = a[i+1]
	let w = a[i+2]
	let h = a[i+3]
	let id = a[i+TOGGLE_ID]
	let group_id = a[i+RADIO_GROUP_ID]
	if (hit_rect(x, y, w, h)) {
		hover(group_id).set('id', id)
		return true
	}
}

ui.box_widget('radio', radio)

// slider --------------------------------------------------------------------

function compute_step_and_range(wanted_n, min, max, scale_base, scales, decimals) {
	scale_base = scale_base || 10
	scales = scales || [1, 2, 2.5, 5]
	let d = max - min
	let min_scale_exp = floor((d ? logbase(d, scale_base) : 0) - 2)
	let max_scale_exp = floor((d ? logbase(d, scale_base) : 0) + 2)
	let n0, step
	let step_multiple = decimals != null ? 10**(-decimals) : null
	for (let scale_exp = min_scale_exp; scale_exp <= max_scale_exp; scale_exp++) {
		for (let scale of scales) {
			let step1 = scale_base ** scale_exp * scale
			let n = d / step1
			if (n0 == null || abs(n - wanted_n) < n0) {
				if (step_multiple == null || floor(step1 / step_multiple) == step1 / step_multiple) {
					n0 = n
					step = step1
				}
			}
		}
	}
	min = ceil  (min / step) * step
	max = floor (max / step) * step
	return [step, min, max]
}

let SLIDER_ID         = S-1
let SLIDER_FROM       = S+0
let SLIDER_TO         = S+1
let SLIDER_DECIMALS   = S+2
let SLIDER_P          = S+3 // progress in 0..1
let SLIDER_MARKERS    = S+4
let SLIDER_SCALE_BASE = S+5
let SLIDER_SCALES     = S+6
let SLIDER_THUMB_I    = S+7

let fr0, align0, valign0, min_w0, min_h0

ui.box_args = function(fr, align, valign, min_w, min_h) {
	fr0     = fr
	align0  = align
	valign0 = valign
	min_w0  = min_w
	min_h0  = min_h
}

ui.clear_box_args = function() {
	fr0     = null
	align0  = null
	valign0 = null
	min_w0  = null
	min_h0  = null
}

ui.slider_mark_w_em = 2
ui.slider_thumb_r_em = .6
ui.slider_shaft_h_em = 0.2

ui.slider_progress = function(id) {
	return ui.state(id, 'p') ?? .5
}

ui.slider_value = function(id, from, to) {
	return lerp(ui.slider_progress(id), 0, 1, from ?? 0, to ?? 1)
}

ui.slider_set_progress = function(id, p) {
	p = clamp(p, 0, 1)
	ui.state(id).set('p', p)
}

ui.slider_set_value = function(id, from, to, v) {
	let p = lerp(v, from ?? 0, to ?? 1, 0, 1)
	ui.slider_set_progress(id, p)
}

function dot(x, y) {
	cx.beginPath()
	cx.arc(x, y, 10, 0, 2 * PI)
	cx.strokeStyle = 'red'
	cx.stroke()
}

function rect(x, y, w, h) {
	cx.beginPath()
	cx.rect(x, y, w, h)
	cx.strokeStyle = 'red'
	cx.stroke()
}

function a_rect(a, i) {
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
	cx.rect(x, y, w, h)
	cx.strokeStyle = 'red'
	cx.stroke()

	cx.rect(x-px1, y-py1, w+px1+px2, h+py1+py2)
	cx.strokeStyle = 'green'
	cx.stroke()

	cx.rect(x-px1-mx1, y-py1-my1, w+px1+px2+mx1+mx2, h+py1+py2+my1+my2)
	cx.strokeStyle = 'blue'
	cx.stroke()
}

ui.box_widget('slider', {

	create: function(cmd, id, from, to, decimals, markers, scale_base, scales) {

		keepalive(id)

		markers = (markers ?? 1) ? 1 : 0

		let fr = fr0 ?? 1
		let align = align0 ?? 's'
		let valign = valign0 ?? 'c'
		let min_w = min_w0 ?? ui.em(12)
		let min_h = min_h0 ?? ui.em((markers ? 2.8 : 1.2))
		ui.clear_box_args()

		let hs = hit(id)
		let click = hs && ui.click

		if (click) {
			ui.focus(id)
			ui.capture(id)
		}

		if (ui.focused(id)) {
			let d = ui.keydown('arrowright') && 1 || ui.keydown('arrowleft') && -1
			if (d) {
				let p = ui.slider_progress(id)
				p += d * (ui.key('shift') ? .01 : .1)
				ui.slider_set_progress(id, p)
			}
		}

		ui.stack()

			ui.m(markers ? ui.sp8() : ui.sp2(), ui.sp2())
			let i = ui_cmd_box(cmd, fr, align, valign,
				min_w,
				min_h,
				id,
				from ?? 0,
				to ?? 1,
				decimals ?? 2,
				0, // p
				markers,
				scale_base ?? 10,
				scales ?? 0,
				0, // thumb_i
			)

			let thumb_i = ui.stack('', 0, 'l', 't'); ui.end_stack()
			a[i+SLIDER_THUMB_I] = thumb_i

		ui.end_stack()

		if (!markers && (hs || captured(id))) {
			ui.mb(10)
			ui.p(ui.sp2(), ui.sp())
			ui.popup(id+'.popup', 'tooltip', thumb_i, 't', 'c', 0, 0, 'change_side constrain')
				ui.bb_tooltip('info', null, 'light', null, ui.sp05())
				ui.text('', dec(ui.state(id, 'v'), decimals ?? 2))
			ui.end_popup()
		}

	},

	ID: SLIDER_ID,

	translate: function(a, i, dx, dy) {
		a[i+0] += dx
		a[i+1] += dy
		let id = a[i+SLIDER_ID]

		let p = ui.state(id, 'p') ?? .5

		if (captured(id)) {
			let thumb_r = ui.em(ui.slider_thumb_r_em)
			let margin_x = thumb_r
			let x = a[i+0] + margin_x
			let w = a[i+2] - 2*margin_x
			p = clamp((ui.mx - x) / w, 0, 1)
			ui.state(id).set('p', p)
		}

		let from  = a[i+SLIDER_FROM]
		let to    = a[i+SLIDER_TO]
		let v = lerp(p, 0, 1, from, to)
		ui.state(id).set('v', v)

		a[i+SLIDER_P] = round(p * 32767)

		// find thumb's center point and position the thumb anchor stack.
		let x = a[i+0]
		let y = a[i+1]
		let w = a[i+2]
		let h = a[i+3]
		let shaft_h = round(ui.em(ui.slider_shaft_h_em))
		let r = round(shaft_h / 2) // shaft corner radius
		let thumb_r = ui.em(ui.slider_thumb_r_em)
		let margin_x = thumb_r
		let thumb_cx = x + margin_x + p * (w - 2 * margin_x)
		let thumb_cy = y + h - 2*thumb_r

		let thumb_i = a[i+SLIDER_THUMB_I]

		// HACK: set position of thumb_i manually.
		a[thumb_i+0] = thumb_cx
		a[thumb_i+1] = thumb_cy

	},

	draw: function(a, i) {

		let x = a[i+0]
		let y = a[i+1]
		let w = a[i+2]
		let h = a[i+3]

		let id      = a[i+SLIDER_ID]
		let p       = a[i+SLIDER_P] / 32767
		let markers = a[i+SLIDER_MARKERS]

		let hs = hit(id)
		let focused = ui.focused(id)

		let shaft_h = round(ui.em(ui.slider_shaft_h_em))
		let r = round(shaft_h / 2) // shaft corner radius
		let thumb_r = ui.em(ui.slider_thumb_r_em)
		let margin_x = thumb_r

		y += h - r - thumb_r
		x += margin_x
		w -= 2 * margin_x

		let thumb_cx = x + p * w
		let thumb_cy = y + r

		// draw shaft
		bg_path(cx, x - r, y, x + w + r, y + 2*r, BORDER_SIDE_ALL, 1000)
		cx.fillStyle = bg_color('bg2', hs ? 'hover' : null)
		cx.fill()

		bg_path(cx, x - r, y, thumb_cx, y + 2*r, BORDER_SIDE_ALL, 1000)
		cx.fillStyle = bg_color('link', hs ? 'hover' : null)
		cx.fill()

		bg_path(cx, x + .5 - r, y + .5, x + w - .5 + r, y + 2*r - .5, BORDER_SIDE_ALL, 1000)
		cx.strokeStyle = border_color('light', null)
		cx.stroke()

		// draw focus ring under thumb
		if (focused) {
			let hsl_color = bg_color_hsl('item', 'item-focused item-selected focused')
			cx.fillStyle = hsl_adjust(hsl_color, 1, 1, 1, .5)
			cx.beginPath()
			cx.arc(thumb_cx, thumb_cy, thumb_r * 2, 0, 2 * PI)
			cx.fill()
		}

		// draw thumb
		cx.fillStyle = fg_color('link', hs ? 'hover' : null)
		ui.set_shadow('button')
		cx.beginPath()
		cx.arc(thumb_cx, thumb_cy, thumb_r, 0, 2 * PI)
		cx.fill()
		reset_shadow()

		if (markers) {

			let from       = a[i+SLIDER_FROM]
			let to         = a[i+SLIDER_TO]
			let scale_base = a[i+SLIDER_SCALE_BASE]
			let scales     = a[i+SLIDER_SCALES]
			let decimals   = a[i+SLIDER_DECIMALS]

			let max_n = floor(w / ui.em(ui.slider_mark_w_em))
			let [step, min, max] = compute_step_and_range(
				max_n, from, to, scale_base, scales, decimals)

			let hsl_color = fg_color_hsl('label')
			cx.textAlign = 'center'
			let m = measure_text(cx, ' ')
			let asc = m.fontBoundingBoxAscent
			let dsc = m.fontBoundingBoxDescent
			let x0 = x

			let v = ui.slider_value(id, from, to)
			let vx = round(x0 + lerp(v, from, to, 0, w)) + .5

			for (let v = min; v <= max; v += step) {
				let x = round(x0 + lerp(v, from, to, 0, w)) + .5

				// shadow markers that are too close to the current value.
				let alpha = clamp(abs(vx - x) / ui.em(3) - .7, 0, 1)

				let c = hsl_adjust(hsl_color, 1, 1, 1, alpha)
				cx.fillStyle  = c
				cx.strokeStyle = c

				cx.beginPath()
				cx.moveTo(x, round(y - ui.em(1.0)) + .5)
				cx.lineTo(x, round(y - ui.em(0.6)) + .5)
				cx.stroke()

				let s = dec(v, decimals)
				cx.fillText(s, x, y - ui.em(1.2)) //  - asc - dsc)
			}

			// show a marker for the current value
			{
				let x = vx
				cx.fillStyle   = fg_color('text')
				cx.strokeStyle = fg_color('text')

				cx.beginPath()
				cx.moveTo(x, round(y - ui.em(1.0)) + .5)
				cx.lineTo(x, round(y - ui.em(0.6)) + .5)
				cx.stroke()

				let s = dec(v, decimals)
				cx.fillText(s, x, y - ui.em(1.2)) //  - asc - dsc)
			}

		}

	},

})

// calendar ------------------------------------------------------------------

ui.calendar = function(id, fr, align, valign, min_w, min_h) {

}

// image ---------------------------------------------------------------------

ui.box_widget('img', {

	create: function(cmd, src, fr, align, valign, max_min_h, min_w, min_h) {

		let i = ui_cmd_box(cmd, fr, align, valign, min_w, min_h,
			src,
			max_min_h ?? 0 // -1=inf
		)

		let image = ui.state(src, 'image')
		if (!image) {
			image = new Image()
			image.src = src
			image.onload = function() {
				ui.redraw()
			}
			ui.state(src).set('image', image)
		}

		return i

	},

	before_measure: function(a, i, axis) {
		if (!axis) return // can't impose a width (min_w still works)

		let sw        = a[i+2]
		let src       = a[i+S-1]
		let max_min_h = a[i+S+0]

		let image = ui.state(src, 'image')
		if (!image || !image.complete) return
		let iw = image.width
		let ih = image.height
		if (!iw || !ih) return

		let max_h = (ih / iw) * sw // max h for max w that fits
		let min_h = min(max_h, repl(max_min_h, -1, 1/0))
		a[i+0+1] = max(a[i+0+1], min_h)
	},

	position: function(a, i, axis, sx, sw) {
		if (!axis) {
			// can't compute x,w until we know min_h, so assume align is stretch.
			a[i+0+0] = inner_x(a, i, 0, sx)
			a[i+2+0] = inner_w(a, i, 0, sw)
		} else {
			let sy = sx
			let sh = sw
			sx            = a[i+0+0]
			sw            = a[i+2+0]
			let min_h     = a[i+0+1]
			let src       = a[i+S-1]
			let max_min_h = a[i+S+0]

			let image = ui.state(src, 'image')
			if (!image || !image.complete) return
			let iw = image.width
			let ih = image.height
			if (!iw || !ih) return

			// fit image into the available space preserving aspect ratio.
			if (iw / ih > sw / sh) {
				a[i+2+0] = sw
				a[i+2+1] = sw * ih / iw
			} else {
				a[i+2+0] = sh * iw / ih
				a[i+2+1] = sh
			}

			// NOTE: 'stretch' align doesn't make sense with fitted images.
			a[i+0+0] = inner_x(a, i, 0, align_x(a, i, 0, sx, sw))
			a[i+2+0] = inner_w(a, i, 0, align_w(a, i, 0, sw))
			a[i+0+1] = inner_x(a, i, 1, align_x(a, i, 1, sy, sh))
			a[i+2+1] = inner_w(a, i, 1, align_w(a, i, 1, sh))
		}
	},

	draw: function(a, i) {

		let x = a[i+0]
		let y = a[i+1]
		let w = a[i+2]
		let h = a[i+3]

		let src = a[i+S-1]

		let image = ui.state(src, 'image')
		if (!image || !image.complete) return
		if (!w || !h) return

		cx.drawImage(image, x, y, w, h)
	},

})

// blit'able -----------------------------------------------------------------

ui.image_data = function(id, key, w, h) {
	let s = ui.state(id)
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

// sat-lum square ------------------------------------------------------------

function draw_cross(x0, y0, w, h, hue, sat, lum, alpha) {
	if (sat == null) return
	let x = round(x0 + lerp(sat, 0, 1, 0, w-1)) + .5
	let y = round(y0 + lerp(lum, 1, 0, 0, h-1)) + .5
	let d = 10.5
	cx.strokeStyle = hsl(360-hue, sat, lum > .5 ? 0 : 1, alpha)
	cx.beginPath()
	cx.moveTo(x, y); cx.lineTo(x+d, y)
	cx.moveTo(x, y); cx.lineTo(x-d, y)
	cx.moveTo(x, y); cx.lineTo(x, y+d)
	cx.moveTo(x, y); cx.lineTo(x, y-d)
	cx.stroke()
}

ui.widget('sat_lum_square', {

	create: function(cmd, id, hue, sat, lum) {

		keepalive(id)

		hue = hue ?? 0
		sat = sat ?? .5
		lum = lum ?? .5

		ui.state_init(id, 'sat', sat)
		ui.state_init(id, 'lum', lum)

		let cs = captured(id)
		if (cs) {
			ui.state(id).set('sat', cs.get('sat'))
			ui.state(id).set('lum', cs.get('lum'))
		}

		if (hit(id) && ui.click) {
			ui.focus(id)
			ui.capture(id)
		}

		// doesn't look too good...
		// if (hit(id))
		// 	ui.set_cursor('crosshair')

		if (ui.focused(id)) {
			let lum_step = ui.keydown('arrowup'   ) && 1 || ui.keydown('arrowdown') && -1
			let sat_step = ui.keydown('arrowright') && 1 || ui.keydown('arrowleft') && -1
			if (lum_step) {
				let lum = ui.state(id, 'lum')
				ui.state(id).set('lum', lum + (ui.key('shift') ? 0.1 : 1) * 0.1 * lum_step)
			}
			if (sat_step) {
				let sat = ui.state(id, 'sat')
				ui.state(id).set('sat', sat + (ui.key('shift') ? 0.1 : 1) * 0.1 * sat_step)
			}
		}

		return ui_cmd(cmd, id, ui.ct_i(), hue)
	},

	reindex: function(a, i, offset) {
		a[i+1] += offset
	},

	draw: function(a, i) {

		let id   = a[i+0]
		let ct_i = a[i+1]
		let hue  = a[i+2]

		let x = a[ct_i+0]
		let y = a[ct_i+1]
		let w = a[ct_i+2]
		let h = a[ct_i+3]

		let idata = ui.image_data(id, 'square', w, h)

		if (idata.hue != hue) {
			let d = idata.data
			let w = idata.width
			let h = idata.height
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					let sat = lerp(x, 0, w-1, 0, 1)
					let lum = lerp(y, 0, h-1, 1, 0)
					hsl_to_rgb_out(d, (y * w + x) * 4, hue, sat, lum)
				}
			}
			idata.hue = hue
		}

		cx.putImageData(idata, x, y)

		let hit_sat = hit(id)?.get('sat')
		let hit_lum = hit(id)?.get('lum')
		let sel_sat = ui.state(id, 'sat')
		let sel_lum = ui.state(id, 'lum')

		draw_cross(x, y, w, h, hue, hit_sat, hit_lum, 0.3)
		draw_cross(x, y, w, h, hue, sel_sat, sel_lum, 1.0)

	},

	hit: function(a, i) {

		let id   = a[i+0]
		let ct_i = a[i+1]

		let x = a[ct_i+0]
		let y = a[ct_i+1]
		let w = a[ct_i+2]
		let h = a[ct_i+3]

		let hit = hit_rect(x, y, w, h)
		if (hit) {
			let hs = hover(id)

			hs.set('sat', clamp(lerp(ui.mx - x, 0, w-1, 0, 1), 0, 1))
			hs.set('lum', clamp(lerp(ui.my - y, h-1, 0, 0, 1), 0, 1))
		}

		return hit
	},

})

// hue bar -------------------------------------------------------------------

function draw_hue_line(x, y, h, w, hue, alpha) {
	if (hue == null) return
	cx.strokeStyle = hsl(0, 0, 0, alpha)
	cx.beginPath()
	let hue_y = round(lerp(hue, 0, 360, 0, h-1))
	cx.moveTo(x    , y + hue_y + .5)
	cx.lineTo(x + w, y + hue_y + .5)
	cx.stroke()
}

ui.widget('hue_bar', {

	create: function(cmd, id, hue) {

		keepalive(id)
		ui.state_init(id, 'hue', hue)

		if (hit(id) && ui.click) {
			ui.focus(id)
			ui.capture(id)
		}
		let cs = captured(id)
		if (cs)
			ui.state(id).set('hue', cs.get('hue'))

		if (ui.focused(id)) {
			let step = ui.keydown('arrowup') && -1 || ui.keydown('arrowdown') && 1
			if (step) {
				let hue = ui.state(id, 'hue')
				hue = clamp(round(hue + (ui.key('shift') ? 1 : 10) * step), 0, 360)
				ui.state(id).set('hue', hue)
			}
		}

		return ui_cmd(cmd, id, ui.ct_i())
	},

	reindex: function(a, i, offset) {
		a[i+1] += offset
	},

	draw: function(a, i) {

		let id   = a[i+0]
		let ct_i = a[i+1]

		let x = a[ct_i+0]
		let y = a[ct_i+1]
		let w = a[ct_i+2]
		let h = a[ct_i+3]

		let idata = ui.image_data(id, 'bar', w, h)

		if (!idata.ready) {
			let d = idata.data
			let w = idata.width
			let h = idata.height
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					let hue = lerp(y, 0, h-1, 0, 360)
					hsl_to_rgb_out(d, (y * w + x) * 4, hue, 1, .5)
				}
			}
			idata.ready = true
		}

		cx.putImageData(idata, x, y)

		let sel_hue = ui.state(id, 'hue')
		let hit_hue = hit(id, 'hue')

		draw_hue_line(x, y, h, w, hit_hue, 0.3)
		draw_hue_line(x, y, h, w, sel_hue, 1.0)

	},

	hit: function(a, i) {

		let id   = a[i+0]
		let ct_i = a[i+1]

		let x = a[ct_i+0]
		let y = a[ct_i+1]
		let w = a[ct_i+2]
		let h = a[ct_i+3]

		let hs = ui.captured(id) || (hit_rect(x, y, w, h) && hover(id))
		if (hs) {
			let hue = clamp(lerp(ui.my - y, 0, h - 1, 0, 360), 0, 360)
			hs.set('hue', hue)
			return true
		}
	},

})

// aspect box ----------------------------------------------------------------

ui.box_ct_widget('aspect_box', {
	create: function(cmd, aspect, fr, align, valign, min_w, min_h) {
		return ui_cmd_box_ct(cmd, fr, align, valign, min_w, min_h,
			aspect ?? 1)
	},
	measure: function(a, i, axis) {
		ct_stack_push(a, i)
		let w = a[i+2+axis]
		if (axis) {
			let aspect = a[i+S+0]
			w = round(a[i+2] / aspect)
		}
		add_ct_min_wh(a, axis, w)
	},
})

// color picker --------------------------------------------------------------

ui.color_picker = function(id, hue, sat, lum) {
	hue = hue ?? 0
	sat = sat ?? .5
	lum = lum ?? .5
	ui.v(1, ui.sp())
		ui.h(1, ui.sp05())
			ui.record()
				ui.stack('', 0, null, null, ui.em(1))
				 	ui.hue_bar(id+'.hb', hue)
				ui.end_stack()
			let hue_bar = ui.end_record()
			ui.record()
				ui.stack()
					hue = ui.state(id+'.hb', 'hue')
					ui.sat_lum_square(id+'.sl', hue, sat, lum)
				ui.end_stack()
			let sl_square = ui.end_record()
			sat = ui.state(id+'.sl', 'sat') ?? sat
			lum = ui.state(id+'.sl', 'lum') ?? lum
			ui.aspect_box(1, 1, 's', 't')
				ui.bb(':'+hsl(hue, sat, lum))
			ui.end_aspect_box()
			ui.play_record(sl_square)
			ui.play_record(hue_bar)
		ui.end_h()
		ui.h(0, 0, 's')
			ui.label(id+'.input_hsl', 'HSL', .5)
			let s =
				dec(hue)+'\u00B0, '+
				dec(sat*100)+'%, '+
				dec(lum*100)+'%'
			ui.input(id+'.input_hsl', s, 1)
		ui.end_h()
		ui.h(0, 0, 's')
			ui.label(id+'.input_rgb', 'HEX', .5)
			s = hsl_to_rgb_hex(hue, sat, lum)
			ui.input(id+'.input_rgb', s, 1)
		ui.end_h()
	ui.end_v()
}

// bg_dots -------------------------------------------------------------------
// background animation with randomly connected dots.

{
let dot_density = 2 // per 100px^2 surface
let max_distance = 160 // between two dots

function point_distance(p1, p2) {
	let dx = abs(p1.x - p2.x)
	let dy = abs(p1.y - p2.y)
	return Math.sqrt(dx**2 + dy**2)
}

function random(min, max) {
	return Math.random() * (max - min) + min
}

function coinflip(a, b) {
	return Math.random() > 0.5 ? a : b
}

ui.widget('bg_dots', {

	create: function(cmd, id, speed) {
		assert(id, 'id required')
		let ct_i = ui.ct_i()
		return ui_cmd(cmd, id, ct_i, round((speed ?? 1) * 1024))
	},

	draw: function(a, i) {

		let id    = a[i+0]
		let ct_i  = a[i+1]
		let speed = a[i+2] / 1024

		let x = a[ct_i+0]
		let y = a[ct_i+1]
		let w = a[ct_i+2]
		let h = a[ct_i+3]

		let dot_num = round(w * h / 10000 * dot_density)

		if (!dot_num)
			return

		keepalive(id)
		let dots = ui.state(id, 'dots')
		if (!dots) {
			dots = []
			ui.state(id).set('dots', dots)

			dots.mouse_dot = {}
			dots.push(dots.mouse_dot)
		}

		for (let i = dots.length; i < dot_num+1; i++) {
			let t = {}
			let d = max_distance
			t.x  = random(-d, w+d)
			t.y  = random(-d, h+d)
			t.vx = random(0.1, 1) * coinflip(1, -1)
			t.vy = random(0.1, 1) * coinflip(1, -1)
			dots.push(t)
		}
		dots.length = dot_num+1

		dots.mouse_dot.x = (ui.mx ?? -1000) - x
		dots.mouse_dot.y = (ui.my ?? -1000) - y

		cx.save()

		cx.translate(x, y)

		cx.beginPath()
		cx.rect(0, 0, w, h)
		cx.clip()

		for (let t of dots) {
			if (t != dots.mouse_dot) {
				cx.fillStyle = fg_color('label')
				cx.beginPath()
				cx.arc(t.x, t.y, 2, 0, Math.PI*2, true)
				cx.closePath()
				cx.fill()
			}
		}

		for (let i = 0; i < dots.length; i++) {
			for (let j = i+1; j < dots.length; j++) {
				let t1 = dots[i]
				let t2 = dots[j]
				let dp = point_distance(t1, t2) / max_distance
				if (dp < 1) {
					let alpha = 1 - dp
					cx.strokeStyle = hsl_adjust(fg_color_hsl('label'), 1, 1, 1, alpha)
					cx.lineWidth = 0.8
					cx.beginPath()
					cx.moveTo(t1.x, t1.y)
					cx.lineTo(t2.x, t2.y)
					cx.stroke()
					cx.lineWidth = 1
				}
			}
		}

		if (speed)
			for (let t of dots) {
				if (t != dots.mouse_dot) {
					t.x += t.vx * speed
					t.y += t.vy * speed
					let d = max_distance
					if (!(t.x > -d && t.x < w+d && t.y > -d && t.y < h+d)) { // dead
						if (coinflip(0, 1)) {
							t.x = random  (-d, w+d)
							t.y = coinflip(-d, h+d)
						} else {
							t.x = coinflip(-d, w+d)
							t.y = random  (-d, h+d)
						}
						t.vx = random(0.1, 1) * (t.x > w / 2 ? -1 : 1)
						t.vy = random(0.1, 1) * (t.y > h / 2 ? -1 : 1)
					}
				}
			}

		cx.restore()

		ui.animate()
	},

})
}

// frame graphs --------------------------------------------------------------

ui.frame_graphs = {}
function frame_graph(name, unit, decimals, min, max, duration) {
	let n = 60 * (duration ?? 10)
	let va = []
	let mf = 10**decimals
	let g = {i: 0, n: n, unit: unit, min: min, max: max, decimals: decimals, mf: mf,
		values: va}
	for (let i = 0; i < n; i++)
		va[i] = min
	g.push = function(v) {
		va[g.i] = round(v * mf)
		g.i = (g.i + 1) % n
	}
	ui.frame_graphs[name] = g
}
function frame_graph_push(name, v) {
	ui.frame_graphs[name].push(v)
}
ui.frame_graph_push = frame_graph_push

frame_graph('frame_time'       , 'ms'  , 1, 0,  1/60 * 1000)
frame_graph('frame_make_time'  , 'ms'  , 1, 0,  1/60 * 1000)
frame_graph('frame_layout_time', 'ms'  , 1, 0,  1/60 * 1000)
frame_graph('frame_draw_time'  , 'ms'  , 1, 0,  1/60 * 1000)
frame_graph('frame_hit_time'   , 'ms'  , 1, 0,  1/60 * 1000)
frame_graph('frame_bandwidth'  , 'Mbps', 1, 0,     5) // 3Mbps=3G; 5Mbps=720p@60fps
frame_graph('frame_compression', '%'   , 0, 0,   100)
frame_graph('frame_pack_time'  , 'ms'  , 1, 0,    10)
frame_graph('frame_unpack_time', 'ms'  , 1, 0,    10)

ui.box_widget('frame_graph', {
	create: function(cmd, name, fr, align, valign, min_w, min_h) {
		ui_cmd_box(cmd, fr, align, valign, min_w, min_h,
			name, ui.frame_graphs[name])
		//ui.animate()
	},
	draw: function(a, i) {
		let x0 = a[i+0]
		let y0 = a[i+1]
		let w  = a[i+2]
		let h  = a[i+3]
		let name = a[i+S-1]
		let g    = a[i+S+0]
		if (!g) return

		cx.save()
		cx.beginPath()
		cx.rect(x0, y0, w, h)
		cx.clip()

		cx.beginPath()
		let step = round((g.n / w) * 2)
		let i0 = step - g.i % step
		let min =  1/0
		let max = -1/0
		let sum = 0
		let n = 0
		for (let i = 0; i < g.n; i += step) {
			let v = g.values[(g.i+i0+i) % g.n] / g.mf
			min = Math.min(min, v)
			max = Math.max(max, v)
			sum += v
			n++
			let x = x0 + lerp(i0+i, 0, g.n, 0, w + step)
			let y = y0 + lerp(v, g.min, g.max, h, 0)
			if (!i)
				cx.moveTo(x, y)
			else
				cx.lineTo(x, y)
		}
		cx.strokeStyle = fg_color('link')
		cx.stroke()

		let avg = sum / n

		cx.fillStyle = fg_color('label')
		let y1 = y0 + ui.em()
		let x1 = x0 + ui.sp()
		cx.font = font_weight + ' ' + (font_size * .75) + 'px ' + font
		cx.textAlign = 'left'
		let y = y1
		let x = x1
		cx.fillText('min', x, y); y += ui.em()
		cx.fillText('max', x, y); y += ui.em()
		cx.fillText('avg', x, y)
		y = y1
		x = x1 + ui.em(6)
		let d = g.decimals
		cx.textAlign = 'right'
		cx.fillText(dec(min, d)+g.unit, x, y); y += ui.em()
		cx.fillText(dec(max, d)+g.unit, x, y); y += ui.em()
		cx.fillText(dec(avg, d)+g.unit, x, y)

		cx.restore()
	},
})

// live-move list element pattern --------------------------------------------

// implements:
//   move_element_start(move_i, move_n, i1, i2[, x1, x2])
//   move_element_update(elem_x)
//   move_element_update_dx(elem_dx)
//   move_element_stop() -> over_i
// uses:
//   movable_element_size(elem_i) -> w
//   set_movable_element_pos(i, x, moving)
//
ui.live_move_mixin = function(e) {

	e = e || {}

	let move_i1, move_i2, i1, i2, i1x, i2x, offsetx
	let move_x0, move_x, over_i, over_p, over_x
	let sizes

	e.move_element_start = function(move_i, move_n, _i1, _i2, _i1x, _i2x, _offsetx) {
		move_n = move_n ?? 1
		move_i1 = move_i
		move_i2 = move_i + move_n
		move_x = null
		over_i = null
		over_x = null
		i1  = _i1
		i2  = _i2
		i1x = _i1x
		i2x = _i2x
		offsetx = _offsetx || 0
		sizes = []
		for (let i = i1; i < i2; i++)
			sizes[i] = e.movable_element_size(i)
		if (i1x == null) {
			i1x = 0
			for (let i = 0; i < i1; i++)
				i1x += e.movable_element_size(i)
			i2x = i1x
			for (let i = i1; i < i2; i++) {
				if (i < move_i1 || i >= move_i2)
					i2x += sizes[i]
			}
		}
		move_x0 = 0
		for (let i = i1; i < move_i; i++)
			move_x0 += sizes[i]
		e.x0 = move_x0
		e.move_element_update_dx(0)
	}

	e.move_element_stop = function() {
		set_moving_element_pos(over_x, false)
		return over_i
	}

	function hit_test(elem_x) {
		let x = i1x
		let x0 = i1x
		let last_over_i = over_i
		let new_over_i, new_over_p
		for (let i = i1; i < i2; i++) {
			if (i < move_i1 || i >= move_i2) { // skip moving elements
				let w = sizes[i]
				let x1 = x + w / 2
				if (elem_x < x1) {
					new_over_i = i
					new_over_p = lerp(elem_x, x0, x1, 0, 1)
					over_i = new_over_i
					over_p = new_over_p
					return new_over_i != last_over_i
				}
				x += w
				x0 = x1
			}
		}
		new_over_i = i2
		let x1 = i2x
		new_over_p = lerp(elem_x, x0, x1, 0, 1)
		over_i = new_over_i
		over_p = new_over_p
		return new_over_i != last_over_i
	}

 	// `[i1..i2)` index generator with `[move_i1..move_i2)` elements moved.
	function each_index(f) {
		if (over_i < move_i1) { // moving upwards
			for (let i = i1     ; i < over_i ; i++) f(i)
			for (let i = move_i1; i < move_i2; i++) f(i, true)
			for (let i = over_i ; i < move_i1; i++) f(i)
			for (let i = move_i2; i < i2     ; i++) f(i)
		} else {
			for (let i = i1     ; i < move_i1; i++) f(i)
			for (let i = move_i2; i < over_i ; i++) f(i)
			for (let i = move_i1; i < move_i2; i++) f(i, true)
			for (let i = over_i ; i <  i2    ; i++) f(i)
		}
	}

	function set_moving_element_pos(x, moving, vi) {
		for (let i = move_i1; i < move_i2; i++) {
			e.set_movable_element_pos(i, x != null ? offsetx + x : null, moving, vi)
			x += sizes[i]
			if (vi != null)
				vi++
		}
	}

	e.move_element_update = function(elem_x) {
		elem_x = elem_x != null ? clamp(elem_x, i1x, i2x) : null
		if (elem_x == move_x)
			return
		move_x = elem_x
		e.move_x = move_x
		if (hit_test(move_x ?? 1/0)) { // first time always hits because over_i is null
			e.over_i = over_i
			e.over_p = over_p
			let x = i1x
			over_x = null
			let vi = 0 // visual index
			let mx = move_x
			each_index(function(i, moving) {
				if (moving) {
					over_x = over_x ?? x
					e.set_movable_element_pos(i, mx != null ? offsetx + mx : null, true, vi)
					if (mx != null)
						mx += sizes[i]
				} else {
					e.set_movable_element_pos(i, offsetx + x, false, vi)
				}
				x += sizes[i]
				vi++
			})
		} else {
			set_moving_element_pos(move_x, true)
		}
	}

	e.move_element_update_dx = function(elem_dx) {
		e.move_element_update(move_x0 + elem_dx)
	}

	return e
}

}()) // module function
