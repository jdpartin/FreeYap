const { Server } = require('socket.io');

// This is SERVER-SIDE code for managing WebRTC connections
// It should never be referenced in the client-side code
// Client-side code should never reference this file
class WebRTCServerManager {
  constructor(httpServer) {
    this.io = new Server(httpServer);
    this.peers = new Map(); // Map to store peer connections
  }

  joinRoom(socket, roomId) {
    socket.join(roomId);
    console.log(`Peer ${socket.id} joined room ${roomId}`);
    return { event: 'peer-joined', data: socket.id };
  }

  handleSignal(socket, roomId, signalData) {
    return { event: 'signal', data: { peerId: socket.id, signalData } };
  }

  disconnectPeer(socket) {
    console.log(`Peer disconnected: ${socket.id}`);
    this.peers.delete(socket.id);
    return { event: 'peer-disconnected', data: socket.id };
  }
}

module.exports = WebRTCServerManager;
