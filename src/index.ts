import express from 'express';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';
import http from 'http';
import bodyParser from 'body-parser';
import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { setupWebRTCSignaling } from './webrtc';
import matchmakingApi from './api/matchmaking';
import topicPopularityApi from './api/topic_popularity';
import semanticSimilarityApi from './api/semantic_similarity';
import MatchmakingManager from './managers/matchmakingManager';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.IO with the HTTP server
const io = new Server(server);

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

// Initialize matchmaking manager with Socket.IO instance
MatchmakingManager.initialize(io);

// API routes
app.use('/api/matchmaking', matchmakingApi);
app.use('/api/topic-popularity', topicPopularityApi);
app.use('/api/semantic-similarity', semanticSimilarityApi);

// Initialize WebRTC signaling
setupWebRTCSignaling(io);

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

app.get('/topics-demo', (req: Request, res: Response) => {
  res.render('topics-demo', { title: 'Topics Demo' });
});

app.get('/simple-text-chat', (req: Request, res: Response) => {
  res.render('simpleTextChat', { title: 'Simple Text Chat' });
});

app.get('/semantic-similarity', (req: Request, res: Response) => {
  res.render('semanticSimilarity', { title: 'Semantic Similarity Tester' });
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

export { app, server };
