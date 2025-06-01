import express, { Request, Response } from 'express';
import GiphyManager from '../managers/giphyManager';

const router = express.Router();

// Cache for trending GIFs
let trendingGifsCache: any[] | null = null;
let trendingGifsCacheExpiry: number = 0;
let isTrendingGifsRefreshing: boolean = false;

// Cache for trending stickers
let trendingStickersCache: any[] | null = null;
let trendingStickersCacheExpiry: number = 0;
let isTrendingStickersRefreshing: boolean = false;

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

router.post('/search-gifs', async (req: Request, res: Response) =>
{
    try
    {
        const { term, limit = 10 } = req.body;

        if (!term)
        {
            res.status(400).json({ error: 'Search term is required' });
            return;
        }

        const results = await GiphyManager.SearchGifs(term, limit);

        // Extract data array from Giphy API response for consistency
        const data = (results as any)?.data || results;
        res.status(200).json(data);
    }
    catch (error)
    {
        console.error('Error in /search-gifs:', error);
        res.status(500).send('Failed to search GIFs');
    }
});

router.post('/search-gifs-by-id', async (req: Request, res: Response) =>
{
    try
    {
        const { id } = req.body;

        if (!id)
        {
            res.status(400).json({ error: 'GIF ID is required' });
            return;
        }

        const results = await GiphyManager.SearchGifsById(id);

        // Extract data array from Giphy API response for consistency
        const data = (results as any)?.data || results;
        res.status(200).json(data);
    }
    catch (error)
    {
        console.error('Error in /search-gifs-by-id:', error);
        res.status(500).send('Failed to search GIFs by ID');
    }
});

router.post('/search-translated-gifs', async (req: Request, res: Response) =>
{
    try
    {
        const { term, limit = 10 } = req.body;

        if (!term)
        {
            res.status(400).json({ error: 'Search term is required' });
            return;
        }

        const results = await GiphyManager.SearchTranslatedGifs(term, limit);

        // Extract data array from Giphy API response for consistency
        const data = (results as any)?.data || results;
        res.status(200).json(data);
    }
    catch (error)
    {
        console.error('Error in /search-translated-gifs:', error);
        res.status(500).send('Failed to search translated GIFs');
    }
});

router.post('/get-random-gifs-by-tag', async (req: Request, res: Response) =>
{
    try
    {
        const { tag, limit = 10 } = req.body;

        if (!tag)
        {
            res.status(400).json({ error: 'Tag is required' });
            return;
        }

        const results = await GiphyManager.GetRandomGifsByTag(tag, limit);

        // Extract data array from Giphy API response for consistency
        const data = (results as any)?.data || results;
        res.status(200).json(data);
    }
    catch (error)
    {
        console.error('Error in /get-random-gifs-by-tag:', error);
        res.status(500).send('Failed to get random GIFs by tag');
    }
});

router.post('/get-trending-gifs', async (req: Request, res: Response) =>
{
    try
    {
        const { limit = 10 } = req.body;

        await ensureTrendingGifsLoaded(limit);

        // Return cached data (may be filtered by limit if cache has more items)
        const results = trendingGifsCache?.slice(0, limit) || [];

        res.status(200).json(results);
    }
    catch (error)
    {
        console.error('Error in /get-trending-gifs:', error);
        res.status(500).send('Failed to get trending GIFs');
    }
});

router.post('/get-trending-stickers', async (req: Request, res: Response) =>
{
    try
    {
        const { limit = 10 } = req.body;

        await ensureTrendingStickersLoaded(limit);

        // Return cached data (may be filtered by limit if cache has more items)
        const results = trendingStickersCache?.slice(0, limit) || [];

        res.status(200).json(results);
    }
    catch (error)
    {
        console.error('Error in /get-trending-stickers:', error);
        res.status(500).send('Failed to get trending stickers');
    }
});

router.post('/search-stickers', async (req: Request, res: Response) =>
{
    try
    {
        const { term, limit = 10 } = req.body;

        if (!term)
        {
            res.status(400).json({ error: 'Search term is required' });
            return;
        }

        const results = await GiphyManager.SearchStickers(term, limit);

        // Extract data array from Giphy API response for consistency
        const data = (results as any)?.data || results;
        res.status(200).json(data);
    }
    catch (error)
    {
        console.error('Error in /search-stickers:', error);
        res.status(500).send('Failed to search stickers');    }
});

// Trending GIFs caching functions
async function ensureTrendingGifsLoaded(limit: number = 10)
{
    const now = Date.now();
    
    // If cache is empty, wait for fresh data
    if (!trendingGifsCache)
    {
        await refreshTrendingGifsCache(limit);
        return;
    }
    
    // If cache exists but is stale, return cached data and refresh in background
    if (now >= trendingGifsCacheExpiry && !isTrendingGifsRefreshing)
    {
        // Start background refresh without waiting
        refreshTrendingGifsInBackground(limit);
    }
}

async function refreshTrendingGifsCache(limit: number = 20)
{
    try
    {
        isTrendingGifsRefreshing = true;
        console.log('Fetching trending GIFs from Giphy API...');
        const results = await GiphyManager.GetTrendingGifs(limit);
        
        // Extract the data array from the Giphy API response
        trendingGifsCache = results?.data || results;
        trendingGifsCacheExpiry = Date.now() + CACHE_DURATION;
        console.log(`Trending GIFs cache refreshed successfully. ${trendingGifsCache?.length || 0} GIFs cached.`);
    }
    catch (error)
    {
        console.error('Failed to refresh trending GIFs cache:', error);
        // If we have old cached data and refresh fails, extend expiry by 1 hour to avoid constant retries
        if (trendingGifsCache)
        {
            trendingGifsCacheExpiry = Date.now() + (60 * 60 * 1000); // 1 hour fallback
        }
        throw error;
    }
    finally
    {
        isTrendingGifsRefreshing = false;
    }
}

function refreshTrendingGifsInBackground(limit: number = 20)
{
    refreshTrendingGifsCache(limit).catch(error => {
        console.error('Background trending GIFs cache refresh failed:', error);
    });
}

// Trending Stickers caching functions
async function ensureTrendingStickersLoaded(limit: number = 20)
{
    const now = Date.now();
    
    // If cache is empty, wait for fresh data
    if (!trendingStickersCache)
    {
        await refreshTrendingStickersCache(limit);
        return;
    }
    
    // If cache exists but is stale, return cached data and refresh in background
    if (now >= trendingStickersCacheExpiry && !isTrendingStickersRefreshing)
    {
        // Start background refresh without waiting
        refreshTrendingStickersInBackground(limit);
    }
}

async function refreshTrendingStickersCache(limit: number = 20)
{
    try
    {
        isTrendingStickersRefreshing = true;
        console.log('Fetching trending stickers from Giphy API...');
        const results = await GiphyManager.GetTrendingStickers(limit);
        
        // Extract the actual stickers data from the nested response
        trendingStickersCache = results?.data || results;
        trendingStickersCacheExpiry = Date.now() + CACHE_DURATION;
        console.log(`Trending stickers cache refreshed successfully. ${trendingStickersCache?.length || 0} stickers cached.`);
    }
    catch (error)
    {
        console.error('Failed to refresh trending stickers cache:', error);
        // If we have old cached data and refresh fails, extend expiry by 1 hour to avoid constant retries
        if (trendingStickersCache)
        {
            trendingStickersCacheExpiry = Date.now() + (60 * 60 * 1000); // 1 hour fallback
        }
        throw error;
    }
    finally
    {
        isTrendingStickersRefreshing = false;
    }
}

function refreshTrendingStickersInBackground(limit: number = 20)
{
    refreshTrendingStickersCache(limit).catch(error => {
        console.error('Background trending stickers cache refresh failed:', error);
    });
}

// Initialize caches when module loads
refreshTrendingGifsInBackground();
refreshTrendingStickersInBackground();

export default router;