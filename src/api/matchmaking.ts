import express, { Request, Response } from 'express';
import MatchmakingManager from '../managers/matchmakingManager';

const router = express.Router();

router.post('/join-queue', async (req: Request, res: Response) =>
{
    try
    {
        const { socketId, mode, gore, nudity, ipHash, topics = [] } = req.body;

        if (!socketId || !mode || gore === undefined || nudity === undefined)
        {
            res.status(400).json({ error: 'socketId, mode, gore, and nudity are required' });
            return;
        }
        
        await MatchmakingManager.JoinQueue(socketId, topics, mode, gore, nudity, ipHash);
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

        if (!socketId)
        {
            res.status(400).json({ error: 'socketId is required' });
            return;
        }

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
        const { socketId, mode, gore, nudity, ipHash, topics = [] } = req.body;

        if (!socketId || !mode || gore === undefined || nudity === undefined)
        {
            res.status(400).json({ error: 'socketId and mode are required' });
            return;
        }
        
        const result = await MatchmakingManager.PerformDelayedMatchmaking(socketId, topics, mode, gore, nudity, ipHash);
        
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

router.post('/block-user', async (req: Request, res: Response) =>
{
    try
    {
        const { sourceIp, blockedIp } = req.body;

        if (!sourceIp || !blockedIp)
        {
            res.status(400).json({ error: 'sourceIp and blockedIp are required' });
            return;
        }

        await MatchmakingManager.BlockUser(sourceIp, blockedIp);
        res.status(200).json({ message: 'User blocked successfully' });
    }
    catch (error)
    {
        console.error('Error in /block-user:', error);
        res.status(500).json({ 
            error: 'Failed to block user',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

router.post('/vibe-check', async (req: Request, res: Response) =>
{
    try
    {
        const { reportedIp, sourceIP, gore, nudity, verified } = req.body;

        if (!reportedIp || !sourceIP)
        {
            res.status(400).json({ error: 'reportedIp and sourceIP are required' });
            return;
        }

        /*
        if (reportedIp === sourceIP)
        {
            res.status(400).json({ error: 'You cannot report your own IP' });
            return;
        }
        */

        await MatchmakingManager.InsertVibeCheck(reportedIp, sourceIP, gore, nudity, verified);
        res.status(200).json({ message: 'Vibe check saved successfully' });
    }
    catch (error)
    {
        console.error('Error in /vibe-check:', error);
        res.status(500).json({ 
            error: 'Failed to save vibe check',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;