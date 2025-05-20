import { Router, Request, Response } from 'express';
import WebRTCServerManager from '../managers/webrtcServerManager';

const router = Router();

export default (webRTCServerManager: WebRTCServerManager) => {
    // Example route for joining a room
    router.post('/join-room', (req: Request, res: Response) => {
        const { roomId, socketId } = req.body;
        if (!roomId || !socketId) {
            res.status(400).json({ error: 'Invalid request' });
            return;
        }
        const result = webRTCServerManager.joinRoom({ id: socketId } as any, roomId);
        res.json(result);
    });

    // Example route for handling offer
    router.post('/offer', (req: Request, res: Response) => {
        const { roomId, socketId, sdp } = req.body;
        if (!roomId || !socketId || !sdp) {
            res.status(400).json({ error: 'Invalid request' });
            return;
        }
        webRTCServerManager.io.to(roomId).emit('offer', { sdp });
        res.json({ success: true });
    });

    // Example route for handling answer
    router.post('/answer', (req: Request, res: Response) => {
        const { roomId, socketId, sdp } = req.body;
        if (!roomId || !socketId || !sdp) {
            res.status(400).json({ error: 'Invalid request' });
            return;
        }
        webRTCServerManager.io.to(roomId).emit('answer', { sdp });
        res.json({ success: true });
    });

    // Example route for handling ICE candidate
    router.post('/ice-candidate', (req: Request, res: Response) => {
        const { roomId, socketId, candidate } = req.body;
        if (!roomId || !socketId || !candidate) {
            res.status(400).json({ error: 'Invalid request' });
            return;
        }
        webRTCServerManager.io.to(roomId).emit('ice-candidate', { candidate });
        res.json({ success: true });
    });

    // Example route for disconnecting a peer
    router.post('/disconnect', (req: Request, res: Response) => {
        const { socketId } = req.body;
        if (!socketId) {
            res.status(400).json({ error: 'Invalid request' });
            return;
        }
        webRTCServerManager.disconnectPeer({ id: socketId } as any);
        res.json({ success: true });
    });

    return router;
};