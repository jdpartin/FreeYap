import express, { Request, Response } from 'express';
import MatchmakingManager from '../managers/matchmakingManager';

const router = express.Router();

router.post('/join-queue', async (req: Request, res: Response) =>
{
    try
    {
        const { sessionId, terms } = req.body;
        await MatchmakingManager.JoinQueue(sessionId, terms);
        res.status(200).send('User added to queue');
    }
    catch (error)
    {
        console.error('Error in /join-queue:', error);
        res.status(500).send('Failed to add user to queue');
    }
});

router.post('/leave-queue', async (req: Request, res: Response) =>
{
    try
    {
        const { sessionId } = req.body;
        await MatchmakingManager.LeaveQueue(sessionId);
        res.status(200).send('User removed from queue');
    }
    catch (error)
    {
        console.error('Error in /leave-queue:', error);
        res.status(500).send('Failed to remove user from queue');
    }
});

export default router;