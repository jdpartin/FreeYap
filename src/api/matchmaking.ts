import express, { Request, Response } from 'express';
import axios from 'axios';
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

router.post('/match-found', async (req: Request, res: Response) => {
    try
    {
        const { roomId, socketId } = req.body;
        if (!roomId || !socketId)
        {
            res.status(400).json({ error: 'Invalid request' });
            return;
        }

        // Notify the WebRTC API about the match
        await axios.post(`http://localhost:${process.env.PORT || 3000}/api/webrtc/join-room`, {
            roomId,
            socketId
        });

        res.status(200).json({ message: 'Match notification sent to WebRTC API' });
    }
    catch (error)
    {
        console.error('Error in /match-found:', error);
        res.status(500).send('Failed to notify WebRTC API');
    }
});

export default router;