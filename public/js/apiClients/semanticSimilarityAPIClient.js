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
            const similarityResponse = await this.GetBulkEmbeddings([topic1, topic2]);

            if (!similarityResponse || similarityResponse.length < 2)
            {
                throw new Error('Invalid response from similarity API');
            }

            const vecA = similarityResponse[0].embedding;
            const vecB = similarityResponse[1].embedding;

            const similarity = this.CalculateCosineSimilarity(vecA, vecB);

            return {
                topic1,
                topic2,
                similarity
            };
        }
        catch (error)
        {
            console.error('Error getting similarity:', error);
            throw error;
        }
    }    
      /**
     * Finds the most semantically similar topic pairs from two Maps.
     * Takes two Maps where keys are topics and values are embeddings.
     * Returns a Map where keys are topics from topicsA and values are objects containing
     * the best matching topic from topicsB and the similarity score.
     * 
     * Example response:
     * Map {
     *   "programming" => { topic: "coding", similarity: 0.87 },
     *   "music" => { topic: "songs", similarity: 0.72 },
     *   "sports" => { topic: "basketball", similarity: 0.65 },
     *   "cooking" => { topic: "recipes", similarity: 0.81 }
     * }
     */
    CrossCompareSimilarity(topicsA, topicsB)
    {
        if (!(topicsA instanceof Map) || !(topicsB instanceof Map))
        {
            throw new Error('Both inputs must be Maps');
        }

        const results = new Map();

        for (const [topicA, embeddingA] of topicsA)
        {
            let bestMatch = null;
            let bestSimilarity = -1; // Cosine similarity ranges from -1 to 1

            for (const [topicB, embeddingB] of topicsB)
            {
                const similarity = this.CalculateCosineSimilarity(embeddingA, embeddingB);
                
                if (similarity > bestSimilarity)
                {
                    bestSimilarity = similarity;
                    bestMatch = {
                        topic: topicB,
                        similarity: similarity
                    };
                }
            }

            if (bestMatch)
            {
                results.set(topicA, bestMatch);
            }
        }

        return results;
    }

    CalculateCosineSimilarity(vecA, vecB)
    {
        if (vecA.length !== vecB.length)
        {
            throw new Error('Vectors must be of the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++)
        {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] ** 2;
            normB += vecB[i] ** 2;
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0)
        {
            return 0; // Avoid division by zero
        }

        return dotProduct / (normA * normB);
    }
}