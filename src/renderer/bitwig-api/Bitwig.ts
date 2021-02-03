const w = window as any

export interface BitwigTrack {
  volume: number,
  volumeString: string,
  pan: number,
  name: string,
  color: string,
  type: 'Effect' | 'Instrument' | 'Audio' | 'Group' | 'Hybrid' | 'Master',
  position: number,
  solo: boolean,
  mute: boolean,
  data?: {
    afterCues?: {[markerName: string] : boolean}
  },
  id: string // Added by us on client
}

let state = {
  tracksById: {},
  tracks: [],
  cueMarkers: [],
  transport: {
    position: 0
  }
}

const logInOut = false
let nextId = 0
let nextPacketId = 0
type PacketListenerInfo = {cb: (packet: any) => void, id: number}
let packetListeners: {[packetType: string]: PacketListenerInfo[]} = {}

const ws = new WebSocket("ws://127.0.0.1:8181");

const onMessage: Function[] = []
export function onMessageReceived(callback) {
    onMessage.push(callback)
}

let queued: any[] = []
let responseListeners: {[id: string]: Function} = {}

function sendQueuedPackets() {
  if (ws.readyState === 1) {
    for (const {packet, callback: cb} of queued) {
      if (logInOut) {
        console.log("sending: ", packet)
      }
      packet.id = nextPacketId++
      ws.send(JSON.stringify(packet))
      if (cb) {
        responseListeners[packet.id] = cb
      }
    }
    queued = []
  }
}

export function send(newPacket: any, callback?: Function) {
  queued.push({packet: {...newPacket, oneWay: true}, callback})
  sendQueuedPackets()
}

export function sendPromise(newPacket) : Promise<any> {
  return new Promise((resolve) => {
    send(newPacket, resolve)
  })
}

ws.onmessage = (event) => {
  const packet = JSON.parse(event.data)
  if (logInOut) {
    console.log("Received: ", packet)
  }
  const { type, id } = packet
  if (id in responseListeners) {
    try {
      responseListeners[id](packet)
    } catch (e) {
      console.error(e)
    }
    delete responseListeners[id]
  }

  if (type === 'tracks') {
    state.tracksById = {}
    for (const t of packet.data) {
      t.id = t.position + t.name 
      state.tracksById[t.id] = t
      state.tracks = packet.data
    }
  } else if (type === 'track/update') {
    const t = packet.data
    t.id = t.position + t.name 
    state.tracksById[t.id] = t
  } else if (type === 'cue-markers') {
    state.cueMarkers = packet.data
  } else if (type === 'transport') {
    state.transport = packet.data
  }
  
  ;(packetListeners[type] || []).forEach(listener => listener.cb(packet))
}

export function getTrackById(id: string) : BitwigTrack {
  return state.tracksById[id]
}

export function addPacketListener(type: string, cb: (packet: any) => void) {
  const id = nextId++
  packetListeners[type] = (packetListeners[type] || []).concat({
    cb,
    id
  })

  return function() {
    packetListeners[type] = packetListeners[type].filter(info => info.id !== id)
    if (packetListeners[type].length === 0) {
      delete packetListeners[type]
    }
  }
}

export function getTracks() : BitwigTrack[] {
  return state.tracks
}

export function getTransportPosition() {
  return state.transport.position
}

export const DUMMY_START_MARKER = { name: 'Project Start', position: 0, color: '#ccc' }
export const DUMMY_END_MARKER = { name: 'Project End', position: Number.MAX_SAFE_INTEGER, color: '#ccc' }
/**
 * Returns the last cue marker _before_ "pos". If the position is before any cue marker,
 * (and if there are no cue markers) the returned value will be DUMMY_START_MARKER
 */
export function getCueMarkerAtPosition(pos) {
  let i = 0;
  for (; i < state.cueMarkers.length; i++) {
    const marker = state.cueMarkers[i]
    if (marker.position > pos) {
      return i === 0 ? DUMMY_START_MARKER : state.cueMarkers[i - 1] 
    }
  }
  return state.cueMarkers[i] || DUMMY_START_MARKER
}

export function getCueMarkersAtPosition(pos) {
  let i = 0;
  for (; i < state.cueMarkers.length; i++) {
    const marker = state.cueMarkers[i]
    if (marker.position > pos) {
      return i === 0 
        ? [DUMMY_START_MARKER, state.cueMarkers[i]] 
        : [state.cueMarkers[i - 1], state.cueMarkers[i]]
    }
  }
  return [state.cueMarkers[i] || DUMMY_START_MARKER, DUMMY_END_MARKER]
}

ws.onclose = () => {
  console.log('websocket closed!!!')
}

ws.onerror = err => {
  console.error('websocket error!', err)
}

ws.onopen = () => {
  sendQueuedPackets()
}

if (w.pingInterval) {
  clearInterval(w.pingInterval)
}
w.pingInterval = setInterval(() => {
  send({type: 'ping'})
}, 1000 * 5)

// send({type: 'ping'})
// send({type: 'ping'})
// send({type: 'ping'})