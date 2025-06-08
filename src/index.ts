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
import giphyApi from './api/giphy';
import gamesApi from './api/games';
import contactApi from './api/contact';
import reportApi from './api/report';
import testApi from './api/test';
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
app.use('/api/giphy', giphyApi);
app.use('/api/games', gamesApi);
app.use('/api/contact', contactApi);
app.use('/api/report', reportApi);
app.use('/api/test', testApi);

// Initialize WebRTC signaling
setupWebRTCSignaling(io);

// Routes
app.get('/', (req: Request, res: Response) => {
  res.render('index', { title: 'FreeYap Home', isHomePage: true });
});

app.get('/about', (req: Request, res: Response) => {
  res.render('about', { title: 'About FreeYap' });
});

app.get('/help', (req: Request, res: Response) => {
  res.render('help', { title: 'FreeYap Help & FAQs' });
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

app.get('/terms', (req: Request, res: Response) => {
  res.render('terms', { title: 'Terms of Service - FreeYap' });
});

app.get('/privacy', (req: Request, res: Response) => {
  res.render('privacy', { title: 'Privacy Policy - FreeYap' });
});

app.get('/safety', (req: Request, res: Response) => {
  res.render('safety', { title: 'Protect Yourself Online - FreeYap' });
});

app.get('/features', (req: Request, res: Response) => {
  res.render('features', { title: 'Request a Feature - FreeYap' });
});

app.get('/find-games', (req: Request, res: Response) => {
  res.render('findGames', { title: 'Find Games - FreeYap' });
});

app.get('/play-game', (req: Request, res: Response) => {
  res.render('playGame', { title: 'Play Game - FreeYap' });
});

// Ads.txt redirect to Ezoic Ads.txt Manager
app.get('/ads.txt', (req: Request, res: Response) => {
  res.redirect(301, 'https://srv.adstxtmanager.com/19390/freeyap.com');
});

// Get my IP endpoint
app.post('/my-ip', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  res.send({ ip });
});

// Get ICE server configuration endpoint
app.post('/ice-servers', (req, res) => {
  const iceServers: Array<{ urls: string; username?: string; credential?: string }> = [
    // Google STUN servers (primary)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    
    // Additional reliable STUN servers as fallbacks
    { urls: 'stun:stun.stunprotocol.org:3478' },
    { urls: 'stun:stun.voiparound.com' },
    { urls: 'stun:stun.voipbuster.com' },
    { urls: 'stun:stun.voipstunt.com' },
    { urls: 'stun:stun.voxgratia.org' },
    
    // OpenRelay STUN servers
    { urls: 'stun:openrelay.metered.ca:80' },
    { urls: 'stun:stun.relay.metered.ca:80' }
  ];

  // Add TURN server if credentials are available
  if (process.env.EXPRESS_TURN_URL && process.env.EXPRESS_TURN_USERNAME && process.env.EXPRESS_TURN_PASSWORD) {
    iceServers.push({
      urls: `turn:${process.env.EXPRESS_TURN_URL}`,
      username: process.env.EXPRESS_TURN_USERNAME,
      credential: process.env.EXPRESS_TURN_PASSWORD
    });
  }

  res.send({ iceServers });
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
