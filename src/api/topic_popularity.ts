import express, { Request, Response } from 'express';
import DatabaseManager from '../managers/databaseManager';

const router = express.Router();
const db = new DatabaseManager();

// Cache for popular topics
let popularTopicsCache: any[] | null = null;
let popularTopicsCacheExpiry: number = 0;
let isPopularTopicsRefreshing: boolean = false;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

router.post('/get-popular-topics', async (req: Request, res: Response) =>
{
    try
    {
        await ensurePopularTopicsLoaded();

        // Return cached data
        res.status(200).json(popularTopicsCache || []);
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
        res.status(500).json({ error: 'Failed to get topic popularity' });    }
});

// Popular topics caching functions
async function ensurePopularTopicsLoaded()
{
    const now = Date.now();
    
    // If cache is empty (null or empty array), wait for fresh data
    if (!popularTopicsCache || popularTopicsCache.length === 0)
    {
        await refreshPopularTopicsCache();
        return;
    }
    
    // If cache exists with data but is stale, return cached data and refresh in background
    if (now >= popularTopicsCacheExpiry && !isPopularTopicsRefreshing)
    {
        // Start background refresh without waiting
        refreshPopularTopicsInBackground();
    }
}

async function refreshPopularTopicsCache()
{
    try
    {
        isPopularTopicsRefreshing = true;
        const popularityResults = await db.executeFunction('get_popular_topics', [10]);
        popularTopicsCache = popularityResults || [];
        popularTopicsCacheExpiry = Date.now() + CACHE_DURATION;
    }
    catch (error)
    {
        console.error('Failed to refresh popular topics cache:', error);
        // If we have old cached data and refresh fails, extend expiry by 1 minute to avoid constant retries
        if (popularTopicsCache)
        {
            popularTopicsCacheExpiry = Date.now() + (60 * 1000); // 1 minute fallback
        }
        throw error;
    }
    finally
    {
        isPopularTopicsRefreshing = false;
    }
}

function refreshPopularTopicsInBackground()
{
    refreshPopularTopicsCache().catch(error => {
        console.error('Background popular topics cache refresh failed:', error);
    });
}

// Initialize cache when module loads
refreshPopularTopicsInBackground();

export default router;