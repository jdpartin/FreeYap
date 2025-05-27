class SemanticSimilarityAPIClient
{
    constructor()
    {
        this.baseUrl = '/api/semantic-similarity';
    }

    async GetBulkEmbeddings(topics)
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/bulk-embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ topics })
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
            console.error('Error getting embeddings:', error);
            throw error;
        }
    }

    async CompareSimilarity(topic1, topic2)
    {
        try
        {
            const response = await fetch(`${this.baseUrl}/compare-similarity`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ topic1, topic2 })
            });

            if (!response.ok)
            {
                throw new Error(`HTTP error! status: ${response.status}`);
            }            
            const data = await response.json();

            console.log('Got similarity:', data);

            return data;
        }
        catch (error)
        {
            console.error('Error getting similarity:', error);
            throw error;
        }
    }
}