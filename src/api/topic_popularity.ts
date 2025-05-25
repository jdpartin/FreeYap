import express, { Request, Response } from 'express';
import DatabaseManager from '../managers/databaseManager';

const router = express.Router();
const db = new DatabaseManager();

router.post('/get-popular-topics', async (req: Request, res: Response) =>
{
    try
    {
        const popularityResults = await db.executeFunction('get_popular_topics', []);

        // Ensure we return the results directly as they come from the database
        res.status(200).json(popularityResults || []);
    }
    catch (error)
    {
        console.error('Error in /get-popular-topics:', error);
        res.status(500).json({ error: 'Failed to get popular topics' });
    }
});

router.post('/get-topic-popularity', async (req: Request, res: Response) =>
{
    try
    {
        const { topic } = req.body;

        if (!topic)
        {
            res.status(400).json({ error: 'Topic is required' });
            return;
        }

        const popularityResult = await db.executeFunction('get_topic_popularity', [topic]);

        // Extract the popularity score from the result
        let popularity = 0;
        if (popularityResult && Array.isArray(popularityResult) && popularityResult.length > 0) {
            popularity = popularityResult[0].popularity_score || 0;
        }

        res.status(200).json({ topic, popularity });
    }    
    catch (error)
    {
        console.error('Error in /get-topic-popularity:', error);
        res.status(500).json({ error: 'Failed to get topic popularity' });
    }
});

export default router;