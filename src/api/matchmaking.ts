import express, { Request, Response } from 'express';
import MatchmakingManager from '../managers/matchmakingManager';

const router = express.Router();

router.post('/join-queue', async (req: Request, res: Response) => {
    const { sessionId, terms } = req.body;
    await MatchmakingManager.JoinQueue(sessionId, terms);
    res.status(200).send('User added to queue');
});

router.post('/leave-queue', async (req: Request, res: Response) => {
    const { sessionId } = req.body;
    await MatchmakingManager.LeaveQueue(sessionId);
    res.status(200).send('User removed from queue');
});

export default router;