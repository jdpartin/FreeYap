import express from 'express';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';
import http from 'http';
import bodyParser from 'body-parser';
import matchmakingApi from './api/matchmaking';
import webrtcApi from './api/webrtc';
import WebRTCServerManager from './managers/webrtcServerManager';
import { Request, Response } from 'express';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize WebRTCServerManager with the HTTP server
const webRTCServerManager = new WebRTCServerManager(server);

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
app.use('/api/webrtc', webrtcApi);

// Replace existing Socket.IO connection handling with WebRTCServerManager
webRTCServerManager.io.on('connection', (socket) =>
{
    console.log('User connected:', socket.id);

    socket.on('join-room', (room) =>
    {
        socket.join(room);
    });

    socket.on('offer', (data) =>
    {
        socket.to(data.room).emit('offer', { sdp: data.sdp });
    });

    socket.on('answer', (data) =>
    {
        socket.to(data.room).emit('answer', { sdp: data.sdp });
    });

    socket.on('ice-candidate', (data) =>
    {
        socket.to(data.room).emit('ice-candidate', { candidate: data.candidate });
    });

    socket.on('disconnect', () =>
    {
        console.log('User disconnected:', socket.id);
        socket.rooms.forEach(room =>
        {
            if (room !== socket.id)
            {
                socket.to(room).emit('peer-disconnected');
            }
        });
    });
});

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
