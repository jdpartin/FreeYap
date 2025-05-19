import { Router, Request, Response } from 'express';
import { webRTCServerManager } from '../index';

const router = Router();

// Example route for joining a room
router.post('/join', (req: Request, res: Response): void => {
    const { roomId, socketId } = req.body;

    if (!roomId || !socketId) {
        res.status(400).json({ error: 'Invalid request' });
        return;
    }

    const result = webRTCServerManager.joinRoom({ id: socketId } as any, roomId);
    res.json(result);
});

// Example route for handling signals
router.post('/signal', (req: Request, res: Response): void => {
    const { roomId, socketId, signalData } = req.body;

    if (!roomId || !socketId || !signalData) {
        res.status(400).json({ error: 'Invalid request' });
        return;
    }

    const result = webRTCServerManager.handleSignal({ id: socketId } as any, roomId, signalData);
    res.json(result);
});

// Example route for disconnecting a peer
router.post('/disconnect', (req: Request, res: Response): void => {
    const { socketId } = req.body;

    if (!socketId) {
        res.status(400).json({ error: 'Invalid request' });
        return;
    }

    const result = webRTCServerManager.disconnectPeer({ id: socketId } as any);
    res.json(result);
});

export default router;