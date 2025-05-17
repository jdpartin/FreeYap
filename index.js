const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Enable EJS Layouts
app.use(expressLayouts);
app.set('layout', 'layout');

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Queue to store users waiting for a chat
const waitingUsers = new Set();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-queue', () => {
    console.log('User joined queue:', socket.id);
    // If someone else is waiting, pair them up
    const waitingUser = Array.from(waitingUsers)[0];
    if (waitingUser) {
      waitingUsers.delete(waitingUser);
      // Create a unique room for these two users
      const room = `${waitingUser}-${socket.id}`;
      io.to(waitingUser).emit('chat-ready', { room, isCaller: true });
      socket.emit('chat-ready', { room, isCaller: false });
    } else {
      // No one waiting, add this user to waiting list
      waitingUsers.add(socket.id);
      socket.emit('waiting');
    }
  });

  socket.on('join-room', (room) => {
    socket.join(room);
  });

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    socket.to(data.room).emit('offer', { sdp: data.sdp });
  });

  socket.on('answer', (data) => {
    socket.to(data.room).emit('answer', { sdp: data.sdp });
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.room).emit('ice-candidate', { candidate: data.candidate });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    waitingUsers.delete(socket.id);
    // Notify any rooms this user was in
    socket.rooms.forEach(room => {
      if (room !== socket.id) {  // Socket.IO automatically puts socket in room of its own ID
        socket.to(room).emit('peer-disconnected');
      }
    });
  });
});

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'FreeYap Home' });
});

app.get('/about', (req, res) => {
  res.render('about', { title: 'About FreeYap' });
});

app.get('/help', (req, res) => {
  res.render('help', { title: 'FreeYap Help & FAQs' });
});

app.get('/queue', (req, res) => {
  res.render('queue', { title: 'Queue' });
});

app.get('/template', (req, res) => {
  res.render('template', { title: 'Template Page' });
});

app.get('/video-chat', (req, res) => {
  res.render('videoChat', { title: 'Video Chat' });
});

app.get('/voice-chat', (req, res) => {
  res.render('voiceChat', { title: 'Voice Chat' });
});

app.get('/text-chat', (req, res) => {
  res.render('textChat', { title: 'Text Chat' });
});

server.listen(PORT, () => {
  console.log(`FreeYap server running at http://localhost:${PORT}`);
});
