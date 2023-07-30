/*

	RTC wrapper

*/

(function () {
"use strict"
let G = window
let rtc = {}
G.rtc = rtc

let {
	min, max,
	set,
	debug, pr, clock, json, json_arg, noop,
	runafter, runevery,
	announce,
} = glue

rtc.DEBUG = 0
rtc.servers = null

function rtc_debug(...args) {
	if (!rtc.DEBUG) return
	debug(this.id, this.type, ':', ...args)
}

rtc.offer = function(e) {

	e.type = 'offer'
	e.debug = rtc_debug
	e.open = false
	e.ready = false
	e.max_message_size = null

	e.connect = async function() {
		if (e.open)
			return
		e.open = true

		e.con = new RTCPeerConnection(rtc.servers)

		e.chan = e.con.createDataChannel('chan', {ordered: true})
		e.chan.binaryType = 'arraybuffer'

		e.con.onicecandidate = function(ev) {
			if (!ev.candidate) return
			e.signal_con.signal(e.id, 'candidate', ev.candidate)
		}

		e.chan.onopen = function() {
			e.debug('chan open')
			e.max_message_size = e.con.sctp.maxMessageSize
			e.ready = true
			announce('rtc', e, 'ready')
		}

		e.chan.onclose = function() {
			e.debug('chan closed')
			e.chan = null
			e.close()
		}

		e.chan.onmessage = function(ev) {
			e.recv(ev.data)
		}

		let offer = await e.con.createOffer()
		await e.con.setLocalDescription(offer)

		e.signal_con.signal(e.id, 'offer', offer)

		announce('rtc', e, 'open')
	}

	e.close = function() {
		if (!e.open)
			return
		e.open = false
		e.ready = false
		e.max_message_size = null

		if (e.chan) {
			e.chan.close()
			e.chan = null
		}
		if (e.con) {
			e.con.close()
			e.con = null
		}

		e.signal_con.signal(e.id, 'close')
		announce('rtc', e, 'close')
	}

	e.signal_con.on_signal = function(k, v) {
		if (!e.open)
			return
		if (k == 'candidate') {
			e.debug('<- candidate', v)
			e.con.addIceCandidate(v)
		} else if (k == 'answer') {
			e.debug('<- answer', v)
			e.con.setRemoteDescription(v)
		}
	}

	e.send = function(s) {
		if (!e.ready)
			return
		let wait_bytes = e.chan.bufferedAmount
		if (wait_bytes > 64 * 1024)
			return
		e.chan.send(s)
	}

	return e
}

rtc.answer = function(e) {

	e.type = 'answer'
	e.debug = rtc_debug
	e.open = false
	e.ready = false

	e.connect = function() {
		if (e.open)
			return
		e.open = true

		e.con = new RTCPeerConnection(rtc.servers)

		e.con.ondatachannel = function(ev) {

			e.debug('remote chan open')

			e.chan = ev.channel
			e.chan.binaryType = 'arraybuffer'

			e.chan.onclose = function() {
				e.debug('remote chan closed')
				e.chan = null
				e.close()
			}

			e.chan.onmessage = function(ev) {
				e.recv(ev.data)
			}

			e.ready = true
			announce('rtc', e, 'ready')
		}

		e.signal_con.signal(e.id, 'ready')

		announce('rtc', e, 'open')
	}

	e.close = function() {
		if (!e.open)
			return
		e.open = false
		e.ready = false

		if (e.chan) {
			e.chan.close()
			e.chan = null
		}
		if (e.con) {
			e.con.close()
			e.con = null
		}

		e.signal_con.signal(e.id, 'close')
		announce('rtc', e, 'close')
	}

	e.signal_con.on_signal = function(k, v) {
		if (!e.open)
			return
		if (k == 'candidate') {
			e.debug('<- candidate', v)
			e.con.addIceCandidate(v)
		} else if (k == 'offer') {
			e.debug('<- offer', v)
			e.con.setRemoteDescription(v)
			runafter(0, async function() {
				let answer = await e.con.createAnswer()
				await e.con.setLocalDescription(answer)
				e.signal_con.signal(e.id, 'answer', answer)
			})
		}
	}

	return e
}

function create_signal_server() {

	let e = {}

	e.offers    = {} // {id->offer}
	e.ready_con = {} // {id->con}
	e.offer_con = {} // {id->con}

	let {offers, ready_con, offer_con} = e

	e.connect = function(c) {

		c = c ?? {}

		c.on_signal = null
		c.candidates = set()

		c.signal_candidates = function(id) {
			let c2 = c == offer_con[id] ? ready_con[id] : offer_con[id]
			if (!c2)
				return
			for (let candidate of c.candidates) {
				c2.on_signal('candidate', candidate)
				c.candidates.delete(candidate)
			}
		}

		c.signal = function(id, k, v) {
			if (k == 'offer') {
				let offer = v
				offers[id] = offer
				offer_con[id] = c
				let rc = ready_con[id]
				let oc = offer_con[id]
				if (rc) {
					rc.on_signal('offer', offer)
					oc.signal_candidates(id)
				}
			} else if (k == 'ready') {
				ready_con[id] = c
				let offer = offers[id]
				let oc = offer_con[id]
				if (offer) {
					c.on_signal('offer', offer)
					oc.signal_candidates(id)
				}
			} else if (k == 'answer') {
				let answer = v
				let oc = offer_con[id]
				let rc = ready_con[id]
				if (oc) {
					oc.on_signal('answer', answer)
					rc.signal_candidates(id)
				}
			} else if (k == 'candidate') {
				let candidate = v
				c.candidates.add(candidate)
				c.signal_candidates(id)
			} else if (k == 'close') {
				delete offers[id]
				delete ready_con[id]
				delete offer_con[id]
			}
		}

		return c

	}

	return e

}

rtc.signal_server = create_signal_server()

if (0) {

	runafter(0, async function() {

		let signal_con = rtc.signal_server.connect()
		let con = await rtc.offer({signal_con: signal_con, id: 'demo'})

		runevery(1, function() {
			con.send('Hello!')
		})

	})

	runafter(0, async function() {

		let signal_con = rtc.signal_server.connect()
		let con = await rtc.answer({signal_con: signal_con, id: 'demo', recv: pr})

	})
}

}()) // module function
