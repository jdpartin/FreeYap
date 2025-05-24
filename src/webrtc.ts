// This file is intentionally simple

import { Server, Socket } from 'socket.io';
import MatchmakingManager from './managers/matchmakingManager';

interface SignalPayload
{
    toSocketId: string;
    data: any;
}

/**
 * Configure WebRTC signaling server
 * @param io - The Socket.IO server instance
 */
function setupWebRTCSignaling(io: Server): void
{
    io.use((socket: Socket, next: Function) => 
    {
        next();
    });

    io.on('connection', (socket: Socket) =>
    {
        console.log(`Client connected: ${socket.id}`);

        socket.emit('youAre', { socketId: socket.id });

        socket.on('signal', ({ toSocketId, data }: SignalPayload) => 
        {
            const targetSocket = io.sockets.sockets.get(toSocketId);

            if (targetSocket)
            {
                targetSocket.emit('signal',
                {
                    fromSocketId: socket.id,
                    data
                });
            }
            else
            {
                socket.emit('signal-error',
                {
                    message: `Socket ${toSocketId} not found or not connected.`
                });
            }
        });        socket.on('disconnect', (reason: string) => 
        {
            console.log(`Client disconnected: ${socket.id} (${reason})`);
            
            // Remove the user from the matchmaking queue when they disconnect
            MatchmakingManager.LeaveQueue(socket.id).catch(error => 
            {
                console.error(`Error removing socket ${socket.id} from queue on disconnect:`, error);
            });
        });
    });
}

export { setupWebRTCSignaling };
