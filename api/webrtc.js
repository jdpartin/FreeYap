const express = require('express');
const router = express.Router();
const WebRTCServerManager = require('../managers/webrtcServerManager');

router.post('/join-room', (req, res) => {
  const { socketId, roomId } = req.body;
  const result = WebRTCServerManager.joinRoom({ id: socketId }, roomId);
  res.json(result);
});

router.post('/signal', (req, res) => {
  const { socketId, roomId, signalData } = req.body;
  const result = WebRTCServerManager.handleSignal({ id: socketId }, roomId, signalData);
  res.json(result);
});

router.post('/disconnect', (req, res) => {
  const { socketId } = req.body;
  const result = WebRTCServerManager.disconnectPeer({ id: socketId });
  res.json(result);
});

module.exports = router;
