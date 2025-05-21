import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import WebRTCServerManager from '../managers/webrtcServerManager';

const router = Router();

export default (webRTCServerManager: WebRTCServerManager, io: Server) => {
    // Example route for joining a room
    router.post('/join-room', async (req: Request, res: Response) => {
        const { roomId, sessionIds } = req.body;
        if (!roomId || !sessionIds || !Array.isArray(sessionIds)) {
            res.status(400).json({ error: 'Invalid request' });
            return;
        }

        try {
            await webRTCServerManager.handleJoinRoom(roomId, sessionIds);
            res.status(200).json({ message: 'Users added to room successfully' });
        } catch (error) {
            console.error('Error in /join-room:', error);
            res.status(500).json({ error: 'Failed to add users to room' });
        }
    });

    // Example route for handling offer
    router.post('/offer', async (req: Request, res: Response) => {
        const { roomId, socketId, sdp } = req.body;
        if (!roomId || !socketId || !sdp) {
            res.status(400).json({ error: 'Invalid request' });
            return;
        }

        try {
            await webRTCServerManager.handleOffer(roomId, socketId, sdp);
            res.status(200).json({ message: 'Offer handled successfully' });
        } catch (error) {
            console.error('Error in /offer:', error);
            res.status(500).json({ error: 'Failed to handle offer' });
        }
    });

    // Example route for handling answer
    router.post('/answer', async (req: Request, res: Response) => {
        const { roomId, socketId, sdp } = req.body;
        if (!roomId || !socketId || !sdp) {
            res.status(400).json({ error: 'Invalid request' });
            return;
        }

        try {
            await webRTCServerManager.handleAnswer(roomId, socketId, sdp);
            res.status(200).json({ message: 'Answer handled successfully' });
        } catch (error) {
            console.error('Error in /answer:', error);
            res.status(500).json({ error: 'Failed to handle answer' });
        }
    });

    // Example route for handling ICE candidate
    router.post('/ice-candidate', async (req: Request, res: Response) => {
        const { roomId, socketId, candidate } = req.body;
        if (!roomId || !socketId || !candidate) {
            res.status(400).json({ error: 'Invalid request' });
            return;
        }

        try {
            await webRTCServerManager.handleIceCandidate(roomId, socketId, candidate);
            res.status(200).json({ message: 'ICE candidate handled successfully' });
        } catch (error) {
            console.error('Error in /ice-candidate:', error);
            res.status(500).json({ error: 'Failed to handle ICE candidate' });
        }
    });

    // Example route for disconnecting a peer
    router.post('/disconnect', async (req: Request, res: Response) => {
        const { socketId } = req.body;
        if (!socketId) {
            res.status(400).json({ error: 'Invalid request' });
            return;
        }

        try {
            await webRTCServerManager.handleDisconnect(socketId);
            res.status(200).json({ message: 'User disconnected successfully' });
        } catch (error) {
            console.error('Error in /disconnect:', error);
            res.status(500).json({ error: 'Failed to disconnect user' });
        }
    });

    return router;
};