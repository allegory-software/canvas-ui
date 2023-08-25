/*

	JavaScript "assorted lengths of wire" library.
	Written by Cosmin Apreutesei. Public Domain.

LOADING

	<script src=glue.js [global] [extend]>

	  global flag:   dump the `glue` namespace into `window`.
 	  extend flag:   extend Object, String, Array, Number, Set, Map prototypes.

BROWSER DETECTION

	Firefox Chrome Safari Safari_min Safari_maj

TYPE CHECKING

	isobject(e)
	isarray(a)
	isobj(t)
	isstr(s)
	isnum(n)
	isbool(b)
	isfunc(f)

LOGIC

	repl(x, v, z)

TYPE CONVERSIONS

	num(s) -> n
	str(v) -> s
	bool(s) -> b

MATH

	inf
	floor(x) ceil(x) round(x) snap(x, p)
	abs(x)
	min(x, y) max(x, y)
	sqrt(x)
	ln(x)
	log10(x)
	random()
	PI sin(x) cos(x) tan(x) rad deg
	clamp(x, x0, x1)
	sign(x)
	strict_sign(x)
	lerp(x, x0, x1, y0, y1)
	mod(a, b)
	nextpow2(x)

NUMBER FORMATTING

	dec(x, [decimals])
	format_base(x, [base], [digits])

CALLBACKS

	noop
	return_true
	return_false
	return_arg
	wrap(inherited, f) -> f'
	do_before(inherited, f) -> f'
	do_after(inherited, f) -> f'

ERRORS

	pr(...)
	warn(...)
	debug(...)
	trace(...)
	trace_if(cond, ...)
	assert(v, err, ...) -> v

EXTENDING BUILT-IN OBJECTS

	property(class|instance, prop, descriptor | get,set)
	method(class|instance, method, func)
	override(class|instance, method, func)
	alias(class|instance, new_name, old_name)
	override_property_setter(class|instance, prop, set)

STRINGS

	subst(s, '{0} {1}', a0, a1, ...)
	display_name(s)
	lower_ai_ci(s)
	find_ai_ci(s, s1)
	words(s) -> a | null
	wordset(s) -> {word1: true, ...} | null
	catany(sep, ...)
	catall(...)
	captures(s, re) -> [capture1, ...]

ARRAYS

	array(...) -> a                        new Array(...)
	empty_array -> []                      global empty array, read-only!
	range(i, j, step, f) -> a
	array_set(a, a1) -> s
	extend(a, a1) -> a
	insert(a, i, v) -> a
	remove(a, i) -> v
	remove_value(a, v) -> i
	remove_values(a, cond) -> a
	array_move(a, i1, n, insert_i)
	array_equals(a1, a2, [i1], [i2]) -> t|f
	binsearch(a, v, cmp, i1, i2)
	uniq_sorted(a) -> a
	remove_duplicates(a) -> a

HASH MAPS

	obj() -> o                      create a native map, string keys only
	set(iter) -> m                  create a set, holds all types
	s.addset(s2) -> s               dump set into set
	s.set(s2) -> s                  set elements to s'
	s.toarray() -> [v1,...]         array of elements in insert order
	s.equals(s2[, same_order]) -> t|f    compare sets
	map(iter) -> m                  create a map, keys and values can be of any type
	m.first_key
	m.assign                        like assign but for a map
	empty -> {}                     global empty object, inherits Object
	empty_obj -> obj()              global empty object, does not inherit Object
	empty_set -> set()              global empty set, read-only!
	keys(t) -> [k1, ...]
	assign(dt, t1, ...)             dump t1, ... into dt
	assign_opt(dt, t1, ...)         dump t1, ... into dt, skips undefined values
	attr(t, k[, cons])              t[k] = t[k] || cons(); cons defaults to obj
	memoize(f)
	count_keys(t, [max_n]) -> n     count keys in t up-to max_n
	first_key(t) -> k

TYPED ARRAYS

	[dyn_][f32|i8|u8|i16|u16|i32|u32]arr(arr|[...]|capacity, [nc]) -> [dyn]arr
		.set(in_arr, [offset=0], [len], [in_offset=0])
		.invalidate([offset=0], [len])
		.grow(cap, [preserve_contents=true], [pow2=true])
		.grow_type(arr_type|max_index|[...]|arr, [preserve_contents=true])
		.setlen(len)

DATA STRUCTURES

	freelist(create_f) -> fl
	fl.alloc() -> e
	fl.free(e)

HASHING

	hash32(s) -> x

DATE/TIME CALCULATIONS

	time() -> ts
	time(y, m, d, H, M, s, ms) -> ts
	time(date_str) -> ts
	[day|month|year|week](ts[, offset], [local]) -> ts
	days(delta_ts) -> ds
	[year|month|week_day|month_day|hours|minutes|seconds]_of(ts, [local]) -> n
	set_[year|month|month_day|hours|minutes|seconds](ts, n)
	week_start_offset([country])

DATE/TIME FORMATTING

	locale()

	weekday_name (ts, ['long'], [locale])
	month_name   (ts, ['long'], [locale])
	month_year   (ts, ['long'], [locale])

	format_timeofday(ds, ['s|ms']) -> s
	format_date(ts, [locale], ['d|s|ms']) -> s
	format_duration(ds, ['approx[+s]'|'long']) -> s
	format_timeago(ts) -> s

DATE/TIME PARSING

	parse_date(s, [locale], [validate], ['d|s|ms']) -> ts
	parse_timeofday(s, [validate], ['s|ms']) -> ds
	parse_duration(s) -> ds

	date_placeholder_text([locale])

FILE SIZE FORMATTING

	format_kbytes(x, [dec], [mag], [mul = 1024]) -> s

COLORS

	hsl_to_rgb_out(out, i, h, s, L, [a])
	hsl_to_rgb_hex(h, s, L, [a]) -> '#rrggbb'

GEOMETRY

	point_around(cx, cy, r, angle) -> [x, y]
	clip_rect(x1, y1, w1, h1, x2, y2, w2, h2, [out]) -> [x, y, w, h]
	rect_intersects(x1, y1, w1, h1, x2, y2, w2, h2) -> t|f

TIMERS

	runafter(t, f) -> tid
	runevery(t, f) -> tid
	runagainevery(t, f) -> tid
	clock()
	timer(f) -> tm; tm(t) to rearm; tm() to cancel; tm(true) to rearm to last duration.

SERIALIZATION

	[try_]json_arg(s) -> t
	json(t) -> s

CLIPBOARD

	copy_to_clipboard(text, done_func)

LOCAL STORAGE

	save(key, [s])
	load(key) -> s

URL DECODING, ENCODING AND UPDATING

	url_parse(s) -> t
	url_format(t) -> s

NATIVE CUSTOM EVENTS

	custom_event    (name, ...args)
	custom_event_up (name, ...args)

FAST GLOBAL EVENTS

	listen(event, f, [on])
	announce(event, ...args)

INTER-WINDOW COMMUNICATION

	broadcast(name, ...args)
	setglobal(name, val)
	^window.global_changed(name, v, v0)
	^window.NAME_changed(v, v0)

MULTI-LANGUAGE STUBS

	S(id, default)                         get labeled string in current language
	lang()                                 get current language
	country()                              get current country
	href(url, [lang])                      rewrite URL for (current) language

AJAX REQUESTS

	ajax(opt) -> req
	get(url, success, [error], [opt]) -> req
	post(url, data, [success], [error], [opt]) -> req

*/

(function () {
"use strict"
let G = window
let g = {}
G.glue = g

function DEBUG(k, dv) {
	dv = dv ?? false
	if (!(k in G))
		G[k] = dv
	if (G[k] !== dv)
		console.log(k, G[k])
}

DEBUG('DEBUG_AJAX')

// browser detection ---------------------------------------------------------

let Firefox, Chrome, Safari, Safari_maj, Safari_min
{
let ua = navigator.userAgent.toLowerCase()
Firefox = ua.includes('firefox')
Chrome  = ua.includes('chrome')
Safari  = ua.includes('safari') && !Chrome
if (Safari) {
	// Safari is by far the shittiest browser that doesn't even have auto-update
	// so you might need this so you can give the finger to those poor bastards
	// who haven't yet bought this years's hardware so they can have this year's
	// OS which ships with this year's Safari.
	let m = ua.match(/version\/(\d+)\.(\d+)/)
	Safari_maj = m && parseFloat(m[1])
	Safari_min = m && parseFloat(m[2])
}
}

// types ---------------------------------------------------------------------

let isobject = e => e != null && typeof e == 'object' // includes arrays, HTMLElements, etc.
let isarray = Array.isArray
let isobj = t => isobject(t) && (t.constructor == Object || t.constructor === undefined)
let isstr = s => typeof s == 'string'
let isnum = n => typeof n == 'number'
let isbool = b => typeof b == 'boolean'
let isfunc = f => typeof f == 'function'

// logic ---------------------------------------------------------------------

// single-value filter.
function repl(x, v, z) { return x === v ? z : x }

// type conversion -----------------------------------------------------------

function num(s) {
	let x = parseFloat(s)
	return x != x ? undefined : x
}

let bool = b => !!b

let str = String

// math ----------------------------------------------------------------------

let inf = Infinity
let floor = Math.floor // rounds towards -1/0
let ceil = Math.ceil
let round = Math.round
let snap = (x, p) => round(x / p) * p
let trunc = Math.trunc // rounds towards 0
let abs = Math.abs
let min = Math.min
let max = Math.max
let sqrt = Math.sqrt
let ln = Math.log
let log10 = Math.log10
let logbase = (x, base) => ln(x) / ln(base)
let random = Math.random
let sign = Math.sign

// NOTE: returns x1 if x1 < x0, which enables the idiom
// `a[clamp(i, 0, b.length-1)]` to return undefined when b is empty.
function clamp(x, x0, x1) {
	return min(max(x, x0 ?? -1/0), x1 ?? 1/0)
}

// sign() that only returns -1 or 1, never 0, and returns -1 for -0.
function strict_sign(x) {
	return 1/x == 1/-0 ? -1 : (x >= 0 ? 1 : -1)
}

function lerp(x, x0, x1, y0, y1) {
	return y0 + (x-x0) * ((y1-y0) / ((x1 - x0) ? (x1 - x0) : x1))
}

// % that works with negative numbers.
function mod(a, b) {
	return (a % b + b) % b
}

function nextpow2(x) {
	return max(0, 2**(ceil(ln(x) / ln(2))))
}

let PI  = Math.PI
let sin = Math.sin
let cos = Math.cos
let tan = Math.tan
let rad = PI / 180
let deg = 180 / PI

let asin  = Math.asin
let acos  = Math.acos
let atan  = Math.atan
let atan2 = Math.atan2

function format_base(x, base, digits) {
	let s = x.toString(base)
	if (digits != null)
		s = s.padStart(digits, '0')
	return s
}

function dec(x, d) { return x.toFixed(d) }

// callbacks -----------------------------------------------------------------

let noop = function() {}
let return_true = function() { return true; }
let return_false = function() { return false; }
let return_arg = function(arg) { return arg; }

function wrap(inherited, func) {
	inherited = inherited || noop
	return function(...args) {
		return func.call(this, inherited, ...args)
	}
}

function do_before(inherited, func) {
	return repl(inherited, noop) && function(...args) {
		func.call(this, ...args)
		inherited.call(this, ...args)
	} || func
}

function do_after(inherited, func) {
	return repl(inherited, noop) && function(...args) {
		inherited.call(this, ...args)
		func.call(this, ...args)
	} || func
}

// error handling ------------------------------------------------------------

let pr    = console.log
let warn  = console.warn
let debug = console.log // console.debug makes everything blue wtf.
let trace = console.trace

function trace_if(cond, ...args) {
	if (!cond) return
	console.trace(...args)
}

function assert(ret, ...args) {
	if (!ret)
		throw (args.length ? args.join('') : 'assertion failed')
	return ret
}

/* extending built-in objects ------------------------------------------------

NOTE: built-in methods are actually "data properties" that shadow normal
methods so if we want to override a method we need to replace the property.
These special kinds of methods are also non-enumerable, unlike normal
methods, which is useful if we want to extend Object without injecting
enumerables into it (which changes Object.keys() and `for in` loops).

*/

// extend an object with a property, checking for upstream name clashes.
// NOTE: shadows both instance and prototype fields.
function property(cls, prop, get, set) {
	let proto = cls.prototype || cls
	if (prop in proto)
		assert(false, cls.constructor.name, '.', prop,
			' already exists and it\'s set to: ', proto[prop])
	let descriptor = isobject(get) ? get : {get: get, set: set}
	Object.defineProperty(proto, prop, descriptor)
}

// extend an object with a method, checking for upstream name clashes.
// NOTE: shadows both instance and prototype methods!
function method(cls, meth, func) {
	property(cls, meth, {
		value: func,
		enumerable: false,
	})
}

// override a method, with the ability to override a built-in method.
function override(cls, meth, func) {
	let proto = cls.prototype || cls
	let inherited = proto[meth]
	assert(inherited, cls.type || cls.name, '.', meth, ' does not exist')
	function wrapper(...args) {
		return func.call(this, inherited, ...args)
	}
	Object.defineProperty(proto, meth, {
		value: wrapper,
		enumerable: false,
	})
}

function getRecursivePropertyDescriptor(obj, key) {
	return Object.prototype.hasOwnProperty.call(obj, key)
		? Object.getOwnPropertyDescriptor(obj, key)
		: getRecursivePropertyDescriptor(Object.getPrototypeOf(obj), key)
}
function getPropertyDescriptor(obj, key) {
	return key in obj && getRecursivePropertyDescriptor(obj, key)
}

function alias(cls, new_name, old_name) {
	let proto = cls.prototype || cls
	let d = getPropertyDescriptor(proto, old_name)
	assert(d, cls.type || cls.name, '.', old_name, ' does not exist')
	Object.defineProperty(proto, new_name, d)
}

// override a property setter in a prototype *or instance*.
function override_property_setter(cls, prop, set) {
	let proto = cls.prototype || cls
	let d0 = getPropertyDescriptor(proto, prop)
	assert(d0, cls.type || cls.name, '.', prop, ' does not exist')
	let inherited = d0.set || noop
	function wrapper(v) {
		return set.call(this, inherited, v)
	}
	d0.set = wrapper
	Object.defineProperty(proto, prop, d0)
}

// override a property getter in a prototype *or instance*.
function override_property_getter(cls, prop, get) {
	let proto = cls.prototype || cls
	let d0 = getPropertyDescriptor(proto, prop)
	assert(d0, cls.type || cls.name, '.', prop, ' does not exist')
	let inherited = d0.get || noop
	function wrapper(v) {
		return get.call(this, inherited, v)
	}
	d0.get = wrapper
	Object.defineProperty(proto, prop, d0)
}

// strings -------------------------------------------------------------------

// usage:
//	 subst('{1} of {0}', total, current)
//	 subst('{1} of {0}', [total, current])
//	 subst('{1} of {0:foo:foos}', [total, current])
//	 subst('{current} of {total}', {'current': current, 'total': total})

function subst(s, ...args) {
	if (!args.length)
		return s.valueOf()
	if (isarray(args[0]))
		args = args[0]
	if (isobject(args[0]))
		args = args[0]
	return s.replace(/{(\w+)\:(\w+)\:(\w+)}/g, function(match, s, singular, plural) {
		let v = num(args[s])
		return v != null ? v + ' ' + (v > 1 ? plural : singular) : s
	}).replace(/{([\w\:]+)}/g, (match, s) => args[s])
}

function starts (s, s1) { return s.startsWith(s1) }
function ends   (s, s1) { return s.endsWith  (s1) }

let upper  = s => s.toUpperCase()
let upper2 = s => ' ' + s.slice(1).toUpperCase()
function display_name(s) {
	return s.replace(/[\w]/, upper).replace(/(_[\w])/g, upper2)
}

function lower_ai_ci(s) {
	return s.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

function find_ai_ci(s, s1) {
	return repl(lower_ai_ci(s).indexOf(lower_ai_ci(s1)), -1, null)
}

// concat args, skipping null ones. returns null if all args are null.
let non_null = s => s != null
function catany(sep, ...args) {
	if (args.length == 0)
		return null
	if (args.length == 1)
		return args[0] != null ? args[0] : null
	else if (args.length == 2)
		return (
			  args[0] != null && args[1] != null ? args[0] + sep + args[1]
			: args[0] != null ? args[0]
			: args[1] != null ? args[1]
			: null
		)
	let a = args.filter(non_null)
	return a.length ? a.join(sep) : null
}

// concat args. if any arg is null return nothing.
function catall(...args) {
	for (let i = 0, n = args.length; i < n; i++)
		if (args[i] == null)
			return
	return catany('', ...args)
}

function esc(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

function words(s) {
	if (!isstr(s)) return s
	s = s.trim()
	if (!s) return []
	return s.split(/\s+/)
}

function wordset(s) {
	if (!isstr(s)) return s
	let ws = obj()
	for (let word of words(s))
		ws[word] = true
	return ws
}

function captures(s, re) {
	let m = s.match(re)
	if (m) m.remove(0)
	return m || empty_array
}

// arrays --------------------------------------------------------------------

let array = (...args) => new Array(...args)

let empty_array = []

function range(i1, j, step, f) {
	step = step ?? 1
	f = f || return_arg
	let a = []
	for (let i = i1; i < j; i += step)
		a.push(f(i))
	return a
}

function extend(a, a1) {
	let i0 = a.length
	let n = a1.length
	a.length += n
	for (let i = 0; i < n; i++)
		a[i0+i] = a1[i]
	return a
}

function array_set(a, a1) {
	let n = a1.length
	a.length = n
	for (let i = 0; i < n; i++)
		a[i] = a1[i]
	return a
}

function insert(a, i, v) {
	if (i == null)
		a.push(v)
	else if (i >= a.length)
		a[i] = v
	else
		a.splice(i, 0, v)
	return a
}

function remove(a, i) {
	return a.splice(i, 1)[0]
}

function remove_value(a, v) {
	let i = a.indexOf(v)
	if (i != -1)
		a.splice(i, 1)
	return i
}

function remove_values(a, cond) {
	let i = 0, j = 0
	while (i < a.length) {
		let v = a[i]
		if (!cond(v, i, a))
			a[j++] = v
		i++
	}
	a.length = j
	return a
}

// move the n elements at i1 to a new position which is an index in the
// array as it stands after the removal of the elements to be moved.
function array_move(a, i1, n, insert_i) {
	a.splice(insert_i, 0, ...a.splice(i1, n))
}

function array_equals(a0, a, i0, i1) {
	i0 = i0 || 0
	i1 = i1 || max(a.length, a1.length)
	if (i1 > min(a.length, a1.length))
		return false
	for (let i = i0; i < i1; i++)
		if (a[i] !== a1[i])
			return false
	return true
}

// binary search for an insert position that keeps the array sorted.
// using '<' gives the first insert position, while '<=' gives the last.
let cmps = {}
cmps['<' ] = ((a, b) => a <  b)
cmps['>' ] = ((a, b) => a >  b)
cmps['<='] = ((a, b) => a <= b)
cmps['>='] = ((a, b) => a >= b)
function binsearch(a, v, cmp, i1, i2) {
	let lo = (i1 ?? 0) - 1
	let hi = (i2 ?? a.length)
	cmp = cmps[cmp || '<'] || cmp
	while (lo + 1 < hi) {
		let mid = (lo + hi) >> 1
		if (cmp(a[mid], v))
			lo = mid
		else
			hi = mid
	}
	return hi
}

function uniq_sorted() {
	return a.remove_values(function(v, i, a) {
		return i && v == a[i-1]
	})
}

function remove_duplicates(a) {
	if (a.length > 40) { // go heavy after 64k iterations.. too soon?
		let s = set(a)
		a.length = 0
		for (let v of s)
			a.push(v)
		return a
	}
	return remove_values(a, function(v, i, a) {
		return a.indexOf(v) != i
	})
}

// hash maps -----------------------------------------------------------------

let obj = () => Object.create(null)
let set = (iter) => new Set(iter)
let map = (iter) => new Map(iter)

function map_first_key(m) {
	// let's hope the compiler sees this pattern and doesn't actually allocate
	// an iterator object for this.
	for (let k of m.keys())
		return k
}

function map_assign(m, m1) {
	for (let [k,v] of m1)
		m.set(k, v)
	return m
}

function set_addset(s, s1) {
	for (let k of s1)
		s.add(k)
	return s
}

function set_set(s, s1) {
	s.clear()
	return set_addset(s, s1)
}

function set_toarray(s) {
	return Array.from(s)
}

function set_equals(s1, s2, same_order) {
	if (s1.size != s2.size)
		return false
	if (same_order) {
		let it1 = s1.values()
		let it2 = s2.values()
		for (let i = 0, n = s1.size; i < n; i++) {
			let v1 = it1.next().value
			let v2 = it2.next().value
			if (v1 != v2)
				return false
		}
	} else {
		for (let k1 of s1)
			if (!s2.has(k1))
				return false
	}
	return true
}

let empty = {}
let empty_obj = obj()
let empty_set = set()

let keys = Object.keys

let assign = Object.assign

// like Object.assign() but skips assigning `undefined` values.
function assign_opt(dt, ...ts) {
	for (let t of ts)
		if (t != null)
			for (let k in t)
				if (!t.hasOwnProperty || t.hasOwnProperty(k))
					if (t[k] !== undefined)
						dt[k] = t[k]
	return dt
}

function attr(t, k, cons) {
	cons = cons || obj
	let v = (t instanceof Map) ? t.get(k) : t[k]
	if (v === undefined) {
		v = cons()
		if (t instanceof Map)
			t.set(k, v)
		else
			t[k] = v
	}
	return v
}

// TOOD: multi-arg memoize.
function memoize(f) {
	let t = new Map()
	return function(x) {
		if (t.has(x))
			return t.get(x)
		else {
			let y = f(x)
			t.set(x, y)
			return y
		}
	}
}

function count_keys(t, max_n) {
	let n = 0
	for (let k in t) {
		if (!t.hasOwnProperty(k))
			continue
		if (n === max_n)
			break
		n++
	}
	return n
}


function first_key(t) {
	for (let k in t)
		if (t.hasOwnProperty(k))
			return k
}

// typed arrays --------------------------------------------------------------

let f32arr = Float32Array
let i8arr  = Int8Array
let u8arr  = Uint8Array
let i16arr = Int16Array
let u16arr = Uint16Array
let i32arr = Int32Array
let u32arr = Uint32Array

function max_index_from_array(a) {
	if (a.max_index != null) // hint
		return a.max_index
	let max_idx = 0
	for (let idx of a)
		max_idx = max(max_idx, idx)
	return max_idx
}

function arr_type_from_max_index(max_idx) {
	return max_idx > 65535 && u32arr || max_idx > 255 && u16arr || u8arr
}

// for inferring the data type of gl.ELEMENT_ARRAY_BUFFER VBOs.
function index_arr_type(arg) {
	if (isnum(arg)) // max_idx
		return arr_type_from_max_index(arg)
	if (isarray(arg)) // [...]
		return arr_type_from_max_index(max_index_from_array(arg))
	if (arg.BYTES_PER_ELEMENT) // arr | arr_type
		return arg.constructor.prototype == Object.getPrototypeOf(arg) ? arg.constructor : arg
	return assert(arg, 'arr_type required')
}

class dyn_arr_class {

	// NOTE: `nc` is "number of components" useful for storing compound values
	// without having to compute offsets and lengths manually.

	constructor(arr_type, data_or_cap, nc) {
		this.arr_type = arr_type
		this.nc = nc || 1
		this.inv_nc = 1 / this.nc
		this.array = null
		this.invalid = false
		this.invalid_offset1 = null
		this.invalid_offset2 = null

		if (data_or_cap != null) {
			if (isnum(data_or_cap)) {
				let cap = data_or_cap
				this.grow(cap, false, false)
			} else if (data_or_cap) {
				let data = data_or_cap
				let data_len = data.length * this.inv_nc
				assert(data_len == floor(data_len), 'source array length not multiple of ', this.nc)
				this.array = data
				this.array.len = data_len
			}
		}

	}

	grow(cap, preserve_contents, pow2) {
		cap = max(0, cap)
		if (this.capacity < cap) {
			if (pow2 !== false)
				cap = nextpow2(cap)
			let array = new this.arr_type(cap * this.nc)
			array.nc = this.nc
			array.len = this.length
			if (preserve_contents !== false && this.array)
				array.set(this.array)
			this.array = array
		}
		return this
	}

	grow_type(arg, preserve_contents) {
		let arr_type1 = index_arr_type(arg)
		if (arr_type1.BYTES_PER_ELEMENT <= this.arr_type.BYTES_PER_ELEMENT)
			return
		if (this.array) {
			let this_len = this.length
			let array1 = new arr_type1(this.capacity)
			if (preserve_contents !== false)
				for (let i = 0, n = this_len * this.nc; i < n; i++)
					array1[i] = this.array[i]
			array1.nc = this.nc
			array1.length = this_len
			this.array = array1
		}
		this.arr_type = arr_type1
		return this
	}

	set(offset, data, len, data_offset) {

		// check/clamp/slice source.
		data_offset = data_offset || 0
		let data_len
		if (data.nc != null) {
			assert(data.nc == this.nc, 'source array nc is ', data.nc, ' expected ', this.nc)
			data_len = data.length ?? data.length
		} else {
			data_len = data.length * this.inv_nc
			assert(data_len == floor(data_len), 'source array length not multiple of ', this.nc)
		}
		assert(data_offset >= 0 && data_offset <= data_len, 'source offset out of range')
		len = clamp(len ?? 1/0, 0, data_len - data_offset)
		if (data_offset != 0 || len != data_len) // gotta make garbage here...
			data = data.subarray(data_offset * this.nc, (data_offset + len) * this.nc)

		assert(offset >= 0, 'offset out of range')

		this.setlen(max(this.length, offset + len))
		this.array.set(data, offset * this.nc)
		this.invalidate(offset, len)

		return this
	}

	remove(offset, len) {
		assert(offset >= 0, 'offset out of range')
		len = max(0, min(len ?? 1, this.length - offset))
		if (len == 0)
			return
		for (let a = this.array, o1 = offset, o2 = offset + len, i = 0; i < len; i++)
			a[o1+i] = a[o2+i]
		this._len -= len
		this.invalidate(offset)
		return this
	}

	setlen(len) {
		len = max(0, len)
		let arr = this.grow(len).array
		if (arr)
			arr.len = len
		if (this.invalid) {
			this.invalid_offset1 = min(this.invalid_offset1, len)
			this.invalid_offset2 = min(this.invalid_offset2, len)
		}
		return this
	}

	invalidate(offset, len) {
		let o1 = max(0, offset || 0)
		len = max(0, len ?? 1/0)
		let o2 = min(o1 + len, this.length)
		o1 = min(this.invalid_offset1 ??  1/0, o1)
		o2 = max(this.invalid_offset2 ?? -1/0, o2)
		this.invalid = true
		this.invalid_offset1 = o1
		this.invalid_offset2 = o2
		return this
	}

	validate() {
		this.invalid = false
		this.invalid_offset1 = null
		this.invalid_offset2 = null
	}

}

property(dyn_arr_class, 'capacity',
	function() { return this.array ? this.array.length * this.inv_nc : 0 },
)

property(dyn_arr_class, 'length',
	function() { return this.array ? this.array.len : 0 },
	function(len) { this.setlen(len) }
)

function dyn_arr(arr_type, data_or_cap, nc) {
	return new dyn_arr_class(arr_type, data_or_cap, nc)
}
dyn_arr.index_arr_type = index_arr_type

function dyn_arr_func(arr_type) {
	return function(data_or_cap, nc) {
		return new dyn_arr_class(arr_type, data_or_cap, nc)
	}
}
let dyn_f32arr = dyn_arr_func(f32arr)
let dyn_i8arr  = dyn_arr_func(i8arr)
let dyn_u8arr  = dyn_arr_func(u8arr)
let dyn_i16arr = dyn_arr_func(i16arr)
let dyn_u16arr = dyn_arr_func(u16arr)
let dyn_i32arr = dyn_arr_func(i32arr)
let dyn_u32arr = dyn_arr_func(u32arr)

// data structures -----------------------------------------------------------

function freelist(create) {
	let fl = []
	fl.alloc = function() {
		return this.pop() || create()
	}
	fl.free = function(e) {
		this.push(e)
	}
	return fl
}

// hashing -------------------------------------------------------------------

function hash32(s) {
	let hash = 0
	for (let i = 0, n = s.length; i < n; i++) {
		hash = ((hash << 5) - hash) + s.charCodeAt(i)
		hash |= 0 // convert to 32bit integer
	}
	return hash
}

// timestamps ----------------------------------------------------------------

let _d = new Date() // public temporary date object.

// NOTE: months start at 1, and seconds can be fractionary.
function time(y, m, d, H, M, s, local) {
	assert(!local, 'NYI')
	if (isnum(y)) {
		_d.setTime(0) // necessary to reset the time first!
		_d.setUTCFullYear(y)
		_d.setUTCMonth((m ?? 1) - 1)
		_d.setUTCDate(d ?? 1)
		_d.setUTCHours(H ?? 0)
		_d.setUTCMinutes(M ?? 0)
		s = s || 0
		_d.setUTCSeconds(s)
		_d.setUTCMilliseconds((s - floor(s)) * 1000)
		return _d.valueOf() / 1000
	} else if (isstr(y)) {
		return Date.parse(y) / 1000
	} else if (y == null) {
		return Date.now() / 1000
	} else {
		assert(false)
	}
}

// get the time at the start of the day of a given time, plus/minus a number of days.
function day(t, offset, local) {
	if (t == null) return null
	_d.setTime(t * 1000)
	if (local) {
		_d.setMilliseconds(0)
		_d.setSeconds(0)
		_d.setMinutes(0)
		_d.setHours(0)
		_d.setDate(_d.getDate() + (offset || 0))
	} else {
		_d.setUTCMilliseconds(0)
		_d.setUTCSeconds(0)
		_d.setUTCMinutes(0)
		_d.setUTCHours(0)
		_d.setUTCDate(_d.getUTCDate() + (offset || 0))
	}
	return _d.valueOf() / 1000
}

// get the time at the start of the month of a given time, plus/minus a number of months.
function month(t, offset, local) {
	assert(!local, 'NYI')
	if (t == null) return null
	_d.setTime(t * 1000)
	_d.setUTCMilliseconds(0)
	_d.setUTCSeconds(0)
	_d.setUTCMinutes(0)
	_d.setUTCHours(0)
	_d.setUTCDate(1)
	_d.setUTCMonth(_d.getUTCMonth() + (offset || 0))
	return _d.valueOf() / 1000
}

// get the time at the start of the year of a given time, plus/minus a number of years.
function year(t, offset, local) {
	assert(!local, 'NYI')
	if (t == null) return null
	_d.setTime(t * 1000)
	_d.setUTCMilliseconds(0)
	_d.setUTCSeconds(0)
	_d.setUTCMinutes(0)
	_d.setUTCHours(0)
	_d.setUTCDate(1)
	_d.setUTCMonth(0)
	_d.setUTCFullYear(_d.getUTCFullYear() + (offset || 0))
	return _d.valueOf() / 1000
}

// get the time at the start of the week of a given time, plus/minus a number of weeks.
function week(t, offset, country, local) {
	assert(!local, 'NYI')
	if (t == null) return null
	_d.setTime(t * 1000)
	_d.setUTCMilliseconds(0)
	_d.setUTCSeconds(0)
	_d.setUTCMinutes(0)
	_d.setUTCHours(0)
	let days = -_d.getUTCDay() + week_start_offset(country)
	if (days > 0) days -= 7
	_d.setUTCDate(_d.getUTCDate() + days + (offset || 0) * 7)
	return _d.valueOf() / 1000
}

function days(dt) {
	if (dt == null) return null
	return dt / (3600 * 24)
}

function year_of      (t, local) { if (t == null) return null; _d.setTime(t * 1000); return local ? _d.getFullYear() : _d.getUTCFullYear() }
function month_of     (t, local) { if (t == null) return null; _d.setTime(t * 1000); return local ? _d.getMonth()+1  : _d.getUTCMonth()+1  }
function week_day_of  (t, local) { if (t == null) return null; _d.setTime(t * 1000); return local ? _d.getDay     () : _d.getUTCDay     () }
function month_day_of (t, local) { if (t == null) return null; _d.setTime(t * 1000); return local ? _d.getDate    () : _d.getUTCDate    () }
function hours_of     (t, local) { if (t == null) return null; _d.setTime(t * 1000); return local ? _d.getHours   () : _d.getUTCHours   () }
function minutes_of   (t, local) { if (t == null) return null; _d.setTime(t * 1000); return local ? _d.getMinutes () : _d.getUTCMinutes () }
function seconds_of   (t, local) { if (t == null) return null; _d.setTime(t * 1000); return local ? _d.getSeconds () : _d.getUTCSeconds () }

function set_year(t, x) {
	if (t == null) return null
	_d.setTime(t * 1000)
	_d.setUTCFullYear(x)
	return _d.valueOf() / 1000
}

function set_month(t, x) {
	if (t == null) return null
	_d.setTime(t * 1000)
	_d.setUTCMonth(x - 1)
	return _d.valueOf() / 1000
}

function set_month_day(t, x) {
	if (t == null) return null
	_d.setTime(t * 1000)
	_d.setUTCDate(x)
	return _d.valueOf() / 1000
}

function set_hours(t, x) {
	if (t == null) return null
	_d.setTime(t * 1000)
	_d.setUTCHours(x)
	return _d.valueOf() / 1000
}

function set_minutes(t, x) {
	if (t == null) return null
	_d.setTime(t * 1000)
	_d.setUTCMinutes(x)
	return _d.valueOf() / 1000
}

function set_seconds(t, x) {
	if (t == null) return null
	_d.setTime(t * 1000)
	_d.setUTCSeconds(x)
	return _d.valueOf() / 1000
}

let weekday_names = memoize(function(locale1) {
	let wd = {short: obj(), long: obj()}
	for (let i = 0; i < 7; i++) {
		_d.setTime(1000 * 3600 * 24 * (3 + i))
		for (let how of ['short', 'long'])
			wd[how][i] = _d.toLocaleDateString(locale1 || locale(), {weekday: how, timeZone: 'UTC'})
	}
	return wd
})
function weekday_name(t, how, locale1) {
	if (t == null) return null
	_d.setTime(t * 1000)
	let wd = _d.getDay()
	return weekday_names(locale1 || locale())[how || 'short'][wd]
}

function month_name(t, how, locale1) {
	if (t == null) return null
	_d.setTime(t * 1000)
	return _d.toLocaleDateString(locale1 || locale(), {month: how || 'short'})
}

function month_year(t, how, locale1) {
	if (t == null) return null
	_d.setTime(t * 1000)
	return _d.toLocaleDateString(locale1 || locale(), {month: how || 'short', year: 'numeric'})
}

let wso = { // fri:1, sat:2, sun:3
	MV:1,
	AE:2,AF:2,BH:2,DJ:2,DZ:2,EG:2,IQ:2,IR:2,JO:2,KW:2,LY:2,OM:2,QA:2,SD:2,SY:2,
	AG:3,AS:3,AU:3,BD:3,BR:3,BS:3,BT:3,BW:3,BZ:3,CA:3,CN:3,CO:3,DM:3,DO:3,ET:3,
	GT:3,GU:3,HK:3,HN:3,ID:3,IL:3,IN:3,JM:3,JP:3,KE:3,KH:3,KR:3,LA:3,MH:3,MM:3,
	MO:3,MT:3,MX:3,MZ:3,NI:3,NP:3,PA:3,PE:3,PH:3,PK:3,PR:3,PT:3,PY:3,SA:3,SG:3,
	SV:3,TH:3,TT:3,TW:3,UM:3,US:3,VE:3,VI:3,WS:3,YE:3,ZA:3,ZW:3,
}
function week_start_offset(country1) {
	return (wso[country1 || country()] || 4) - 3
}

// NOTE: the parsers accept negative numbers in time positions to allow
// decrementing past zero, eg. `01:-1` => `00:59`. We don't allow that in
// dates because the date separator can be '-'.

let time_re = /(\-?\d+)\s*:\s*(\-?\d+)\s*(?::\s*(\-?\d+))?\s*(?:[\:\.]\s*(\-?)(\d+))?/;
let date_re = /(\d+)\s*[\-\/\.,\s]\s*(\d+)\s*[\-\/\.,\s]\s*(\d+)/;
let timeonly_re = new RegExp('^\\s*' + time_re.source + '\\s*$')
let datetime_re = new RegExp('^\\s*' + date_re.source + '(?:\\s+' + time_re.source + '\\s*)?$')

// NOTE: validate=false accepts any timestamp including negative values but still
// mods the input to the [0..24h) interval.
// NOTE: specifying less precision ignores precision parts, doesn't validate them.
// NOTE: returns undefined for failure like num().
function parse_timeofday(s, validate, precision) {
	let t = s
	if (isstr(s)) {
		let tm = timeonly_re.exec(s)
		if (!tm)
			return
		precision = precision || 'ms' // defaults to highest
		let with_s  = precision == 's' || precision == 'ms'
		let with_ms = precision == 'ms'
		let H = num(tm[1])
		let M = num(tm[2])
		let S = with_s && num(tm[3]) || 0
		let fs = with_ms && tm[5] || ''
		let f = with_ms && (tm[4] ? -1 : 1) * (num(fs) ?? 0) / 10**fs.length || 0
		t = H * 3600 + M * 60 + S + f
		if (validate)
			if (hours_of(t) != H || minutes_of(t) != M || (with_s && seconds_of(t) != S))
				return
	}
	if (validate) {
		if (t < 0 || t >= 3600 * 24)
			return
	} else {
		t = mod(t, 3600 * 24)
	}
	return t
}

let date_parts = memoize(function(locale) {
	if (locale == 'SQL') { // yyyy-mm-dd
		let m = {type: 'literal', value: '-'}
		return [{type: 'year'}, m, {type: 'month', value: 'xx'}, m, {type: 'day', value: 'xx'}]
	}
	let dtf = new Intl.DateTimeFormat(locale)
	return dtf.formatToParts(0)
})

// NOTE: returns undefined for failure like num().
let date_parser = memoize(function(locale) {
	let yi, mi, di
	let i = 1
	for (let p of date_parts(locale)) {
		if (p.type == 'day'  ) di = i++
		if (p.type == 'month') mi = i++
		if (p.type == 'year' ) yi = i++
	}
	if (i != 4) { // failed? default to `m d y`
		mi = 1; di = 2; yi = 3
	}
	return function(s, validate, precision) {
		let dm = datetime_re.exec(s)
		if (!dm)
			return
		precision = precision || 'ms' // defaults to highest
		let with_time = precision != 'd'
		let with_s    = precision == 's' || precision == 'ms'
		let with_ms   = precision == 'ms'
		let y = num(dm[yi])
		let m = num(dm[mi])
		let d = num(dm[di])
		let H = with_time && num(dm[3+1]) || 0
		let M = with_time && num(dm[3+2]) || 0
		let S = with_s && num(dm[3+3]) || 0
		let fs = with_ms && dm[3+5] || ''
		let f = with_ms && (dm[3+4] ? -1 : 1) * (num(fs) ?? 0) / 10**fs.length || 0
		let t = time(y, m, d, H, M, S) + f
		if (validate)
			if (
				year_of(t) != y
				|| month_of(t) != m
				|| month_day_of(t) != d
				|| (with_time && hours_of(t) != H)
				|| (with_time && minutes_of(t) != M)
				|| (with_s && seconds_of(t) != S)
			) return
		return t
	}
})
function parse_date(s, locale1, validate, precision) {
	return isstr(s) ? date_parser(locale1 || locale())(s, validate, precision) : s
}

let a1 = [0, ':', 0, ':', 0]
let a2 = [0, ':', 0]
let seconds_format = new Intl.NumberFormat('nu', {
	minimumIntegerDigits: 2,
	maximumFractionDigits: 6, // mySQL-compatible
})
function format_timeofday(t, precision) {
	let with_s  = precision == 's' || precision == 'ms'
	let with_ms = precision == 'ms'
	let H = floor(t / 3600)
	let M = floor(t / 60) % 60
	let Sf = t % 60
	let S = floor(Sf)
	if (with_s) {
		if (H < 10) H = '0'+H
		if (M < 10) M = '0'+M
		if (S < 10) S = '0'+S
		a1[0] = H
		a1[2] = M
		a1[4] = (with_ms && Sf != S) ? seconds_format.format(Sf) : S
		return a1.join('')
	} else {
		if (H < 10) H = '0'+H
		if (M < 10) M = '0'+M
		a2[0] = H
		a2[2] = M
		return a2.join('')
	}
}

let date_formatter = memoize(function(locale) {
	let a = []
	let yi, mi, di, Hi, Mi, Si
	let dd, md
	let i = 0
	for (let p of date_parts(locale)) {
		if (p.type == 'day'    ) { dd = p.value.length; di = i++; }
		if (p.type == 'month'  ) { md = p.value.length; mi = i++; }
		if (p.type == 'year'   ) yi = i++
		if (p.type == 'literal') a[i++] = p.value
	}
	let a1 = a.slice()
	a1[i++] = ' '
	Hi = i++; a1[i++] = ':'
	Mi = i++; a1[i++] = ':'
	Si = i++;
	let a2 = a1.slice(0, -2) // without seconds
	return function(t, precision) {
		let with_time = precision != 'd'
		let with_s    = precision == 's' || precision == 'ms'
		let with_ms   = precision == 'ms'
		// if this is slow, see
		//   http://git.musl-libc.org/cgit/musl/tree/src/time/__secs_to_tm.c?h=v0.9.15
		_d.setTime(t * 1000)
		let y = _d.getUTCFullYear()
		let m = _d.getUTCMonth() + 1
		let d = _d.getUTCDate()
		let H = _d.getUTCHours()
		let M = _d.getUTCMinutes()
		let S = _d.getUTCSeconds()
		let Sf = S + t - floor(t)
		if (m < 10 && md > 1) m = '0'+m
		if (d < 10 && dd > 1) d = '0'+d
		if (with_s) {
			if (H < 10) H = '0'+H
			if (M < 10) M = '0'+M
			if (S < 10) S = '0'+S
			a1[yi] = y
			a1[mi] = m
			a1[di] = d
			a1[Hi] = H
			a1[Mi] = M
			a1[Si] = (with_ms && Sf != S) ? seconds_format.format(Sf) : S
			return a1.join('')
		} else if (with_time) {
			if (H < 10) H = '0'+H
			if (M < 10) M = '0'+M
			a2[yi] = y
			a2[mi] = m
			a2[di] = d
			a2[Hi] = H
			a2[Mi] = M
			return a2.join('')
		} else {
			a[yi] = y
         a[mi] = m
         a[di] = d
			return a.join('')
		}
	}
})
function format_date(t, locale1, precision) {
	return date_formatter(locale1 || locale())(t, precision)
}

let _date_placeholder_text = memoize(function(locale) {
	let a = []
	for (let p of date_parts(locale)) {
		if (p.type == 'day'  ) a.push('d')
		if (p.type == 'month') a.push('m')
		if (p.type == 'year' ) a.push('yyyy')
		if (p.type == 'literal') a.push(p.value)
	}
	return a.join('')
})
function date_placeholder_text(locale1) {
	return _date_placeholder_text(locale1 || locale())
}

// duration parsing & formatting ---------------------------------------------

// parse `N d[ays] N h[ours] N m[in] N s[ec]` in any order, spaces optional.
// NOTE: returns undefined for failure like num().
// TODO: years and months!
// TODO: multi-language.
let d_re = /(\d+)\s*([^\d\s])[^\d\s]*/g
function parse_duration(s) {
	if (!isstr(s))
		return s
	s = s.trim()
	let m
	let d = 0
	d_re.lastIndex = 0 // reset regex state.
	while ((m = d_re.exec(s)) != null) {
		let x = num(m[1])
		let t = m[2].toLowerCase()
		if (t == 'd')
			d += x * 3600 * 24
		else if (t == 'h')
			d += x * 3600
		else if (t == 'm')
			d += x * 60
		else if (t == 's')
			d += x
		else
			return
	}
	return d
}

let format_duration
{
let a = []
format_duration = function(ss, format) {  // approx[+s] | long | null
	let s = abs(ss)
	if (format == 'approx') {
		if (s > 2 * 365 * 24 * 3600)
			return S('n_years', '{0} years', dec(ss / (365 * 24 * 3600)))
		else if (s > 2 * 30.5 * 24 * 3600)
			return S('n_months', '{0} months', dec(ss / (30.5 * 24 * 3600)))
		else if (s > 1.5 * 24 * 3600)
			return S('n_days', '{0} days', dec(ss / (24 * 3600)))
		else if (s > 2 * 3600)
			return S('n_hours', '{0} hours', dec(ss / 3600))
		else if (s > 2 * 60)
			return S('n_minutes', '{0} minutes', dec(ss / 60))
		else if (s >= 60)
			return S('one_minute', '1 minute')
		else if (format == 'approx+s')
			return S('n_seconds', '{0} seconds', dec(ss))
		else
			return S('seconds', 'seconds')
	} else {
		let d = floor(s / (24 * 3600))
		s -= d * 24 * 3600
		let h = floor(s / 3600)
		s -= h * 3600
		let m = floor(s / 60)
		s -= m * 60
		s = floor(s)
		a.length = 0
		if (format == 'long') {
			if (d) { a.push(d); a.push(abs(d) > 1 ? S('days'   , 'days'   ) : S('day'   , 'day'   )); }
			if (h) { a.push(h); a.push(abs(d) > 1 ? S('hours'  , 'hours'  ) : S('hour'  , 'hour'  )); }
			if (m) { a.push(m); a.push(abs(d) > 1 ? S('minutes', 'minutes') : S('minute', 'minute')); }
			if (s || !a.length) { a.push(s); a.push(S('seconds', 'seconds')); }
			return (ss < 0 ? '-' : '') + a.join(' ')
		} else {
			if (d               ) { a.push(d                               + S('days_short'   , 'd')); }
			if (d || h          ) { a.push(format_base(h, 10, d           ? 2 : 0) + S('hours_short'  , 'h')); }
			if (d || h || m     ) { a.push(format_base(m, 10, d || h      ? 2 : 0) + S('minutes_short', 'm')); }
			if (1               ) { a.push(format_base(s, 10, d || h || m ? 2 : 0) + S('seconds_short', 's')); }
			return (ss < 0 ? '-' : '') + a.join(' ')
		}
	}
}
}

function format_timeago(t) {
	let d = time() - t
	return subst(d > -1 ? S('time_ago', '{0} ago') : S('in_time', 'in {0}'), format_duration(abs(d), 'approx'))
}

// file size formatting ------------------------------------------------------

let format_kbytes
{
let suffixes = ['B', 'K', 'M', 'G', 'T', 'P', 'E']
let magnitudes = {K: 1, M: 2, G: 3, T: 4, P: 5, E: 6}
format_kbytes = function(x, d, mag) {
	let i = mag ? magnitudes[mag] : clamp(floor(logbase(x, 1024)), 0, suffixes.length-1)
	let z = x / 1024**i
	return dec(z, d) + suffixes[i]
}
}

let format_kcount
{
let suffixes = ['', 'K', 'M', 'G', 'T', 'P', 'E']
let magnitudes = {K: 1, M: 2, G: 3, T: 4, P: 5, E: 6}
format_kcount = function(d, mag, mul) {
	let i = mag ? magnitudes[mag] : clamp(floor(logbase(this, 1000)), 0, suffixes.length-1)
	let z = this / 1000**i
	return dec(z, d) + suffixes[i]
}
}

// colors --------------------------------------------------------------------

function h2rgb(m1, m2, h) {
	if (h < 0) h = h+1
	if (h > 1) h = h-1
	if (h*6 < 1)
		return m1+(m2-m1)*h*6
	else if (h*2 < 1)
		return m2
	else if (h*3 < 2)
		return m1+(m2-m1)*(2/3-h)*6
	else
		return m1
}

// hsla is in (0..360, 0..1, 0..1, 0..1)
function hsl_to_rgb_out(out, i, h, s, L, a) {
	h = h / 360
	let m2 = L <= .5 ? L*(s+1) : L+s-L*s
	let m1 = L*2-m2
	out[i+0] = 255 * h2rgb(m1, m2, h+1/3)
	out[i+1] = 255 * h2rgb(m1, m2, h)
	out[i+2] = 255 * h2rgb(m1, m2, h-1/3)
	out[i+3] = a ?? 255
}

// output: #rrggbb[aa]
let hsl_to_rgb_hex
{
let hex = x => format_base(round(x), 16, 2)
let out = []
hsl_to_rgb_hex = function(h, s, L, a) {
	hsl_to_rgb_out(out, 0, h, s, L)
	return '#' +
		hex(out[0]) +
		hex(out[1]) +
		hex(out[2]) +
		(a ? hex(a) : '')
}
}

// geometry ------------------------------------------------------------------

// point at a specified angle on a circle.
function point_around(cx, cy, r, angle) {
	return [
		cx + cos(rad * angle) * r,
		cy + sin(rad * angle) * r
	]
}

function clip_rect(x1, y1, w1, h1, x2, y2, w2, h2, out) {
	// intersect on one dimension
	// intersect_segs(ax1, ax2, bx1, bx2) => [max(ax1, bx1), min(ax2, bx2)]
	// intersect_segs(x1, x1+w1, x2, x2+w2)
	// intersect_segs(y1, y1+h1, y2, y2+h2)
	let _x1 = max(x1   , x2)
	let _x2 = min(x1+w1, x2+w2)
	let _y1 = max(y1   , y2)
	let _y2 = min(y1+h1, y2+h2)
	// clamp size
	let _w = max(_x2-_x1, 0)
	let _h = max(_y2-_y1, 0)
	if (out) {
		out[0] = _x1
		out[1] = _y1
		out[2] = _w
		out[3] = _h
		return out
	} else {
		return [_x1, _y1, _w, _h]
	}
}

function segs_overlap(ax1, ax2, bx1, bx2) { // check if two 1D segments overlap
	return !(ax2 < bx1 || bx2 < ax1)
}
function rect_intersects(x1, y1, w1, h1, x2, y2, w2, h2) {
	return (
		segs_overlap(x1, x1+w1, x2, x2+w2) &&
		segs_overlap(y1, y1+h1, y2, y2+h2)
	)
}

// timers --------------------------------------------------------------------

function runafter(t, f) { return setTimeout(f, t * 1000) }
function runevery(t, f) { return setInterval(f, t * 1000) }
function runagainevery(t, f) { f(); return runevery(t, f) }
function clock() { return performance.now() / 1000 }

function timer(f) {
	let timer_id, t0
	function wrapper() {
		timer_id = null
		f()
	}
	return function(t) {
		if (timer_id != null) {
			clearTimeout(timer_id)
			timer_id = null
		}
		if (t != null && t !== false) {
			t = repl(t, true, t0); t0 = t
			timer_id = runafter(t, wrapper)
		}
	}
}

// serialization -------------------------------------------------------------

let json_arg = s => isstr(s) ? JSON.parse(s) : s
let json = JSON.stringify

function try_json_arg(s) {
	if (!isstr(s))
		return s
	try {
		return JSON.parse(s)
	} catch {
		// let it return undefined
	}
}

// clipboard -----------------------------------------------------------------

function copy_to_clipboard(text, done) {
	return navigator.clipboard.writeText(text).then(done)
}

// local storage -------------------------------------------------------------

function save(key, s) {
	if (s == null) {
		debug('REMOVE', key)
		localStorage.removeItem(key)
	} else {
		if (!starts(key, '__')) debug('SET', key, s)
		localStorage.setItem(key, s)
	}
}

function load(key) {
	return localStorage.getItem(key)
}

// URL parsing & formatting --------------------------------------------------

function url_parse(s) {

	if (!isstr(s))
		return s

	let path, query, fragment

	{
		let i = s.indexOf('#')
		if (i > -1) {
			fragment = path.substring(i + 1)
			path = s.substring(0, i)
		} else
			path = s
	}

	{
		let i = path.indexOf('?')
		if (i > -1) {
			query = path.substring(i + 1)
			path = path.substring(0, i)
		}
	}

	let a = path.split('/')
	for (let i = 0; i < a.length; i++)
		a[i] = decodeURIComponent(a[i])

	let t = obj()
	if (query !== undefined) {
		let args = query.split('&')
		for (let i = 0; i < args.length; i++) {
			let kv = args[i].split('=')
			let k = decodeURIComponent(kv[0])
			let v = kv.length == 1 ? true : decodeURIComponent(kv[1])
			if (t[k] !== undefined) {
				if (isarray(t[k]))
					t[k] = [t[k]]
				t[k].push(v)
			} else {
				t[k] = v
			}
		}
	}

	return {path: path, segments: a, query: query, args: t, fragment: fragment}
}

// TODO: this only works on urls without scheme and host !
function url_format(t) {

	if (!isobject(t))
		return t

	let path, args, fragment

	let segments = isarray(t) ? t : t.segments
	if (segments) {
		let a = []
		for (let i = 0; i < segments.length; i++)
			a[i] = encodeURIComponent(segments[i])
		path = a.join('/')
	} else
		path = t.path

	if (t.args) {
		let a = []
		let pkeys = keys(t.args).sort()
		for (let i = 0; i < pkeys.length; i++) {
			let pk = pkeys[i]
			let k = encodeURIComponent(pk)
			let v = t.args[pk]
			if (isarray(v)) {
				for (let j = 0; j < v.length; j++) {
					let z = v[j]
					let kv = k + (z !== true ? '=' + encodeURIComponent(z) : '')
					a.push(kv)
				}
			} else if (v != null) {
				let kv = k + (v !== true ? '=' + encodeURIComponent(v) : '')
				a.push(kv)
			}
		}
		args = a.join('&')
	} else
		args = t.args

	return path + (args ? '?' + args : '') + (fragment ? '#' + fragment : '')
}

/* events --------------------------------------------------------------------

There are 4 types of events in this joint:

TYPE           FIRE                  LISTEN
------------------------------------------------------------------------------
hook           foo()                 do_{after|before}('foo', f)
^e             e.dispatchEvent(ev)   e.addEventListener(k, f)
^^announce     announce(k, ...)      listen(k, f, [on])
^^^broadcast   broadcast(k, ...)     listen(k, f, [on])

Hooks are just function composition. They are the fastest but can't be unhooked.
Use them when extending things. Native events are what we get from the browser.
Most of them bubble so you get them on parents too. Events that are usually
interesting to other things living in the same tab should be fired with
announce() (preferrable over firing native events on window/document).
Broadcast should only be used when you need to sync all browser tabs
of the same app.

*/

// native events -------------------------------------------------------------

function _event(bubbles, ev, ...args) {
	if (!isstr(ev))
		return ev
	ev = new CustomEvent(ev, {cancelable: true, bubbles: bubbles})
	ev.args = args
	return ev
}
function custom_event    (...args) { return _event(false, ...args) }
function custom_event_up (...args) { return _event(true , ...args) }

/* fast global events --------------------------------------------------------

These do the same job as window.on(event, f) / window.fire(event, ...)
except they are faster because they make less garbage (or none if JS is
smart enough to keep the varargs on the stack or sink them). Plus you can
listen for inter-window events fired with broadcast().

*/

let all_handlers = obj() // {event_name->set(f)}

function listen(event, f, on) {
	if (on != false) {
		let handlers = attr(all_handlers, event, set)
		assert(!handlers.has(f), 'duplicate event handler for ', event)
		handlers.add(f)
	} else {
		let handlers = all_handlers[event]
		assert(handlers && handlers.has(f), 'event handler not found for ', event)
		handlers.delete(f)
	}
}

function announce(event, ...args) {
	let handlers = all_handlers[event]
	if (!handlers) return
	for (let handler of handlers) {
		let ret = handler(...args)
		if (ret !== undefined)
			return ret
	}
}

// inter-window events -------------------------------------------------------

addEventListener('storage', function(e) {
	// decode the message.
	if (e.key != '__broadcast')
		return
	let v = e.newValue
	if (!v)
		return
	v = json_arg(v)
	announce(v.topic, ...v.args)
})

// broadcast a message to other windows.
function broadcast(topic, ...args) {
	announce(topic, ...args)
	save('__broadcast', '')
	save('__broadcast', json({
		topic: topic,
		args: args,
	}))
	save('__broadcast', '')
}

function setglobal(k, v, default_v) {
	let v0 = window[k] ?? default_v
	if (v === v0)
		return
	window[k] = v
	broadcast('global_changed', k, v, v0)
	broadcast(k+'_changed', v, v0)
}

listen('global_changed', function(k, v) {
	window[k] = v
})

// multi-language stubs replaced in webb_spa.js ------------------------------

// stub for getting message strings that can be translated multiple languages.
let S = g.S || function(name, en_s, ...args) {
	return subst(en_s, ...args)
}

function Sf(...args) {
	return () => S(...args)
}

// stub for getting current language.
let nav_lang = navigator.language.substring(0, 2)
let lang = g.lang || function() {
	return document.documentElement.lang || nav_lang
}

// stub for getting current country.
let nav_country = navigator.language.substring(3, 5)
let country = g.country || function() {
	return document.documentElement.attr('country') || nav_country
}

let locale = memoize(function() { return lang() + '-' + country() })

// stub for rewriting links to current language.
let href = g.href || return_arg

/* AJAX requests -------------------------------------------------------------

	ajax(opt) -> req
		opt.url
		opt.upload: object (sent as json) | s
		opt.timeout (browser default)
		opt.method ('POST' or 'GET' based on req.upload)
		opt.slow_timeout (4)
		opt.headers: {h->v}
		opt.response_mime_type // needed for loading CSS files non-async in Firefox
		opt.user
		opt.pass
		opt.async (true)
		opt.dont_send (false)
		opt.notify: widget to send 'load' events to.
		opt.notify_error: error notify function: f(message, 'error').
		opt.notify_notify: json `notify` notify function.
		opt.silent: don't notify
		opt.onchunk: f(s, finished) [-> false]

	req.send()
	req.abort()

	^slow(show|hide)
	^progress(p, loaded, [total])
	^upload_progress(p, loaded, [total])
	^success(res)
	^fail(error, 'timeout'|'network'|'abort')
	^fail(error, 'http', status, message, content)
	^done('success' | 'fail', ...)

	^^ajax_error  : error notification.
	^^ajax_notify : notification for json results containing a field called `notify`.

*/

function ajax(req) {

	req = assign_opt(new EventTarget(), {slow_timeout: 4}, req)

	let xhr

	if (req.xhr) { // mock xhr

		xhr = assign_opt({}, req.xhr)
		xhr.open = noop
		xhr.setRequestHeader = noop
		xhr.getResponseHeader = noop
		xhr.abort = noop
		xhr.upload = {}
		xhr.send = function() {
			runafter(xhr.wait || 0, function() {
				xhr.status = 200
				xhr.readyState = 4
				xhr.onreadystatechange()
			})
		}

	} else {

		xhr = new XMLHttpRequest()

	}

	let method = req.method || (req.upload ? 'POST' : 'GET')
	let async = req.async !== false // NOTE: this is deprecated but that's ok.
	let url = url_format(req.url)

	xhr.open(method, url, async, req.user, req.pass)

	let upload = req.upload
	if (isobj(upload) || isarray(upload)) {
		upload = json(upload)
		xhr.setRequestHeader('content-type', 'application/json')
	}

	if (async)
		xhr.timeout = (req.timeout || 0) * 1000

	if (req.headers)
		for (let h in req.headers)
			xhr.setRequestHeader(h, req.headers[h])

	let slow_watch

	function stop_slow_watch() {
		if (slow_watch) {
			clearTimeout(slow_watch)
			slow_watch = null
		}
		if (slow_watch === false) {
			fire('slow', false)
			slow_watch = null
		}
	}

	function slow_expired() {
		fire('slow', true)
		slow_watch = false
	}

	req.send = function() {
		fire('start')
		slow_watch = runafter(req.slow_timeout, slow_expired)
		try { // non-async requests raise errors, catch and call our callbacks.
			xhr.send(upload)
			if (!async)
				done(200)
		} catch (err) {
			// NOTE: xhr.status is always 0 on non-async requests so there's no way
			// to know the failure mode. We classify them all as 'network' errors.
			xhr.onerror()
		}
		return req
	}

	req.send_async = function() {
		return new Promise(function(resolve, reject) {
			on('done', function(...args) {
				resolve(args)
			})
			req.send()
		})
	}

	// NOTE: only Firefox fires progress events on non-200 responses.
	xhr.onprogress = function(ev) {
		if (ev.loaded > 0)
			stop_slow_watch()
		let p = ev.lengthComputable ? ev.loaded / ev.total : .5
		fire('progress', p, ev.loaded, ev.total)
	}

	xhr.upload.onprogress = function(ev) {
		if (ev.loaded > 0)
			stop_slow_watch()
		let p = ev.lengthComputable ? ev.loaded / ev.total : .5
		fire('upload_progress', p, ev.loaded, ev.total)
	}

	xhr.ontimeout = function() {
		req.failtype = 'timeout'
		fire('done', 'fail', req.error_message('timeout'), 'timeout')
	}

	// NOTE: only fired on network errors like "connection refused" and on CORS errors!
	xhr.onerror = function() {
		req.failtype = 'network'
		fire('done', 'fail', req.error_message('network'), 'network')
	}

	xhr.onabort = function() {
		req.failtype = 'abort'
		fire('done', 'fail', null, 'abort')
	}

	function done(status) {
		let res = xhr.response
		if (!xhr.responseType || xhr.responseType == 'text')
			if (xhr.getResponseHeader('content-type') == 'application/json' && res)
				res = json_arg(res)
		req.response = res
		if (status == 200) {
			if (DEBUG_AJAX) debug('$', method, url)
			fire('done', 'success', res)
		} else {
			req.failtype = 'http'
			let status_message = xhr.statusText
			if (DEBUG_AJAX) debug('!', method, url)
			fire('done', 'fail',
				req.error_message('http', status, status_message, res),
				'http', status, status_message, res)
		}
	}

	xhr.onreadystatechange = function(ev) {
		if (!async)
			return
		if (xhr.readyState > 1)
			stop_slow_watch()
		if (xhr.readyState > 2 && req.onchunk)
			if (req.onchunk(xhr.response, xhr.readyState == 4) === false)
				req.abort()
		if (xhr.readyState == 4)
			if (xhr.status)
				done(xhr.status)
	}

	req.abort = function() {
		xhr.abort()
		return req
	}

	let notify_error  = req.notify_error  || req.silent && noop || function(...args) { announce('ajax_error' , ...args) }
	let notify_notify = req.notify_notify || req.silent && noop || function(...args) { announce('ajax_notify', ...args) }

	function fire(name, arg1, ...rest) {

		if (name == 'done')
			fire(arg1, ...rest)

		if (req.dispatchEvent(custom_event(name, arg1, ...rest))) {
			if (name == 'fail' && arg1)
				notify_error(arg1, ...rest)
			if (name == 'success' && isobject(arg1) && isstr(arg1.notify))
				notify_notify(arg1.notify, arg1.notify_kind)
		}

		if (req[name])
			req[name](arg1, ...rest)

		let notify = req.notify instanceof EventTarget ? [req.notify] : req.notify
		if (isarray(notify))
			for (let target of notify)
				target.dispatchEvent(custom_event('load', name, arg1, ...rest))

	}

	req.xhr = xhr

	req.error_message = function(type, status, status_message, content) {
		if (type == 'http') {
			return S('error_http', '{error}', {
				status: status,
				status_message: status_message,
				error: (isobj(content) ? content.error : content) || status_message,
			})
		} else if (type == 'network') {
			return S('error_network', 'Network error')
		} else if (type == 'timeout') {
			return S('error_timeout', 'Timed out')
		}
	}

	if (!req.dont_send)
		req.send()

	return req
}

function get(url, success, fail, opt) {
	return ajax(assign({
		url: url,
		method: 'GET',
		success: success,
		fail: fail,
	}, opt))
}

function post(url, upload, success, fail, opt) {
	return ajax(assign({
		url: url,
		method: 'POST',
		upload: upload,
		success: success,
		fail: fail,
	}, opt))
}

// publishing ----------------------------------------------------------------

g.DEBUG                        = DEBUG
g.Firefox                      = Firefox
g.Chrome                       = Chrome
g.Safari                       = Safari
g.Safari_maj                   = Safari_maj
g.Safari_min                   = Safari_min
g.isobject                     = isobject
g.isarray                      = isarray
g.isobj                        = isobj
g.isstr                        = isstr
g.isnum                        = isnum
g.isbool                       = isbool
g.isfunc                       = isfunc
g.repl                         = repl
g.num                          = num
g.bool                         = bool
g.str                          = str
g.inf                          = inf
g.floor                        = floor
g.ceil                         = ceil
g.round                        = round
g.snap                         = snap
g.trunc                        = trunc
g.abs                          = abs
g.min                          = min
g.max                          = max
g.sqrt                         = sqrt
g.ln                           = ln
g.log10                        = log10
g.logbase                      = logbase
g.random                       = random
g.sign                         = sign
g.clamp                        = clamp
g.strict_sign                  = strict_sign
g.lerp                         = lerp
g.mod                          = mod
g.nextpow2                     = nextpow2
g.PI                           = PI
g.sin                          = sin
g.cos                          = cos
g.tan                          = tan
g.rad                          = rad
g.deg                          = deg
g.asin                         = asin
g.acos                         = acos
g.atan                         = atan
g.atan2                        = atan2
g.format_base                  = format_base
g.dec                          = dec
g.noop                         = noop
g.return_true                  = return_true
g.return_false                 = return_false
g.return_arg                   = return_arg
g.wrap                         = wrap
g.do_before                    = do_before
g.do_after                     = do_after
g.pr                           = pr
g.warn                         = warn
g.debug                        = debug
g.trace                        = trace
g.trace_if                     = trace_if
g.assert                       = assert
g.property                     = property
g.method                       = method
g.override                     = override
g.alias                        = alias
g.override_property_setter     = override_property_setter
g.override_property_getter     = override_property_getter
g.subst                        = subst
g.display_name                 = display_name
g.lower_ai_ci                  = lower_ai_ci
g.find_ai_ci                   = find_ai_ci
g.catany                       = catany
g.catall                       = catall
g.esc                          = esc
g.words                        = words
g.wordset                      = wordset
g.captures                     = captures
g.array                        = array
g.empty_array                  = empty_array
g.range                        = range
g.extend                       = extend
g.array_set                    = array_set
g.insert                       = insert
g.remove                       = remove
g.remove_value                 = remove_value
g.remove_values                = remove_values
g.array_move                   = array_move
g.array_equals                 = array_equals
g.binsearch                    = binsearch
g.uniq_sorted                  = uniq_sorted
g.remove_duplicates            = remove_duplicates
g.obj                          = obj
g.set                          = set
g.map                          = map
g.map_first_key                = map_first_key
g.map_assign                   = map_assign
g.set_addset                   = set_addset
g.set_set                      = set_set
g.set_toarray                  = set_toarray
g.set_equals                   = set_equals
g.empty                        = empty
g.empty_obj                    = empty_obj
g.empty_set                    = empty_set
g.keys                         = keys
g.assign                       = assign
g.assign_opt                   = assign_opt
g.attr                         = attr
g.memoize                      = memoize
g.count_keys                   = count_keys
g.first_key                    = first_key
g.f32arr                       = f32arr
g.i8arr                        = i8arr
g.u8arr                        = u8arr
g.i16arr                       = i16arr
g.u16arr                       = u16arr
g.i32arr                       = i32arr
g.u32arr                       = u32arr
g.max_index_from_array         = max_index_from_array
g.arr_type_from_max_index      = arr_type_from_max_index
g.index_arr_type               = index_arr_type
g.dyn_arr                      = dyn_arr
g.dyn_f32arr                   = dyn_f32arr
g.dyn_i8arr                    = dyn_i8arr
g.dyn_u8arr                    = dyn_u8arr
g.dyn_i16arr                   = dyn_i16arr
g.dyn_u16arr                   = dyn_u16arr
g.dyn_i32arr                   = dyn_i32arr
g.dyn_u32arr                   = dyn_u32arr
g.freelist                     = freelist
g.hash32                       = hash32
g._d                           = _d
g.time                         = time
g.day                          = day
g.month                        = month
g.year                         = year
g.week                         = week
g.days                         = days
g.year_of                      = year_of
g.month_of                     = month_of
g.week_day_of                  = week_day_of
g.month_day_of                 = month_day_of
g.hours_of                     = hours_of
g.minutes_of                   = minutes_of
g.seconds_of                   = seconds_of
g.set_year                     = set_year
g.set_month                    = set_month
g.set_month_day                = set_month_day
g.set_hours                    = set_hours
g.set_minutes                  = set_minutes
g.set_seconds                  = set_seconds
g.weekday_name                 = weekday_name
g.month_name                   = month_name
g.month_year                   = month_year
g.week_start_offset            = week_start_offset
g.parse_timeofday              = parse_timeofday
g.parse_date                   = parse_date
g.format_timeofday             = format_timeofday
g.format_date                  = format_date
g.date_placeholder_text        = date_placeholder_text
g.parse_duration               = parse_duration
g.format_timeago               = format_timeago
g.format_kbytes                = format_kbytes
g.format_kcount                = format_kcount
g.hsl_to_rgb_out               = hsl_to_rgb_out
g.hsl_to_rgb_hex               = hsl_to_rgb_hex
g.point_around                 = point_around
g.clip_rect                    = clip_rect
g.rect_intersects              = rect_intersects
g.runafter                     = runafter
g.runevery                     = runevery
g.runagainevery                = runagainevery
g.clock                        = clock
g.timer                        = timer
g.json_arg                     = json_arg
g.try_json_arg                 = try_json_arg
g.json                         = json
g.copy_to_clipboard            = copy_to_clipboard
g.save                         = save
g.load                         = load
g.url_parse                    = url_parse
g.url_format                   = url_format
g.custom_event                 = custom_event
g.custom_event_up              = custom_event_up
g.listen                       = listen
g.announce                     = announce
g.broadcast                    = broadcast
g.setglobal                    = setglobal
g.S                            = S
g.Sf                           = Sf
g.lang                         = lang
g.country                      = country
g.href                         = href
g.ajax                         = ajax
g.get                          = get
g.post                         = post


if (document.currentScript.hasAttribute('global')) {
	for (let k in g) {
		assert(!(k in G), k, ' global already exists')
		G[k] = g[k]
	}
}

if (document.currentScript.hasAttribute('extend')) {

function m(f) {
	return function(...args) {
		return f(this, ...args)
	}
}

// String extensions ---------------------------------------------------------

let sm = m
let s = String.prototype

s.subst            = sm(subst           )
s.display_name     = sm(display_name    )
s.lower_ai_ci      = sm(lower_ai_ci     )
s.find_ai_ci       = sm(find_ai_ci      )
s.catany           = sm(catany          )
s.esc              = sm(esc             )
s.words            = sm(words           )
s.wordset          = sm(wordset         )
s.captures         = sm(captures        )
s.parse_timeofday  = sm(parse_timeofday )
s.parse_date       = sm(parse_date      )
s.parse_duration   = sm(parse_duration  )

alias(s, 'starts', 'startsWith')
alias(s, 'ends'  , 'endsWith'  )

// Number extensions ---------------------------------------------------------

let nm = m
let n = Number.prototype

n.timeofday  = nm(format_timeofday)
n.date       = nm(format_date)
n.duration   = nm(format_duration)
n.timeago    = nm(format_timeago)
n.kbytes     = nm(format_kbytes)
n.kcount     = nm(format_kcount)
n.base       = nm(format_base)

// Array extensions ----------------------------------------------------------

let a = Array.prototype

// NOTE: making these non-enumerable methods to avoid affecting Object.keys(array).

method(a, 'extend           ', m(extend                  ))
method(a, 'set              ', m(array_set               ))
method(a, 'insert           ', m(insert                  ))
method(a, 'remove           ', m(remove                  ))
method(a, 'remove_value     ', m(remove_value            ))
method(a, 'remove_values    ', m(remove_values           ))
method(a, 'move             ', m(array_move              ))
method(a, 'equals           ', m(array_equals            ))
method(a, 'binsearch        ', m(binsearch               ))
method(a, 'uniq_sorted      ', m(uniq_sorted             ))
method(a, 'remove_duplicates', m(remove_duplicates       ))

// Map extensions ------------------------------------------------------------

property(Map, 'first_key', m(map_first_key))

let M = Map.prototype

M.assign = m(map_assign)

// Set extensions ------------------------------------------------------------

let S = Set.prototype

S.add_set = m(set_addset)
S.set     = m(set_set)
S.toarray = m(set_toarray)
S.equals  = m(set_equals)

}

}()) // module function
