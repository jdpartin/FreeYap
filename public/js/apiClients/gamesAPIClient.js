class GamesAPIClient
{
    constructor()
    {
        this.baseUrl = '/api/games';
    }

    async getMultiplayerGames(searchTerm = '', limit = 10)
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/get-multiplayer-games`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ searchTerm, limit })
            });

            if (!response.ok)
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Fetched multiplayer games:', data);
            return data;
        }
        catch (error)
        {
            console.error('Error fetching multiplayer games:', error);
            return {
                success: false,
                error: 'Failed to fetch multiplayer games',
                data: []
            };
        }
    }

    async getMultiplayerGamesByCategory(category, searchTerm = '', limit = 10)
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/get-multiplayer-games-by-category`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ category, searchTerm, limit })
            });

            if (!response.ok)
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Fetched multiplayer games by category:', data);
            return data;
        }
        catch (error)
        {
            console.error('Error fetching multiplayer games by category:', error);
            return {
                success: false,
                error: 'Failed to fetch multiplayer games by category',
                data: []
            };
        }
    }

    async getMultiplayerGameCategories()
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/get-multiplayer-game-categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok)
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Fetched multiplayer game categories:', data);

            return data.data;
        }
        catch (error)
        {
            console.error('Error fetching multiplayer game categories:', error);
            return {
                success: false,
                error: 'Failed to fetch multiplayer game categories',
                data: []
            };
        }
    }
}
