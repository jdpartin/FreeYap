class TenorManager
{
    private static readonly BASE_URL = 'https://tenor.googleapis.com/v2';
    private static readonly API_KEY = process.env.TENOR_API_KEY;
    private static axios = require('axios');

    /**
     * Searches for GIFs based on a search term.
     * @param term  The search term to look for GIFs.
     * @param limit  The maximum number of results to return (default is 10).
     * @returns  A promise that resolves with the search results or rejects with an error.
     */
    static async SearchGifs(term: string, limit: number = 10): Promise<any>
    {
        try
        {
            const response = await this.axios.get(`${this.BASE_URL}/search`, {
                params: {
                    key: this.API_KEY,
                    q: term,
                    limit: limit,
                    media_filter: 'gif'
                }
            });

            return response.data;
        }
        catch (error)
        {
            throw error;
        }
    }

    /**
     * Searches for GIFs by their unique ID.
     * @param id  The ID or array of IDs of the GIFs to search for.
     * @returns  A promise that resolves with the GIF data or rejects with an error.
     */
    static async SearchGifsById(id: string | string[]): Promise<any>
    {
        try
        {
            const ids = Array.isArray(id) ? id.join(',') : id;
            const response = await this.axios.get(`${this.BASE_URL}/posts`, {
                params: {
                    key: this.API_KEY,
                    ids: ids
                }
            });

            return response.data;
        }
        catch (error)
        {
            throw error;
        }
    }

    /**
     * Searches for trending GIFs based on a search term.
     * @param term  The search term to look for trending GIFs.
     * @param limit  The maximum number of results to return (default is 10).
     * @returns  A promise that resolves with the search results or rejects with an error.
     */
    static async SearchTrendingGifs(term: string, limit: number = 10): Promise<any>
    {
        try
        {
            const response = await this.axios.get(`${this.BASE_URL}/trending`, {
                params: {
                    key: this.API_KEY,
                    q: term,
                    limit: limit,
                    media_filter: 'gif'
                }
            });

            return response.data;
        }
        catch (error)
        {
            throw error;
        }
    }

    /**
     * Fetches random GIFs based on a specific tag.
     * @param tag  The tag to filter random GIFs.
     * @param limit  The maximum number of random GIFs to return (default is 10).
     * @returns  A promise that resolves with the random GIFs or rejects with an error.
     */
    static async GetRandomGifsByTag(tag: string, limit: number = 10): Promise<any>
    {
        try
        {
            const response = await this.axios.get(`${this.BASE_URL}/search`, {
                params: {
                    key: this.API_KEY,
                    q: tag,
                    limit: limit,
                    random: 'true',
                    media_filter: 'gif'
                }
            });

            return response.data;
        }
        catch (error)
        {
            throw error;
        }
    }

    /**
     * Fetches trending GIFs from Tenor.
     * @param limit  The maximum number of trending GIFs to return (default is 10).
     * @returns  A promise that resolves with the trending GIFs or rejects with an error.
     */
    static async GetTrendingGifs(limit: number = 10): Promise<any>
    {
        try
        {
            const response = await this.axios.get(`${this.BASE_URL}/trending`, {
                params: {
                    key: this.API_KEY,
                    limit: limit,
                    media_filter: 'gif'
                }
            });

            return response.data;
        }
        catch (error)
        {
            throw error;
        }
    }

    /**
     * Fetches trending stickers from Tenor.
     * @param limit  The maximum number of trending stickers to return (default is 10).
     * @returns  A promise that resolves with the trending stickers or rejects with an error.
     */
    static async GetTrendingStickers(limit: number = 10): Promise<any>
    {
        try
        {
            const response = await this.axios.get(`${this.BASE_URL}/trending`, {
                params: {
                    key: this.API_KEY,
                    limit: limit,
                    media_filter: 'png,webp'
                }
            });

            return response.data;
        }
        catch (error)
        {
            throw error;
        }
    }

    /**
     * Searches for stickers on Tenor.
     * @param term  The search term to look for stickers.
     * @param limit  The maximum number of results to return (default is 10).
     * @returns  A promise that resolves with the search results or rejects with an error.
     */
    static async SearchStickers(term: string, limit: number = 10): Promise<any>
    {
        try
        {
            const response = await this.axios.get(`${this.BASE_URL}/search`, {
                params: {
                    key: this.API_KEY,
                    q: term,
                    limit: limit,
                    media_filter: 'png,webp'
                }
            });

            return response.data;
        }
        catch (error)
        {
            throw error;
        }
    }

    /**
     * Gets autocomplete suggestions for a search term.
     * @param term  The partial search term to get suggestions for.
     * @param limit  The maximum number of suggestions to return (default is 10).
     * @returns  A promise that resolves with the suggestions or rejects with an error.
     */
    static async GetAutocompleteSuggestions(term: string, limit: number = 10): Promise<any>
    {
        try
        {
            const response = await this.axios.get(`${this.BASE_URL}/autocomplete`, {
                params: {
                    key: this.API_KEY,
                    q: term,
                    limit: limit
                }
            });

            return response.data;
        }
        catch (error)
        {
            throw error;
        }
    }

    /**
     * Gets trending search terms.
     * @param limit  The maximum number of trending terms to return (default is 10).
     * @returns  A promise that resolves with the trending terms or rejects with an error.
     */
    static async GetTrendingTerms(limit: number = 10): Promise<any>
    {
        try
        {
            const response = await this.axios.get(`${this.BASE_URL}/trending_terms`, {
                params: {
                    key: this.API_KEY,
                    limit: limit
                }
            });

            return response.data;
        }
        catch (error)
        {
            throw error;
        }
    }
}

export default TenorManager;
