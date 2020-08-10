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
  cueMarkers: [],
  transport: {
    position: 0
  }
}

let nextId = 0
let nextPacketId = 0
type PacketListenerInfo = {cb: (packet: any) => void, id: number}
let packetListeners: {[packetType: string]: PacketListenerInfo[]} = {}

const ws = new WebSocket("ws://127.0.0.1:8181");

const onMessage: Function[] = []
export function onMessageReceived(callback) {
    onMessage.push(callback)
}

// let packetsWaitingForResponse

let queued: any[] = []
export function send(newPacket: any) {
  queued.push(newPacket)
  if (ws.readyState === 1) {
    for (const packet of queued) {
      console.log("sending: ", packet)
      packet.id = nextPacketId++
      ws.send(JSON.stringify(packet))
    }
    queued = []
  }
}

ws.onmessage = (event) => {
  console.log("Received: ", event.data)
  const packet = JSON.parse(event.data)
  const { type } = packet
  ;(packetListeners[type] || []).forEach(listener => listener.cb(packet))
  if (type === 'tracks') {
    state.tracksById = {}
    for (const t of packet.data) {
      t.id = t.position + t.name 
      state.tracksById[t.id] = t
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
  return Object.values(state.tracksById)
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

w.onclose = () => {
  console.log('websocket closed!!!')
}

w.onerror = err => {
  console.error('websocket error!', err)
}

if (w.pingInterval) {
  clearInterval(w.pingInterval)
}
w.pingInterval = setInterval(() => {
  send({type: 'ping'})
}, 1000 * 5)

send({type: 'ping'})
send({type: 'ping'})
send({type: 'ping'})