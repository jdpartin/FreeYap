import express, { Request, Response } from 'express';
import MatchmakingManager from '../managers/matchmakingManager';

const router = express.Router();

router.post('/join-queue', async (req: Request, res: Response) =>
{
    try
    {
        const { sessionId, topics } = req.body;
        await MatchmakingManager.JoinQueue(sessionId, topics);
        res.status(200).json({ message: 'User added to queue' });
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

router.post('/perform-delayed-matchmaking', async (req: Request, res: Response) =>
{
    try
    {
        const { sessionId, topics } = req.body;
        await MatchmakingManager.PerformDelayedMatchmaking(sessionId, topics);
        res.status(200).send('Delayed matchmaking performed');
    }
    catch (error)
    {
        console.error('Error in /perform-delayed-matchmaking:', error);
        res.status(500).send('Failed to perform delayed matchmaking');
    }
});

export default router;