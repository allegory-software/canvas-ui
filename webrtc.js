/*

protocol:

1. conn  = RTCPeerConnection()
2. offer = conn.createOffer()
3. conn.setLocalDescription(offer)
4. on conn.onicecandidate(ev)
		send json(ev.candidate) to peer through external means
5.

*/

(function () {
"use strict"
let G = window

let {
	debug, pr, clock, json, json_arg,
} = glue

let sendProgress    = {}
let receiveProgress = {}

let bytesToSend = 0
let totalTimeUsedInSend = 0
let numberOfSendCalls = 0
let maxTimeUsedInSend = 0
let sendStartTime = 0
let currentThroughput = 0

let servers = null

async function rtc_conn(on_error) {

	let e = {

	let conn = new RTCPeerConnection(servers)

	async function on_icecandidate(pc, other_pc, event) {
		let candidate = event.candidate
		if (candidate === null) // ignore null candidates
			return
		try {
			await other_pc.addIceCandidate(candidate)
			pr('AddIceCandidate successful: ', candidate)
		} catch (e) {
			console.error('failed to add ICE candidate: ', e)
			on_error(e)
		}
	}

	e.candidates = []

	loc_conn.onicecandidate = function(ev) {
		if (!ev.candidate) return
		e.candidates.push(json(ev.candidate))
	}

	let offer = await loc_conn.createOffer()

	loc_conn.setLocalDescription(offer) // triggers ^icecandidate

	rem_conn.addEventListener('icecandidate', ev => on_icecandidate(rem_conn, loc_conn, ev))

	let max_msg_size
	let low_mark, high_mark

	function send_more() {

		let timeoutHandle = null

		// stop scheduled timer if any (part of the workaround introduced below)
		if (timeoutHandle !== null) {
			clearTimeout(timeoutHandle)
			timeoutHandle = null
		}

		let bufferedAmount = send_chan.bufferedAmount
		while (sendProgress.value < sendProgress.max) {
			pr('Sending data...')
			let timeBefore = clock()
			send_chan.send(dataString)
			let timeUsed = clock() - timeBefore
			if (timeUsed > maxTimeUsedInSend) {
				maxTimeUsedInSend = timeUsed
				totalTimeUsedInSend += timeUsed
			}
			numberOfSendCalls += 1
			bufferedAmount += chunkSize
			sendProgress.value += chunkSize

			// Pause sending if we reach the high water mark
			if (bufferedAmount >= high_mark) {
				// This is a workaround due to the bug that all browsers are incorrectly calculating the
				// amount of buffered data. Therefore, the 'bufferedamountlow' event would not fire.
				if (send_chan.bufferedAmount < low_mark) {
					timeoutHandle = setTimeout(() => send_mode(), 0)
				}
				pr(`Paused sending, buffered amount: ${bufferedAmount} (announced: ${send_chan.bufferedAmount})`)
				break
			}
		}

		if (sendProgress.value === sendProgress.max) {
			pr('Data transfer completed successfully!')
		}
	}

	let send_chan = loc_conn.createDataChannel('send_chan', {ordered: true})

	send_chan.addEventListener('open', function() {
		pr('send channel is open')
		max_msg_size = loc_conn.sctp.maxMessageSize
		low_mark  = 64 * 1024
		high_mark = low_mark * 8
		send_chan.bufferedAmountLowThreshold = low_mark
		send_chan.addEventListener('bufferedamountlow', function(e) {
			pr('BufferedAmountLow event:', e)
			send_more()
		})
		pr('Start sending data.')
		sendProgress.max = bytesToSend
		receiveProgress.max = sendProgress.max
		sendProgress.value = 0
		receiveProgress.value = 0
		sendStartTime = clock()
		maxTimeUsedInSend = 0
		totalTimeUsedInSend = 0
		numberOfSendCalls = 0
		send_more()
	})

	send_chan.addEventListener('close', function() {
		pr('Send channel is closed')
		loc_conn.close()
		loc_conn = null
		pr('Closed local peer connection')
		pr('Average time spent in send_more() (s): ' + totalTimeUsedInSend / numberOfSendCalls)
		pr('Max time spent in send_more() (s): ' + maxTimeUsedInSend)
		let spentTime = clock() - sendStartTime
		pr('Total time spent: ' + spentTime)
		pr('MBytes/Sec: ' + bytesToSend / spentTime)
	})

	pr('Created send data channel: ', send_chan)

	pr('Created local peer connection object loc_conn: ', loc_conn)

	rem_conn.addEventListener('datachannel', function(event) {
		pr('Receive Channel Callback')
		recv_chan = event.channel
		recv_chan.binaryType = 'arraybuffer'
		recv_chan.addEventListener('close', function() {
			pr('Receive channel is closed')
			rem_conn.close()
			rem_conn = null
			pr('Closed remote peer connection')
		})
		recv_chan.addEventListener('message', function(event) {
			receiveProgress.value += event.data.length
			currentThroughput = receiveProgress.value / (clock() - sendStartTime)
			pr('Current Throughput is:', currentThroughput, 'bytes/sec')

			// Workaround for a bug in Chrome which prevents the closing event from being raised by the
			// remote side. Also a workaround for Firefox which does not send all pending data when closing
			// the channel.
			if (receiveProgress.value === receiveProgress.max) {
				send_chan.close()
				recv_chan.close()
			}
		})
	})

	e.offer = json(offer)

	offer = json_arg(offer)
	pr('Offer from loc_conn:\n', offer.sdp)

	rem_conn.setRemoteDescription(offer)

		try {
			let remoteAnswer = await rem_conn.createAnswer()
			rem_conn.setLocalDescription(remoteAnswer)
			pr('Answer from rem_conn:\n', remoteAnswer.sdp)
			loc_conn.setRemoteDescription(remoteAnswer)
		} catch (e) {
			console.error('Error when creating remote answer: ', e)
		}
	} catch (e) {
		console.error('Failed to create session description: ', e)
	}

	pr('Peer connection setup complete.')

	return e
}

}()) // module function
