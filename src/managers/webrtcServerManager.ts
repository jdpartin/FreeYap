// This class should be instantiated in the `index.ts` file and passed as an instance to other modules that require it.
// Avoid using this class as a static class to ensure proper state management and avoid multiple instances.

import { Server, Socket } from 'socket.io';

// This is SERVER-SIDE code for managing WebRTC connections
// It should never be referenced in the client-side code
// Client-side code should never reference this file
class WebRTCServerManager
{
    public io: Server;
    private peers: Map<string, any>;

    constructor(httpServer: any)
    {
        this.io = new Server(httpServer);
        this.peers = new Map(); // Map to store peer connections
    }

    public joinRoom(socket: Socket, roomId: string): { event: string; data: string }
    {
        socket.join(roomId);
        console.log(`Peer ${socket.id} joined room ${roomId}`);
        return { event: 'peer-joined', data: socket.id };
    }

    public handleSignal(socket: Socket, roomId: string, signalData: any): { event: string; data: { peerId: string; signalData: any } }
    {
        return { event: 'signal', data: { peerId: socket.id, signalData } };
    }

    public disconnectPeer(socket: Socket): { event: string; data: string }
    {
        console.log(`Peer disconnected: ${socket.id}`);
        this.peers.delete(socket.id);
        return { event: 'peer-disconnected', data: socket.id };
    }

    public async handleJoinRoom(roomId: string, sessionIds: string[]): Promise<void>
    {
        sessionIds.forEach(sessionId => {
            const socket = this.io.sockets.sockets.get(sessionId);
            console.log(`Attempting to join room: ${roomId} for session: ${sessionId}`);
            console.log(`Socket found:`, socket);
            if (socket) {
                socket.join(roomId);
                console.log(`Session ${sessionId} joined room ${roomId}`);
            }
        });
        this.io.to(roomId).emit('room-joined', { roomId });
    }

    public async handleOffer(roomId: string, socketId: string, sdp: string): Promise<void>
    {
        this.io.to(roomId).emit('offer', { socketId, sdp });
        console.log(`Offer sent to room ${roomId} from socket ${socketId}`);
    }

    public async handleAnswer(roomId: string, socketId: string, sdp: string): Promise<void>
    {
        this.io.to(roomId).emit('answer', { socketId, sdp });
        console.log(`Answer sent to room ${roomId} from socket ${socketId}`);
    }

    public async handleIceCandidate(roomId: string, socketId: string, candidate: any): Promise<void>
    {
        this.io.to(roomId).emit('ice-candidate', { socketId, candidate });
        console.log(`ICE candidate sent to room ${roomId} from socket ${socketId}`);
    }

    public async handleDisconnect(socketId: string): Promise<void>
    {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
            // Iterate through all rooms the socket is in and leave them
            const rooms = Array.from(socket.rooms);
            rooms.forEach((roomId) => {
                if (roomId !== socket.id) { // Avoid leaving its own room
                    socket.leave(roomId);
                }
            });
            console.log(`Socket ${socketId} disconnected and left all rooms`);
        }
        this.io.emit('user-disconnected', { socketId });
    }
}

export default WebRTCServerManager;
