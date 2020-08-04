import { WEBSOCKET_PORT, SOCKET_PORT } from "./Constants";

const RECONNECT_IN = 1000 * 3;

let waiting = 0
let partialMsg = ''
let bitwigClient: any = null
let bitwigConnected = false;

export function runWebsocketToSocket() {
    const WebSocket = require('ws');
    const net = require('net');
    const wss = new WebSocket.Server({ port: WEBSOCKET_PORT });
    let activeWebsocket;

    function connectBitwig() {
        console.log('Connecting to Bitwig...');
        try {
            bitwigClient = new net.Socket();
            bitwigClient!.connect(SOCKET_PORT, '127.0.0.1', function () {
                console.log('Connected to Bitwig');
                bitwigConnected = true;
            });
            bitwigClient!.on('data', function (data) {
                console.log('Bitwig sent: ' + data);
                let leftToParse = data.toString()
                while (leftToParse.length > 0) {
                    if (waiting === 0) {
                        waiting = parseInt(leftToParse, 10)
                        partialMsg = ''
                        leftToParse = leftToParse.substr(String(waiting).length)
                        console.log("waiting on " + waiting)
                    }
                    let thisTime = leftToParse.substr(0, waiting)
                    leftToParse = leftToParse.substr(waiting)
                    partialMsg += thisTime
                    waiting -= thisTime.length 
                    if (waiting === 0) {
                        if (activeWebsocket) {
                          activeWebsocket.send(partialMsg);
                        }
                        partialMsg = ''
                    }
                }
            });
            bitwigClient!.on('close', function () {
                console.log('Connection to Bitwig closed, reconnecting...');
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
        console.log('Browser connected');
        ws.on('message', messageFromBrowser => {
            console.log('Browser sent: ', messageFromBrowser);
            sendToBitwig(messageFromBrowser)
        });
        ws.on('close', () => {
            console.log('Connection to browser lost. Waiting for reconnection...');
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
      console.log('Sending to bitwig: ', str)
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