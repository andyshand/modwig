const w = window as any
export namespace Bitwig {
    export interface Track {
        volume: number,
        volumeString: string,
        pan: number,
        name: string,
        color: string,
        type: 'Effect' | 'Instrument' | 'Audio' | 'Group' | 'Hybrid' | 'Master',
        position: number,
        solo: boolean,
        mute: boolean
    }

    export const tracks: Track[] = []
}

let state = {
  tracksByName: {}
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
    for (const t of packet.data) {
      state.tracksByName[t.name] = t
    }
  }
}

export function getTrackByName(name: string) : Bitwig.Track {
  return state.tracksByName[name]
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