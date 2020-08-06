import { WEBSOCKET_PORT, SOCKET_PORT } from "./Constants";
const logInOut = true
const RECONNECT_IN = 1000 * 3;

let waiting = 0
let partialMsg = ''
let bitwigClient: any = null
let bitwigConnected = false;

const logWithTime = (...args) => {
    const d = new Date()
    const pad0 = input => ('0' + input).substr(-2)
    console.log(`${d.getHours()}:${pad0(d.getMinutes())}:${pad0(d.getSeconds())}:`, ...args)
}

let toBWInterceptors: {[type: string]: Function[]} = {}
let fromBWInterceptors: {[type: string]: Function[]} = {}

function processInterceptors(packetStr, ceptors: {[type: string]: Function[]}) {
    const packet = JSON.parse(packetStr)
    if ((ceptors[packet.type] || []).length) {
        for (const cept of fromBWInterceptors[packet.type]) {
            cept(packet)
        }
    }
}

export function runWebsocketToSocket() {
    const WebSocket = require('ws');
    const net = require('net');
    const wss = new WebSocket.Server({ port: WEBSOCKET_PORT });
    let activeWebsocket;

    function connectBitwig() {
        logWithTime('Connecting to Bitwig...');
        try {
            bitwigClient = new net.Socket();
            bitwigClient!.connect(SOCKET_PORT, '127.0.0.1', function () {
                logWithTime('Connected to Bitwig');
                bitwigConnected = true;
            });
            bitwigClient!.on('data', function (data) {
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
                        if (activeWebsocket) {
                            if (logInOut) logWithTime('Bitwig sent: ' + partialMsg.substr(0, 50));
                            try {
                                processInterceptors(partialMsg, fromBWInterceptors)
                            } catch (e) {
                                console.error("Error intercepting packet", e)
                            }
                            console.log('Sending to browser')
                            activeWebsocket.send(partialMsg);
                        }
                        partialMsg = ''
                    }
                }
            });
            bitwigClient!.on('close', function () {
                logWithTime('Connection to Bitwig closed, reconnecting...');
                bitwigConnected = false;
                bitwigClient = null
                waiting = 0
                setTimeout(() => {
                    connectBitwig();
                }, RECONNECT_IN);
            });
        }
        catch (e) {
            console.error(e);
            setTimeout(() => {
                connectBitwig();
            }, RECONNECT_IN);
        }
    }
    connectBitwig();
    
    wss.on('connection', ws => {
        activeWebsocket = ws;
        logWithTime('Browser connected');
        ws.on('message', messageFromBrowser => {
            if (logInOut) logWithTime('Browser sent: ', messageFromBrowser);
            try {
                processInterceptors(messageFromBrowser, toBWInterceptors)
                sendToBitwig(messageFromBrowser)
            } catch (e) {
                console.error("Invalid packet from browser", e)
            } 
        });
        ws.on('close', () => {
            logWithTime('Connection to browser lost. Waiting for reconnection...');
            activeWebsocket = null;
        });
    });
}

function sendToBitwig(str) {
  if (bitwigClient && bitwigConnected) {
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

export function interceptPacket(type: string, toBitwig?: Function, fromBitwig?: Function) {
    if (toBitwig) {
        toBWInterceptors[type] = (toBWInterceptors[type] || []).concat(toBitwig)
    } else if (fromBitwig) {
        fromBWInterceptors[type] = (fromBWInterceptors[type] || []).concat(fromBitwig)
    }
}