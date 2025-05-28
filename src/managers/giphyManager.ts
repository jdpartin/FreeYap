class GiphyManager
{
    private static giphy: any = require('giphy-api')(process.env.GIPHY_API_KEY);

    /**
     * Searches for GIFs based on a search term.
     * @param term  The search term to look for GIFs.
     * @param limit  The maximum number of results to return (default is 10).
     * @returns  A promise that resolves with the search results or rejects with an error.
     */
    static SearchGifs(term: string, limit: number = 10)
    {
        return new Promise((resolve, reject) =>
        {
            this.giphy.search({
                api: 'gifs',
                q: term,
                limit: limit
            },
            (err: any, res: any) =>
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve(res);
                }
            });
        });
    }

    /**
     * Searches for GIFs by their unique ID.
     * @param id  The ID or array of IDs of the GIFs to search for.
     * @returns  A promise that resolves with the GIF data or rejects with an error.
     */
    static async SearchGifsById(id: string | string[]): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this.giphy.id(id, (err: any, res: any) =>
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve(res);
                }
            });
        });
    }

    /**
     * Searches for translated GIFs based on a search term.
     * @param term  The search term to look for translated GIFs.
     * @param limit  The maximum number of results to return (default is 10).
     * @returns  A promise that resolves with the search results or rejects with an error.
     */
    static async SearchTranslatedGifs(term: string, limit: number = 10): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this.giphy.translate({
                q: term,
                limit: limit
            }, (err: any, res: any) =>
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve(res);
                }
            });
        });
    }

    /**
     * Fetches random GIFs based on a specific tag.
     * @param tag  The tag to filter random GIFs.
     * @param limit  The maximum number of random GIFs to return (default is 10).
     * @returns  A promise that resolves with the random GIFs or rejects with an error.
     */
    static async GetRandomGifsByTag(tag: string, limit: number = 10): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this.giphy.random({
                tag: tag,
                limit: limit
            }, 
            (err: any, res: any) =>
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve(res);
                }
            });
        });
    }

    /**
     * Fetches trending GIFs from Giphy.
     * @param limit  The maximum number of trending GIFs to return (default is 10).
     * @returns  A promise that resolves with the trending GIFs or rejects with an error.
     */
    static async GetTrendingGifs(limit: number = 10): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this.giphy.trending(
            {
                limit: limit
            },
            (err: any, res: any) =>
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve(res);
                }
            });
        });
    }

    /**
     * Fetches trending stickers from Giphy.
     * @param limit  The maximum number of trending stickers to return (default is 10).
     * @returns  A promise that resolves with the trending stickers or rejects with an error.
     */
    static async GetTrendingStickers(limit: number = 10): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this.giphy.trending({
                api: 'stickers',
                limit: limit
            },
            (err: any, res: any) =>
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve(res);
                }
            });
        });
    }

    /**
     * Searches for stickers on Giphy.
     * @param term  The search term to look for stickers.
     * @param limit  The maximum number of results to return (default is 10).
     * @returns  A promise that resolves with the search results or rejects with an error.
     */
    static async SearchStickers(term: string, limit: number = 10): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this.giphy.search({
                api: 'stickers',
                q: term,
                limit: limit
            },
            (err: any, res: any) =>
            {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve(res);
                }
            });
        });
    }

}

export default GiphyManager;