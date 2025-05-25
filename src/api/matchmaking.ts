import express, { Request, Response } from 'express';
import MatchmakingManager from '../managers/matchmakingManager';

const router = express.Router();

router.post('/join-queue', async (req: Request, res: Response) =>
{
    try
    {
        const { socketId, mode, topics = [] } = req.body;
        
        await MatchmakingManager.JoinQueue(socketId, topics, mode);
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
        const { socketId } = req.body;
        await MatchmakingManager.LeaveQueue(socketId);
        res.status(200).send('User removed from queue');
    }
    catch (error)
    {
        console.error('Error in /leave-queue:', error);
        res.status(500).send('Failed to remove user from queue');
    }
});

router.post('/delayed-matchmaking', async (req: Request, res: Response) =>
{
    try
    {
        const { socketId, interests = [], mode = 'text', filters = [] } = req.body;
        
        // Use interests as topics for backward compatibility
        const topics = interests || [];
        
        const result = await MatchmakingManager.PerformDelayedMatchmaking(socketId, topics, mode, { filters });
        
        // Set proper content type
        res.setHeader('Content-Type', 'application/json');
        
        res.status(200).json({ 
            success: true, 
            message: 'Delayed matchmaking performed',
            result: result
        });
    }
    catch (error)
    {
        console.error('Error in /perform-delayed-matchmaking:', error);
        
        // Set proper content type
        res.setHeader('Content-Type', 'application/json');
        
        res.status(500).json({ 
            success: false, 
            error: 'Failed to perform delayed matchmaking',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
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

        res.status(200).json({ message: 'Match notification sent to WebRTC API' });
    }
    catch (error)
    {
        console.error('Error in /match-found:', error);
        res.status(500).send('Failed to notify WebRTC API');
    }
});

export default router;