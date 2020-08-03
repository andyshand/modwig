export namespace Bitwig {
    export interface Track {
        volume: number,
        volumeString: string,
        pan: number,
        name: string,
        color: string,
        type: 'standard' | 'group',
        index: number,
        solo: boolean,
        mute: boolean
    }

    export const tracks: Track[] = []
}

const ws = new WebSocket("ws://127.0.0.1:8181");

const onMessage: Function[] = []
export function onMessageReceived(callback) {
    onMessage.push(callback)
}

let queued: any[] = []
export function send(newPacket: any) {
  queued.push(newPacket)
  if (ws.readyState === 1) {
    for (const packet of queued) {
      ws.send(JSON.stringify(packet))
    }
  }
}

ws.onmessage = (event) => {
  console.log("Received: ", event.data)
  // try {
  //     const separator = "<MESSAGEHEADERFUCKYOU>"
  //     const messages = data.split(separator)
  //     messages.forEach(function (message) {
  //         message = message.trim()
  //         if (message.length === 0) {
  //             return
  //         }
  //         const parsed = JSON.parse(message);
  //         //console.log(parsed);
  //         onMessage.forEach(function (callback) {
  //             callback(parsed)
  //         })

          
  //     })

  // } catch (e) {
  //     console.error(e)
  //     console.log(data)
  // }

}

setInterval(() => {
  send({type: 'ping'})
}, 1000 * 10)
send({type: 'ping'})
