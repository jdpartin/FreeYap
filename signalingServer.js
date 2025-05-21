const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('A user connected');

    ws.on('message', (message) => {
        console.log('Received:', message);

        // Broadcast the message to all connected clients except the sender
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('A user disconnected');
    });
});

console.log('WebSocket signaling server is running on ws://localhost:8080');
