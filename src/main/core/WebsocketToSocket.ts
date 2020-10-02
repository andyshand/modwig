import { BESService, getService, makeEvent } from "./Service";
import { WEBSOCKET_PORT, SOCKET_PORT } from '../../connector/shared/Constants'
import { app } from "electron";
const { Bitwig } = require('bindings')('bes')
const async = require('async')
const WebSocket = require('ws');
const net = require('net');
const logInOut = true
const RECONNECT_IN = 1000 * 3;

let nextSocketId = 0
let waiting = 0
let partialMsg = ''
let bitwigClient: any = null
let activeWebsockets: {ws:any,id:number}[] = [];

const logWithTime = (...args) => {
    const d = new Date()
    const pad0 = input => ('0' + input).substr(-2)
    console.log(`${d.getHours()}:${pad0(d.getMinutes())}:${pad0(d.getSeconds())}:`, ...args)
}

/**
 * We have to have a queue here because our interceptors can be async, which means our
 * data processor could end up out of order (as we process multiple packets in one function call)
 */
const bitwigToClientQueue = async.queue(async function ({data}, callback) {
    let leftToParse = data.toString()
    while (leftToParse.length > 0) {
        if (waiting === 0) {
            waiting = parseInt(leftToParse, 10)
            partialMsg = ''
            leftToParse = leftToParse.substr(String(waiting).length)
            // logWithTime("waiting on " + waiting)
        }
        let thisTime = leftToParse.substr(0, waiting)
        leftToParse = leftToParse.substr(waiting)
        partialMsg += thisTime
        waiting -= thisTime.length 
        if (waiting === 0) {
            if (activeWebsockets.length) {
                if (logInOut) logWithTime('Bitwig sent: ' + partialMsg.substr(0, 50));
                try {
                    partialMsg = (await processInterceptors(partialMsg, fromBWInterceptors)).string
                } catch (e) {
                    console.error("Error intercepting packet", e)
                }
                activeWebsockets.forEach(info => info.ws.send(partialMsg))
            } else {
                logWithTime('Websocket not active, packet lost')
            }
            partialMsg = ''
        }
    }
    callback();
}, 1);

type BitwigToClientInterceptorResponse = {modified: boolean} | void
type BitwigToClientInterceptor = (packet: any) => BitwigToClientInterceptorResponse | Promise<BitwigToClientInterceptorResponse>
let toBWInterceptors: {[type: string]: Function[]} = {}
let fromBWInterceptors: {[type: string]: BitwigToClientInterceptor[]} = {}

async function processInterceptors(packetStr, ceptors: {[type: string]: Function[]}) {
    const packet = JSON.parse(packetStr)
    let didIntercept = false
    if ((ceptors[packet.type] || []).length) {
        const ceptorsForPacket = ceptors[packet.type]
        for (const cept of ceptorsForPacket) {
            let out = cept(packet)
            // If our cb was async, wait for it to finish
            if (out && (out as any).then) {
                out = await out
            }
            didIntercept = didIntercept || (out as any)?.modified
        }
    }
    // Don't waste time re-stringifying if nothing changed
    return {
        string: didIntercept ? JSON.stringify(packet) : packetStr,
        parsedBefore: packet
    }
}

export class SocketMiddlemanService extends BESService {
    events = {
        connected: makeEvent<boolean>()
    }
    bitwigConnected: boolean = false

    activate() {
        console.log("Activating Socket...")
        const wss = new WebSocket.Server({ port: WEBSOCKET_PORT });
        const connectBitwig = () => {
            logWithTime('Connecting to Bitwig...');
            try {
                bitwigClient = new net.Socket();
                bitwigClient.connect(SOCKET_PORT, '127.0.0.1', () => {
                    logWithTime('Connected to Bitwig');
                    this.events.connected.emit(true)
                    this.bitwigConnected = true;
                });
                bitwigClient.on('data', data => bitwigToClientQueue.push({data}))
                bitwigClient.on('error', err => {
                    console.error(err)
                })
                bitwigClient.on('close', () => {
                    logWithTime('Connection to Bitwig closed, reconnecting...');
                    this.bitwigConnected = false;
                    bitwigClient = null
                    this.events.connected.emit(false)
                    waiting = 0
                    setTimeout(() => {
                        connectBitwig();
                    }, RECONNECT_IN);
                });
            } catch (e) {
                console.error(e);
                setTimeout(() => {
                    connectBitwig();
                }, RECONNECT_IN);
            }
        }
        connectBitwig();
        
        wss.on('connection', ws => {
            const id = nextSocketId++
            activeWebsockets.push({ws, id});
            logWithTime(`Browser connected (${id})`);
            ws.on('message', async messageFromBrowser => {
                if (logInOut) logWithTime('Browser sent: ', messageFromBrowser);
                try {
                    const { parsedBefore } = await processInterceptors(messageFromBrowser, toBWInterceptors)
                    if (parsedBefore.type.split('/')[0] === 'api') {
                        // No need to do anything
                    } else {    
                        sendToBitwig(messageFromBrowser)
                    }
                } catch (e) {
                    console.error("Invalid packet from browser", e)
                } 
            });
            ws.on('close', () => {
                logWithTime(`Connection to browser lost (${id})`);
                activeWebsockets = activeWebsockets.filter((info) => info.id !== id);
            });
        });
    }
}

function sendToBitwig(str) {
  if (bitwigClient && getService<SocketMiddlemanService>('SocketMiddlemanService').bitwigConnected) {
    const buff = Buffer.from(str, 'utf8');
    const sizeBuf = Buffer.alloc(4);
    sizeBuf.writeInt32BE(str.length, 0);
    try {
      if (logInOut) logWithTime('Sending to bitwig: ', str)
      bitwigClient.write(Buffer.concat([sizeBuf, buff]));
    }
    catch (e) {
        console.error(e);
    }
  }
}

export function sendPacketToBitwig(packet) {
  return sendToBitwig(JSON.stringify(packet))
}

export function sendPacketToBrowser(packet) {
    const str = JSON.stringify(packet)
    if (logInOut) {
        console.log('Sending to browser:', str)
    }
    activeWebsockets.forEach(info => info.ws.send(str))
}

/**
 * Bitwig->Client interceptors may modify the packet in any way before it reaches the browser, but must
 * return {modified: true} from their handler function. Otherwise changes will not be registered.
 */
export function interceptPacket(type: string, toBitwig?: Function, fromBitwig?: BitwigToClientInterceptor) {
    if (toBitwig) {
        toBWInterceptors[type] = (toBWInterceptors[type] || []).concat(toBitwig)
    } else if (fromBitwig) {
        fromBWInterceptors[type] = (fromBWInterceptors[type] || []).concat(fromBitwig)
    }
}

interceptPacket('api/status', ({id}) => {
    console.log('intercepting')
    sendPacketToBrowser({
        type: 'api/status',
        data: {
            bitwigConnected: getService<SocketMiddlemanService>('SocketMiddlemanService').bitwigConnected,
            accessibilityEnabled: Bitwig.isAccessibilityEnabled(false)
        },
        id
    })
})