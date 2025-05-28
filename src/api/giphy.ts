import express, { Request, Response } from 'express';
import GiphyManager from '../managers/giphyManager';

const router = express.Router();

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

        res.status(200).json(results);
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

        res.status(200).json(results);
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

        res.status(200).json(results);
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

        res.status(200).json(results);
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

        const results = await GiphyManager.GetTrendingGifs(limit);

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

        const results = await GiphyManager.GetTrendingStickers(limit);

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

        res.status(200).json(results);
    }
    catch (error)
    {
        console.error('Error in /search-stickers:', error);
        res.status(500).send('Failed to search stickers');
    }
});

export default router;