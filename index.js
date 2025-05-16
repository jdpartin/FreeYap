const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Enable EJS Layouts
app.use(expressLayouts);
app.set('layout', 'layout');

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

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

app.listen(PORT, () => {
  console.log(`FreeYap server running at http://localhost:${PORT}`);
});
