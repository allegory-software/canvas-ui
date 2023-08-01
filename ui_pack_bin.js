/*
frame format:
	1. header
	2. commands
	3. strings
header:
	int16  version
	int16  frame length: ho-word
	int16  frame length: hi-word
	int16  strings offset in in16s: lo-word
	int16  strings offset in in16s: hi-word
	int16  screen_w
	int16  screen_h
	int16  mx
	int16  my
commands: multiple of (until strings offset):
	int16    cmd
	int16    argc
	int16[]  args
strings: multiple of (until len):
	int16    index
	int16    len
	int8[]   text in ut8
*/
{
let ab  = new ArrayBuffer(512*1024)
let b   = new Int16Array(ab)
let asb = new ArrayBuffer(512*1024)
let sb  = new Uint8Array(asb)
let dsb = new DataView(asb)
let j  // current index in b
let sj // current index in sb

let tenc_abuf = new ArrayBuffer(2*64*1024)
let tenc_buf  = new Uint8Array(tenc_abuf)

function copy(d, i, s, n) {
	for (let j = 0; j < n; j++)
		d[i+j] = s[j]
}

function pack_cmd(a, i) {
	let i0 = i // index at arg1
	let i1 = a[i-2] - 3 // index after last arg
	let argc = i1 - i0
	b[j++] = a[i-1] // cmd
	b[j++] = argc
	let j0 = j // index at arg1
	for (let k = 0; k < argc; k++) {
		let i = i0 + k
		let j = j0 + k
		let v = a[i]
		if (isstr(v)) {
			if (1) {
				let {read, written} = tenc.encodeInto(v, tenc_buf)
				let n = written
				assert(read == v.length, 'string too long')
				b[j] = sj
				dsb.setUint16(sj, i, true); sj += 2
				dsb.setUint16(sj, n, true); sj += 2
				copy(sb, sj, tenc_buf, n)
				sj += n
			}
		} else if (isnum(v)) {
			assert(isnum(v)     , ' on: ', i, ' ', C(a, i), '+', k-1, ' ', typeof v, ': ', v)
			assert(floor(v) == v, ' on: ', i, ' ', C(a, i), '+', k-1, ' ', v)
			b[j] = v
		} else {
			pr(typeof v, a)
		}
	}
	j += argc
	return j0
}

let pack_api = {}

function pack_record(a) {

	let i = 2
	while (i < a.length) {
		let j = pack_cmd(a, i)
		let pack_f = pack[a[i-1]]
		if (pack_f)
			pack_f(a, i, b, j)
		i = a[i-2] // next_i
	}

	if (ui.DEBUG) {
		let sn = 0
		let sl = 0
		let nn = 0
		let on = 0
		for (let s of a) {
			if (isstr(s)) { sn++; sl += s.length; continue; }
			if (isnum(s)) { nn++; continue; }
			on++
		}
		frame_graph_push('string_count' , sn)
		frame_graph_push('string_length', sl)
		frame_graph_push('number_count' , nn)
		frame_graph_push('other_count'  , on)
	}

}

async function pack_frame_binary() {

	let t0 = clock_ms()

	j = 0
	sj = 0

	// write header
	b[j++] = ui.VERSION
	j += 2 // len lo+hi
	j += 2 // strings offset lo+hi
	b[j++] = screen_w
	b[j++] = screen_h
	b[j++] = ui.mx
	b[j++] = ui.my

	pack_record(a)

	// write total length
	let len = j * 2 + sj
	b[1] = len & 0xffff
	b[2] = len >> 16

	// write strings offset
	b[3] = j & 0xffff
	b[4] = j >> 16

	// compress frame
	let ib = new Int16Array(ab , 0, j) // garbage!
	let sb = new Uint8Array(asb, 0, sj) // garbage!
	let cs = new CompressionStream('gzip')
	let writer = cs.writable.getWriter()
	writer.write(ib)
	writer.write(sb)
	writer.close()
	let cb = await new Response(cs.readable).arrayBuffer()

	let t1 = clock_ms()

	frame_graph_push('frame_bandwidth'  , (60 * cb.byteLength * 8) / (1024 * 1024)) // Mbps @ 60fps
	frame_graph_push('frame_compression', (cb.byteLength / (ib.byteLength + sb.byteLength)) * 100)
	frame_graph_push('frame_pack_time'  , t1 - t0)

	return cb
}

}




{
let b, dsb
let j, sj
let len

let unpack_api = {}

async function unpack_frame_binary() {

	a = []
	i = 0
	j = 0

	// read header
	let version  = b[j++]

	assert(version == ui.VERSION, 'wrong version ', version)

	len          = b[j++] + 0xffff * b[j++]
	sj           = b[j++] + 0xffff * b[j++]
	let screen_w = b[j++]
	let screen_h = b[j++]
	let mx       = b[j++]
	let my       = b[j++]

	dsb = new DataView(ab, 0)

	unpack_record()

}

function unpack_cmd() {

	// src: cmd, argc, arg1..n, argc, cmd...
	// dst: next_i, cmd, arg1..n, prev_i, next_i, cmd, arg1...

	let NEXT_I = i

	a[i++] = 0 // next_i
	a[i++] = b[j++] // cmd

	let arg1_i = i

	let argc = b[j++]
	for (let k = 0; k < argc; k++)
		a[i+k] = b[j+k]
	i += argc
	j += argc

	let PREV_I = i

	a[PREV_I] = arg1_i // prev_i
	a[NEXT_I] = PREV_I + 3

	return arg1_i
}

function unpack_record() {

	// unpack commands
	while (j < sj) {
		let i = unpack_cmd()
		let cmd = b[j++]
		let unpack_f = unpack[cmd]
		if (unpack_f)
			unpack_f(a, i)
	}

	// unpack strings and put them back at their original indexes.
	sj *= 2 // make it in bytes
	while (sj < len) {
		let i = dsb.getUint16(sj, true); sj += 2
		let n = dsb.getUint16(sj, true); sj += 2
		let b = new Uint8Array(ab, sj, n)
		let s = tdec.decode(b)
		a[i] = s
		sj += n
	}

}

// instead of calling unpack_frame_json() ....

let CC_CURLY_BRACE_OPEN = '{'.charCodeAt(0)

// version can't be the first char in json encoding
assert(ui.VERSION != CC_CURLY_BRACE_OPEN)


async function unpack_frame(cb) {

	b = new Int16Array(ab, 0, ab.byteLength >> 1)

	if (b[0] & 0xff == CC_CURLY_BRACE_OPEN)
		unpack_frame_json()
	else
		unpack_frame_binary()
}

}
