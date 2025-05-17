const { Server } = require('socket.io');

class WebRTCServerManager {
  constructor(server) {
    this.io = new Server(server);
    this.peers = new Map(); // Map to store peer connections

    this.io.on('connection', (socket) => {
      console.log(`Peer connected: ${socket.id}`);

      // Handle joining a room
      socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Peer ${socket.id} joined room ${roomId}`);
        this.io.to(roomId).emit('peer-joined', socket.id);
      });

      // Handle signaling data
      socket.on('signal', ({ roomId, signalData }) => {
        socket.to(roomId).emit('signal', { peerId: socket.id, signalData });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Peer disconnected: ${socket.id}`);
        this.peers.delete(socket.id);
      });
    });
  }

  /**
   * Broadcast a message to all peers in a room.
   * @param {string} roomId - The room ID.
   * @param {string} event - The event name.
   * @param {any} data - The data to broadcast.
   */
  broadcastToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }
}

module.exports = WebRTCServerManager;
