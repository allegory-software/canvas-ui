/*

	JavaScript "assorted lengths of wire" library.
	Written by Cosmin Apreutesei. Public domain.

TYPE CHECKING

	isobject(e)
	isarray(a)
	isobj(t)
	isstr(s)
	isnum(n)
	isbool(b)
	isfunc(f)

EXTENDING BUILT-IN OBJECTS

	method(proto, name, f)

LOGIC

	repl(x, v, z)

DEBUGGING

	assert(v, err, ...) -> v
	warn(...)
	stacktrace()
	pr(...)
	trace(...)
	trace_if(cond, ...)

*/

(function () {
"use strict"
let G = window

// type checking -------------------------------------------------------------

G.isobject = e => e != null && typeof e == 'object' // includes arrays, HTMLElements, etc.
G.isarray = Array.isArray
G.isstr = s => typeof s == 'string'
G.isnum = n => typeof n == 'number'
G.isbool = b => typeof b == 'boolean'
G.isfunc = f => typeof f == 'function'

// extending built-in prototypes ---------------------------------------------

/*
NOTE: built-in methods are actually "data properties" that shadow normal
methods so if we want to override one we need to replace the property.
These special kinds of methods are also non-enumerable, unlike normal
methods, which is useful if we want to extend Object without injecting
enumerables into it.
*/

// extend an object with a property, checking for upstream name clashes.
// NOTE: shadows both instance and prototype fields.
G.property = function(cls, prop, get, set) {
	let proto = cls.prototype || cls
	if (prop in proto)
		assert(false, '{0}.{1} already exists and it\'s set to: {2}',
			cls.debug_name || cls.constructor.name, prop, proto[prop])
	let descriptor = isobject(get) ? get : {get: get, set: set}
	Object.defineProperty(proto, prop, descriptor)
}

// extend an object with a method, checking for upstream name clashes.
// NOTE: shadows both instance and prototype methods!
G.method = function(proto, name, f) {
	Object.defineProperty(proto, name, {value: f, enumerable: false}
}

// logic ---------------------------------------------------------------------

G.repl = function(x, v, z) { return x === v ? z : x }

// errors --------------------------------------------------------------------

G.assert = function(ret, ...args) {
	if (!ret)
		throw (args.length ? args.join('') : 'assertion failed')
	return ret
}

G.warn = console.warn

G.stacktrace = () => (new Error()).stack

G.pr = console.log

G.trace = console.trace

G.trace_if = function(cond, ...args) {
	if (!cond) return
	trace(...args)
}

// math ----------------------------------------------------------------------

G.floor = Math.floor
G.ceil  = Math.ceil
G.round = Math.round
G.max   = Math.max
G.min   = Math.min
G.abs   = Math.abs

// NOTE: returns x1 if x1 < x0, which enables the idiom
// `a[clamp(i, 0, b.length-1)]` to return undefined when b is empty.
G.clamp = function(x, x0, x1) {
	return min(max(x, x0 ?? -1/0), x1 ?? 1/0)
}

G.lerp = function(x, x0, x1, y0, y1) {
	return y0 + (x-x0) * ((y1-y0) / (x1 - x0))
}

function dec(x, d) { return x.toFixed(d) }

G.num = function(s) {
	let x = parseFloat(s)
	return x != x ? undefined : x
}

G.str = String

G.obj = () => Object.create(null)
G.set = (iter) => new Set(iter)
G.map = (iter) => new Map(iter)

G.assign = Object.assign

G.noop = function() {}

G.json = JSON.stringify

G.clock = function() { return performance.now() / 1000 }

G.memoize = function(f) {
	let t = map()
	return function(x) {
		if (t.has(x))
			return t.get(x)
		let y = f(x)
		t.set(x, y)
		return y
	}
}

G.hash32 = function(s) {
	let hash = 0
	for (let i = 0, n = s.length; i < n; i++) {
		hash = ((hash << 5) - hash) + s.charCodeAt(i)
		hash |= 0 // convert to 32bit integer
	}
	return hash
}

// memory patterns -----------------------------------------------------------

G.freelist = function(cons) {
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

G.map_freelist = function() {
	return freelist(map)
}

