import express from 'express';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';
import http from 'http';
import bodyParser from 'body-parser';
import matchmakingApi from './api/matchmaking';
import webrtcApi from './api/webrtc';
import WebRTCServerManager from './managers/webrtcServerManager';
import { Request, Response } from 'express';
import { Server } from 'socket.io';
import webrtcController from './WebRTCDemo/webrtcController';
import * as WebSocket from 'ws';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize WebRTCServerManager with the HTTP server
const webRTCServerManager = new WebRTCServerManager(server);

// Initialize Socket.IO with the HTTP server
const io = new Server(server);

// Set up WebSocket server for WebRTC signaling
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws: WebSocket) => {
    console.log('WebRTC Demo: New signaling connection established');
    
    // Keep track of connection IDs to distinguish between different clients
    const connectionId = Math.random().toString(36).substring(2, 10);
    console.log(`WebRTC Demo: Connection ${connectionId} established`);

    ws.on('message', (message: WebSocket.Data) => {
        // Try to determine message type and log accordingly
        let messageType = 'unknown';
        let messageInfo = '';
        
        // If message is a string or can be converted to string
        if (typeof message === 'string') {
            try {
                const parsedMessage = JSON.parse(message);
                messageType = parsedMessage.type || 'unknown';
                
                if (messageType === 'offer') {
                    messageInfo = 'SDP Offer received';
                } else if (messageType === 'answer') {
                    messageInfo = 'SDP Answer received';
                } else if (messageType === 'candidate') {
                    messageInfo = 'ICE Candidate received';
                }
            } catch (e) {
                messageType = 'text';
                messageInfo = message.substring(0, 30) + (message.length > 30 ? '...' : '');
            }
        } else if (message instanceof Buffer) {
            messageInfo = `Binary data (${message.length} bytes)`;
            messageType = 'binary';
        }
        
        console.log(`WebRTC Demo: [${connectionId}] Signaling message received - Type: ${messageType} - ${messageInfo}`);
        
        // Broadcast to all other clients
        let recipientCount = 0;
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                // Forward the message in the same format it was received
                client.send(message);
                recipientCount++;
            }
        });
        console.log(`WebRTC Demo: Message forwarded to ${recipientCount} recipient(s)`);
    });

    ws.on('close', () => {
        console.log(`WebRTC Demo: Connection ${connectionId} closed`);
    });
});

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Enable EJS Layouts
app.use(expressLayouts);
app.set('layout', 'layout');

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Middleware
app.use(bodyParser.json());

// API routes
app.use('/api/matchmaking', matchmakingApi);
app.use('/api/webrtc', webrtcApi(webRTCServerManager, io));

// Initialize WebRTC Controller
webrtcController(io);

// Routes
app.get('/', (req: Request, res: Response) => {
  res.render('index', { title: 'FreeYap Home' });
});

app.get('/about', (req: Request, res: Response) => {
  res.render('about', { title: 'About FreeYap' });
});

app.get('/help', (req: Request, res: Response) => {
  res.render('help', { title: 'FreeYap Help & FAQs' });
});

app.get('/queue', (req: Request, res: Response) => {
  res.render('queue', { title: 'Queue' });
});

app.get('/template', (req: Request, res: Response) => {
  res.render('template', { title: 'Template Page' });
});

app.get('/video-chat', (req: Request, res: Response) => {
  res.render('videoChat', { title: 'Video Chat' });
});

app.get('/voice-chat', (req: Request, res: Response) => {
  res.render('voiceChat', { title: 'Voice Chat' });
});

app.get('/webrtc-demo', (req: Request, res: Response) => {
  res.render('webrtcDemo', { title: 'WebRTC Demo', layout: 'layout' });
});

app.get('/text-chat', (req: Request, res: Response) => {
  res.render('textChat', { title: 'Text Chat' });
});

server.listen(PORT, () => {
  console.log(`FreeYap server running at http://localhost:${PORT}`);
});

process.on('uncaughtException', (err) => {
    console.error('Unhandled Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export { app, server, webRTCServerManager };
