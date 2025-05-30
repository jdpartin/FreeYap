import express, { Request, Response } from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Cache for games data
let gamesCache: any[] | null = null;
let cacheExpiry: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

router.post('/get-multiplayer-games', async (req: Request, res: Response) =>
{
    try
    {
        const { searchTerm = '', limit = 10 } = req.body;

        // Check if cache is valid
        const now = Date.now();
        if (!gamesCache || now > cacheExpiry)
        {
            // Fetch fresh data
            const response = await fetch('https://www.onlinegames.io/media/plugins/genGames/embed.json');
            
            if (!response.ok)
            {
                throw new Error(`Failed to fetch games: ${response.status}`);
            }

            const allGames = await response.json();
            
            // Filter for multiplayer games only
            gamesCache = allGames.filter((game: any) => 
                game.tags && game.tags.includes('multiplayer')
            );
            
            cacheExpiry = now + CACHE_DURATION;        
        }

        let filteredGames = [...(gamesCache || [])];

        // Apply search filter if provided
        if (searchTerm && searchTerm.trim() !== "")
        {
            const searchLower = searchTerm.toLowerCase();
            filteredGames = filteredGames.filter(game => {
                return (game.tags && game.tags.toLowerCase().includes(searchLower)) ||
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
        });
    }
});

export default router;
