import { WEBSOCKET_PORT, SOCKET_PORT } from "./Constants";

export function runWebsocketToSocket() {
    const WebSocket = require('ws');
    const net = require('net');
    
    const wss = new WebSocket.Server({ port: WEBSOCKET_PORT });
    let activeWebsocket;
    const bitwigClient = new net.Socket();
    
    function reconnectBitwig() {
        console.log('Connecting to Bitwig...')
        bitwigClient.connect(SOCKET_PORT, '127.0.0.1', function() {
            console.log('Connected to Bitwig');
            bitwigClient.write('Hello, server! Love, Client.');
        });
    }
    
    bitwigClient.on('data', function(data) {
        console.log('Received: ' + data);
    });
    
    bitwigClient.on('close', function() {
        console.log('Connection to Bitwig closed, reconnecting in 5 seconds...')
        setTimeout(() => {
            reconnectBitwig()
        }, 1000 * 5)
    });
    
    wss.on('connection', ws => {
      activeWebsocket = ws;
      
      ws.on('message', messageFromBrowser => {
        bitwigClient.write(messageFromBrowser)
      });
    
      ws.on('close', () => {
        console.log('Connection to browser lost. Waiting for reconnection...')
        activeWebsocket = null;
      });
    
      ws.send('something');
    });
}
