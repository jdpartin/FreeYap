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

    async searchGames(searchTerm, limit = 20)
    {
        return await this.getMultiplayerGames(searchTerm, limit);
    }

    async getAllGames(limit = 50)
    {
        return await this.getMultiplayerGames('', limit);
    }
}
