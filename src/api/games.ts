import express, { Request, Response } from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Cache for games data
let gamesCache: any[] | null = null;
let cacheExpiry: number = 0;
let isRefreshing: boolean = false;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

router.post('/get-multiplayer-games', async (req: Request, res: Response) =>
{
    try
    {
        const { searchTerm = '', limit = 10 } = req.body;

        await ensureGamesLoaded();
        
        let filteredGames = [...(gamesCache || [])];// Apply search filter if provided
        if (searchTerm && searchTerm.trim() !== "")
        {
            const searchLower = searchTerm.toLowerCase();
            filteredGames = filteredGames.filter(game => {
                // Check tags
                let tagsMatch = false;
                if (game.tags) {
                    const tagsArray = game.tags.split(',');
                    tagsMatch = tagsArray.some((tag: string) => tag.trim().toLowerCase().includes(searchLower));
                }
                
                return tagsMatch ||
                       (game.title && game.title.toLowerCase().includes(searchLower)) ||
                       (game.description && game.description.toLowerCase().includes(searchLower));
            });
        }

        // Apply limit
        const limitedGames = filteredGames.slice(0, limit);

        res.status(200).json({
            success: true,
            data: limitedGames,
            total: filteredGames.length
        });
    }
    catch (error)
    {
        console.error('Error in /get-multiplayer-games:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch multiplayer games',
            data: []
        });    }
});

router.post('/get-multiplayer-games-by-category', async (req: Request, res: Response) =>
{
    try
    {
        const { category, searchTerm = "", limit = 10 } = req.body;        
        
        await ensureGamesLoaded();

        let filteredGames = [...(gamesCache || [])];// Filter by category if provided
        if (category && category.trim() !== "")
        {
            const categoryLower = category.toLowerCase();

            filteredGames = filteredGames.filter(game => {
                if (!game.tags) return false;
                
                // Handle tags as comma-separated string
                const tagsArray = game.tags.split(',');
                const gameTags = tagsArray.map((tag: string) => tag.trim().toLowerCase());
                const hasCategory = gameTags.includes(categoryLower);
                
                return hasCategory;
            });
            
        }// Apply search filter if provided
        
        if (searchTerm && searchTerm.trim() !== "")
        {
            const searchLower = searchTerm.toLowerCase();
            filteredGames = filteredGames.filter(game => {
                // Check tags
                let tagsMatch = false;
                if (game.tags) {
                    const tagsArray = game.tags.split(',');
                    tagsMatch = tagsArray.some((tag: string) => tag.trim().toLowerCase().includes(searchLower));
                }
                
                return tagsMatch ||
                       (game.title && game.title.toLowerCase().includes(searchLower)) ||
                       (game.description && game.description.toLowerCase().includes(searchLower));
            });
        }

        // Apply limit
        const limitedGames = filteredGames.slice(0, limit);

        res.status(200).json({
            success: true,
            data: limitedGames,
            total: filteredGames.length
        });
    }
    catch (error)
    {
        console.error('Error in /get-multiplayer-games-by-category:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch games by category',
            data: []
        });
    }
});

router.post('/get-multiplayer-game-categories', async (req: Request, res: Response) =>
{
    try
    {
        await ensureGamesLoaded();

        // Extract unique categories from the games
        const categoriesSet = new Set<string>();(gamesCache || []).forEach(game => {
            if (game.tags) {
                // tags are a comma-separated string, split it into an array
                const tagsArray = game.tags.split(',');
                tagsArray.forEach((tag: string) => {
                    const trimmedTag = tag.trim().toLowerCase();
                    if (trimmedTag) {
                        categoriesSet.add(trimmedTag);
                    }
                });
            }
        });

        // Convert Set to Array and sort it
        const categories = Array.from(categoriesSet).sort();

        res.status(200).json({
            success: true,
            data: categories
        });
    }
    catch (error)
    {
        console.error('Error in /get-multi-player-game-categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch game categories',
            data: []
        });
    }
});

async function getAllGames()
{
    let now = Date.now();

    if (gamesCache && now < cacheExpiry)
    {
        return gamesCache;
    }

    // Fetch fresh data
    const response = await fetch('https://www.onlinegames.io/media/plugins/genGames/embed.json');
    
    if (!response.ok)
    {
        throw new Error(`Failed to fetch games: ${response.status}`);
    }

    const allGames = await response.json();
      // Filter for multiplayer games only
    gamesCache = allGames.filter((game: any) => {
        if (!game.tags) return false;
        const tagsArray = game.tags.split(',');
        return tagsArray.some((tag: string) => tag.trim().toLowerCase() === 'multiplayer');
    });
    
    cacheExpiry = now + CACHE_DURATION;   
}

async function ensureGamesLoaded()
{
    const now = Date.now();
    
    // If cache is empty, wait for fresh data
    if (!gamesCache)
    {
        await refreshGamesCache();
        return;
    }
    
    // If cache exists but is stale, return cached data and refresh in background
    if (now >= cacheExpiry && !isRefreshing)
    {
        // Start background refresh without waiting
        refreshGamesInBackground();
    }
}

async function refreshGamesCache()
{
    try
    {
        isRefreshing = true;
        const response = await fetch('https://www.onlinegames.io/media/plugins/genGames/embed.json');
        
        if (!response.ok)
        {
            throw new Error(`Failed to fetch games: ${response.status}`);
        }

        const allGames = await response.json();
        
        // Filter for multiplayer games only
        gamesCache = allGames.filter((game: any) => {
            if (!game.tags) return false;
            const tagsArray = game.tags.split(',');
            return tagsArray.some((tag: string) => tag.trim().toLowerCase() === 'multiplayer');
        });
          cacheExpiry = Date.now() + CACHE_DURATION;
        console.log(`Games cache refreshed successfully. ${gamesCache?.length || 0} multiplayer games cached.`);
    }
    catch (error)
    {
        console.error('Failed to refresh games cache:', error);
        // If we have old cached data and refresh fails, extend expiry by 1 hour to avoid constant retries
        if (gamesCache)
        {
            cacheExpiry = Date.now() + (60 * 60 * 1000); // 1 hour fallback
        }
        throw error;
    }
    finally
    {
        isRefreshing = false;
    }
}

function refreshGamesInBackground()
{
    refreshGamesCache().catch(error => {
        console.error('Background games cache refresh failed:', error);
    });
}

// Initialize cache when module loads
refreshGamesInBackground();

export default router;
