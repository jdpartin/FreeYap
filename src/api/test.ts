import express, { Request, Response } from 'express';
import DatabaseManager from '../managers/databaseManager';

const router = express.Router();
const db = new DatabaseManager();

// Test endpoint to clear the matchmaking queue
router.post('/clear-queue', async (req: Request, res: Response) =>
{
    try
    {
        // Only allow this in development/test environments
        if (process.env.NODE_ENV === 'production') {
            res.status(403).json({ error: 'This endpoint is not available in production' });
            return;
        }

        await db.executeStoredProcedure('clear_matchmaking_queue', {});
        res.status(200).json({ message: 'Queue cleared successfully' });
    }
    catch (error)
    {
        console.error('Error clearing queue:', error);
        res.status(500).json({ 
            error: 'Failed to clear queue',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Test endpoint to clear the matchmaking blocking entries
router.post('/clear-blocking', async (req: Request, res: Response) =>
{
    try
    {
        // Only allow this in development/test environments
        if (process.env.NODE_ENV === 'production') {
            res.status(403).json({ error: 'This endpoint is not available in production' });
            return;
        }

        await db.executeStoredProcedure('clear_matchmaking_blocking', {});
        res.status(200).json({ message: 'Blocking entries cleared successfully' });
    }
    catch (error)
    {
        console.error('Error clearing blocking entries:', error);
        res.status(500).json({ 
            error: 'Failed to clear blocking entries',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
