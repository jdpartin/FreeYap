import { Server } from 'socket.io';
import { Socket } from 'socket.io';

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
}

export default WebRTCServerManager;
