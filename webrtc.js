
(function () {
"use strict"
const G = window

const MAX_CHUNK_SIZE = 262144

const {
	pr
} = glue

let localConnection
let remoteConnection
let sendChannel
let receiveChannel
let chunkSize
let lowWaterMark
let highWaterMark
let dataString
let timeoutHandle = null
const megsToSend = 1
const sendProgress    = {}
const receiveProgress = {}

let bytesToSend = 0
let totalTimeUsedInSend = 0
let numberOfSendCalls = 0
let maxTimeUsedInSend = 0
let sendStartTime = 0
let currentThroughput = 0

async function createConnection() {

	const servers = null

	const number = Number.parseInt(megsToSend)
	bytesToSend = number * 1024 * 1024

	localConnection = new RTCPeerConnection(servers)

	// Let's make a data channel!
	const dataChannelParams = {ordered: true}
	sendChannel = localConnection.createDataChannel('sendDataChannel', dataChannelParams)
	sendChannel.addEventListener('open', onSendChannelOpen)
	sendChannel.addEventListener('close', onSendChannelClosed)
	pr('Created send data channel: ', sendChannel)

	pr('Created local peer connection object localConnection: ', localConnection)

	localConnection.addEventListener('icecandidate', e => onIceCandidate(localConnection, e))

	remoteConnection = new RTCPeerConnection(servers)
	remoteConnection.addEventListener('icecandidate', e => onIceCandidate(remoteConnection, e))
	remoteConnection.addEventListener('datachannel', receiveChannelCallback)

	try {
		const localOffer = await localConnection.createOffer()
		await handleLocalDescription(localOffer)
	} catch (e) {
		console.error('Failed to create session description: ', e)
	}

	pr('Peer connection setup complete.')
}
G.createConnection = createConnection

function sendData() {
	// Stop scheduled timer if any (part of the workaround introduced below)
	if (timeoutHandle !== null) {
		clearTimeout(timeoutHandle)
		timeoutHandle = null
	}

	let bufferedAmount = sendChannel.bufferedAmount
	while (sendProgress.value < sendProgress.max) {
		pr('Sending data...')
		const timeBefore = performance.now()
		sendChannel.send(dataString)
		const timeUsed = performance.now() - timeBefore
		if (timeUsed > maxTimeUsedInSend) {
			maxTimeUsedInSend = timeUsed
			totalTimeUsedInSend += timeUsed
		}
		numberOfSendCalls += 1
		bufferedAmount += chunkSize
		sendProgress.value += chunkSize

		// Pause sending if we reach the high water mark
		if (bufferedAmount >= highWaterMark) {
			// This is a workaround due to the bug that all browsers are incorrectly calculating the
			// amount of buffered data. Therefore, the 'bufferedamountlow' event would not fire.
			if (sendChannel.bufferedAmount < lowWaterMark) {
				timeoutHandle = setTimeout(() => sendData(), 0)
			}
			pr(`Paused sending, buffered amount: ${bufferedAmount} (announced: ${sendChannel.bufferedAmount})`)
			break
		}
	}

	if (sendProgress.value === sendProgress.max) {
		pr('Data transfer completed successfully!')
	}
}

function startSendingData() {
	pr('Start sending data.')
	sendProgress.max = bytesToSend
	receiveProgress.max = sendProgress.max
	sendProgress.value = 0
	receiveProgress.value = 0
	sendStartTime = performance.now()
	maxTimeUsedInSend = 0
	totalTimeUsedInSend = 0
	numberOfSendCalls = 0
	sendData()
}

function maybeReset() {
	if (localConnection === null && remoteConnection === null) {
		//
	}
}

async function handleLocalDescription(desc) {
	localConnection.setLocalDescription(desc)
	pr('Offer from localConnection:\n', desc.sdp)
	remoteConnection.setRemoteDescription(desc)
	try {
		const remoteAnswer = await remoteConnection.createAnswer()
		handleRemoteAnswer(remoteAnswer)
	} catch (e) {
		console.error('Error when creating remote answer: ', e)
	}
}

function handleRemoteAnswer(desc) {
	remoteConnection.setLocalDescription(desc)
	pr('Answer from remoteConnection:\n', desc.sdp)
	localConnection.setRemoteDescription(desc)
}

function getOtherPc(pc) {
	return (pc === localConnection) ? remoteConnection : localConnection
}

async function onIceCandidate(pc, event) {
	const candidate = event.candidate
	if (candidate === null) {
		return
	} // Ignore null candidates
	try {
		await getOtherPc(pc).addIceCandidate(candidate)
		pr('AddIceCandidate successful: ', candidate)
	} catch (e) {
		console.error('Failed to add Ice Candidate: ', e)
	}
}

function receiveChannelCallback(event) {
	pr('Receive Channel Callback')
	receiveChannel = event.channel
	receiveChannel.binaryType = 'arraybuffer'
	receiveChannel.addEventListener('close', onReceiveChannelClosed)
	receiveChannel.addEventListener('message', onReceiveMessageCallback)
}

function onReceiveMessageCallback(event) {
	receiveProgress.value += event.data.length
	currentThroughput = receiveProgress.value / (performance.now() - sendStartTime)
	pr('Current Throughput is:', currentThroughput, 'bytes/sec')

	// Workaround for a bug in Chrome which prevents the closing event from being raised by the
	// remote side. Also a workaround for Firefox which does not send all pending data when closing
	// the channel.
	if (receiveProgress.value === receiveProgress.max) {
		sendChannel.close()
		receiveChannel.close()
	}
}

function onSendChannelOpen() {
	pr('Send channel is open')

	chunkSize = Math.min(localConnection.sctp.maxMessageSize, MAX_CHUNK_SIZE)
	pr('Determined chunk size: ', chunkSize)
	dataString = new Array(chunkSize).fill('X').join('')
	lowWaterMark = chunkSize // A single chunk
	highWaterMark = Math.max(chunkSize * 8, 1048576) // 8 chunks or at least 1 MiB
	pr('Send buffer low water threshold: ', lowWaterMark)
	pr('Send buffer high water threshold: ', highWaterMark)
	sendChannel.bufferedAmountLowThreshold = lowWaterMark
	sendChannel.addEventListener('bufferedamountlow', (e) => {
		pr('BufferedAmountLow event:', e)
		sendData()
	})

	startSendingData()
}

function onSendChannelClosed() {
	pr('Send channel is closed')
	localConnection.close()
	localConnection = null
	pr('Closed local peer connection')
	maybeReset()
	pr('Average time spent in send() (ms): ' +
							totalTimeUsedInSend / numberOfSendCalls)
	pr('Max time spent in send() (ms): ' + maxTimeUsedInSend)
	const spentTime = performance.now() - sendStartTime
	pr('Total time spent: ' + spentTime)
	pr('MBytes/Sec: ' + (bytesToSend / 1000) / spentTime)
}

function onReceiveChannelClosed() {
	pr('Receive channel is closed')
	remoteConnection.close()
	remoteConnection = null
	pr('Closed remote peer connection')
	maybeReset()
}

}()) // module function
