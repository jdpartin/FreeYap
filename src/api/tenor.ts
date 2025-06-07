import express, { Request, Response } from 'express';
import TenorManager from '../managers/tenorManager';

const router = express.Router();

// Cache for trending GIFs
let trendingGifsCache: any[] | null = null;
let trendingGifsCacheExpiry: number = 0;
let isTrendingGifsRefreshing: boolean = false;

// Cache for trending stickers
let trendingStickersCache: any[] | null = null;
let trendingStickersCacheExpiry: number = 0;
let isTrendingStickersRefreshing: boolean = false;

// Cache for trending terms
let trendingTermsCache: any[] | null = null;
let trendingTermsCacheExpiry: number = 0;
let isTrendingTermsRefreshing: boolean = false;

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

        const results = await TenorManager.SearchGifs(term, limit);

        // Extract results array from Tenor API response for consistency
        const data = results?.results || results;
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

        const results = await TenorManager.SearchGifsById(id);

        // Extract results array from Tenor API response for consistency
        const data = results?.results || results;
        res.status(200).json(data);
    }
    catch (error)
    {
        console.error('Error in /search-gifs-by-id:', error);
        res.status(500).send('Failed to search GIFs by ID');
    }
});

router.post('/search-trending-gifs', async (req: Request, res: Response) =>
{
    try
    {
        const { term, limit = 10 } = req.body;

        if (!term)
        {
            res.status(400).json({ error: 'Search term is required' });
            return;
        }

        const results = await TenorManager.SearchTrendingGifs(term, limit);

        // Extract results array from Tenor API response for consistency
        const data = results?.results || results;
        res.status(200).json(data);
    }
    catch (error)
    {
        console.error('Error in /search-trending-gifs:', error);
        res.status(500).send('Failed to search trending GIFs');
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

        const results = await TenorManager.GetRandomGifsByTag(tag, limit);

        // Extract results array from Tenor API response for consistency
        const data = results?.results || results;
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

        const results = await TenorManager.SearchStickers(term, limit);

        // Extract results array from Tenor API response for consistency
        const data = results?.results || results;
        res.status(200).json(data);
    }
    catch (error)
    {
        console.error('Error in /search-stickers:', error);
        res.status(500).send('Failed to search stickers');
    }
});

router.post('/get-autocomplete-suggestions', async (req: Request, res: Response) =>
{
    try
    {
        const { term, limit = 10 } = req.body;

        if (!term)
        {
            res.status(400).json({ error: 'Search term is required' });
            return;
        }

        const results = await TenorManager.GetAutocompleteSuggestions(term, limit);

        // Extract results array from Tenor API response for consistency
        const data = results?.results || results;
        res.status(200).json(data);
    }
    catch (error)
    {
        console.error('Error in /get-autocomplete-suggestions:', error);
        res.status(500).send('Failed to get autocomplete suggestions');
    }
});

router.post('/get-trending-terms', async (req: Request, res: Response) =>
{
    try
    {
        const { limit = 10 } = req.body;

        await ensureTrendingTermsLoaded(limit);

        // Return cached data (may be filtered by limit if cache has more items)
        const results = trendingTermsCache?.slice(0, limit) || [];

        res.status(200).json(results);
    }
    catch (error)
    {
        console.error('Error in /get-trending-terms:', error);
        res.status(500).send('Failed to get trending terms');
    }
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
        const results = await TenorManager.GetTrendingGifs(limit);
        
        // Extract the results array from the Tenor API response
        trendingGifsCache = results?.results || results;
        trendingGifsCacheExpiry = Date.now() + CACHE_DURATION;
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
        const results = await TenorManager.GetTrendingStickers(limit);
        
        // Extract the actual stickers data from the nested response
        trendingStickersCache = results?.results || results;
        trendingStickersCacheExpiry = Date.now() + CACHE_DURATION;
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

// Trending Terms caching functions
async function ensureTrendingTermsLoaded(limit: number = 10)
{
    const now = Date.now();
    
    // If cache is empty, wait for fresh data
    if (!trendingTermsCache)
    {
        await refreshTrendingTermsCache(limit);
        return;
    }
    
    // If cache exists but is stale, return cached data and refresh in background
    if (now >= trendingTermsCacheExpiry && !isTrendingTermsRefreshing)
    {
        // Start background refresh without waiting
        refreshTrendingTermsInBackground(limit);
    }
}

async function refreshTrendingTermsCache(limit: number = 20)
{
    try
    {
        isTrendingTermsRefreshing = true;
        const results = await TenorManager.GetTrendingTerms(limit);
        
        // Extract the results array from the Tenor API response
        trendingTermsCache = results?.results || results;
        trendingTermsCacheExpiry = Date.now() + CACHE_DURATION;
    }
    catch (error)
    {
        console.error('Failed to refresh trending terms cache:', error);
        // If we have old cached data and refresh fails, extend expiry by 1 hour to avoid constant retries
        if (trendingTermsCache)
        {
            trendingTermsCacheExpiry = Date.now() + (60 * 60 * 1000); // 1 hour fallback
        }
        throw error;
    }
    finally
    {
        isTrendingTermsRefreshing = false;
    }
}

function refreshTrendingTermsInBackground(limit: number = 20)
{
    refreshTrendingTermsCache(limit).catch(error => {
        console.error('Background trending terms cache refresh failed:', error);
    });
}

// Initialize caches when module loads
refreshTrendingGifsInBackground();
refreshTrendingStickersInBackground();
refreshTrendingTermsInBackground();

export default router;