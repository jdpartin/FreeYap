class GiphyAPIClient
{
    constructor()
    {
        this.baseUrl = '/api/giphy';
    }

    async SearchGifs(term, limit = 10)
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/search-gifs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ term, limit })
            });

            if (!response.ok)
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        }
        catch (error)
        {
            console.error('Error searching GIFs:', error);
            throw error;
        }
    }

    async SearchGifsById(id)
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/search-gifs-by-id`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id })
            });

            if (!response.ok)
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        }
        catch (error)
        {
            console.error('Error searching GIFs by ID:', error);
            throw error;
        }
    }

    async SearchTranslatedGifs(term, limit = 10)
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/search-translated-gifs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ term, limit })
            });

            if (!response.ok)
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        }
        catch (error)
        {
            console.error('Error searching translated GIFs:', error);
            throw error;
        }
    }

    async GetRandomGifsByTag(tag, limit = 10)
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/get-random-gifs-by-tag`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tag, limit })
            });

            if (!response.ok)
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        }
        catch (error)
        {
            console.error('Error getting random GIFs by tag:', error);
            throw error;
        }
    }

    async GetTrendingGifs(limit = 10)
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/get-trending-gifs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ limit })
            });

            if (!response.ok)
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // This is the url for the image src attribute
            //console.log('Got trending GIFs:', data.data[0].images.original.url);

            return data;
        }
        catch (error)
        {
            console.error('Error getting trending GIFs:', error);
            throw error;
        }
    }

    async GetTrendingStickers(limit = 10)
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/get-trending-stickers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ limit })
            });

            if (!response.ok)
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        }
        catch (error)
        {
            console.error('Error getting trending stickers:', error);
            throw error;
        }
    }

    async SearchStickers(term, limit = 10)
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/search-stickers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ term, limit })
            });

            if (!response.ok)
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        }
        catch (error)
        {
            console.error('Error searching stickers:', error);
            throw error;
        }
    }
}