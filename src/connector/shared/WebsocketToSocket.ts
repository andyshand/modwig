import { WEBSOCKET_PORT, SOCKET_PORT } from "./Constants";
const RECONNECT_IN = 1000 * 3
export function runWebsocketToSocket() {
    const WebSocket = require('ws');
    const net = require('net');
    
    const wss = new WebSocket.Server({ port: WEBSOCKET_PORT });
    let activeWebsocket;
    let bitwigConnected = false
    const bitwigClient = new net.Socket();
    
    function connectBitwig() {
        console.log('Connecting to Bitwig...')
        try {
          bitwigClient.connect(SOCKET_PORT, '127.0.0.1', function() {
              console.log('Connected to Bitwig');
              bitwigConnected = true
          });
        } catch (e) {
          console.error(e)
          setTimeout(() => {
            connectBitwig()
          }, RECONNECT_IN)
        }
    }
    
    bitwigClient.on('data', function(data) {
        console.log('Bitwig sent: ' + data);
        if (activeWebsocket) {
          activeWebsocket.send(data)
        }
    });
    
    bitwigClient.on('close', function() {
        console.log('Connection to Bitwig closed, reconnecting...')
        bitwigConnected = false
        setTimeout(() => {
            connectBitwig()
        }, RECONNECT_IN)
    });
    connectBitwig()
    
    wss.on('connection', ws => {
      activeWebsocket = ws;
      console.log('Browser connected')
      
      ws.on('message', messageFromBrowser => {
        console.log('Browser sent: ', messageFromBrowser)
        if (bitwigConnected) {
          const buff = Buffer.from(messageFromBrowser, 'utf8');
          const sizeBuf = Buffer.alloc(4);
          sizeBuf.writeInt32BE(messageFromBrowser.length, 0)
          try {
            bitwigClient.write(Buffer.concat([sizeBuf, buff]))
          } catch (e) {
            console.error(e)
          }
        }
      });
    
      ws.on('close', () => {
        console.log('Connection to browser lost. Waiting for reconnection...')
        activeWebsocket = null;
      });
    });
}
