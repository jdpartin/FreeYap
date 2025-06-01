import express, { Request, Response } from 'express';
import MatchmakingManager from '../managers/matchmakingManager';

const router = express.Router();

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number 
{
    if (vecA.length !== vecB.length) 
    {
        throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) 
    {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) 
    {
        return 0; // If either vector is zero, similarity is 0
    }

    return dotProduct / (normA * normB);
}

// Bulk endpoint to get embeddings for multiple topics
router.post('/bulk-embeddings', async (req: Request, res: Response) =>
{
    try
    {
        const { topics } = req.body;

        if (!topics || !Array.isArray(topics)) 
        {
            res.status(400);
            res.json({ 
                error: 'Topics array is required' 
            });
            return;
        }

        if (topics.length === 0) 
        {
            res.status(400);
            res.json({ 
                error: 'Topics array cannot be empty' 
            });
            return;
        }

        if (topics.length > 100) 
        {
            res.status(400);
            res.json({ 
                error: 'Maximum 100 topics allowed per request' 
            });
            return;
        }

        // Clean and validate topics
        const cleanTopics = topics.map(topic => typeof topic === 'string' ? topic.trim() : '').filter(topic => topic.length > 0);

        if (cleanTopics.length === 0) 
        {
            res.status(400);
            res.json({ 
                error: 'No valid topics provided' 
            });
            return;
        }        
          console.log(`Getting bulk embeddings for ${cleanTopics.length} topics:`, cleanTopics);

        // Use the new bulk embeddings method from MatchmakingManager
        const bulkResults = await MatchmakingManager.getBulkEmbeddings(cleanTopics);
        console.log('Bulk results from database:', bulkResults);
        
        const successful = bulkResults.filter(result => result.found && result.embedding);
        const missing = bulkResults.filter(result => !result.found);
          console.log(`Found ${successful.length} in cache, ${missing.length} missing`);

        // Start with cached embeddings
        const allSuccessful = successful.map(result => ({
            topic: result.topic,
            embedding: result.embedding
        }));
        const failed = [];
        
        // For missing topics, generate embeddings on demand and add directly to results
        for (const missingTopic of missing) {
            try {
                console.log(`Generating embedding for missing topic: ${missingTopic.topic}`);
                const embedding = await MatchmakingManager.getEmbedding(missingTopic.topic);
                console.log(`Generated embedding for ${missingTopic.topic}, length: ${embedding.length}`);
                allSuccessful.push({
                    topic: missingTopic.topic,
                    embedding: embedding
                });
            } catch (error) {
                console.error(`Failed to generate embedding for ${missingTopic.topic}:`, error);
                failed.push({
                    topic: missingTopic.topic,
                    error: error instanceof Error ? error.message : 'Failed to generate embedding'
                });
            }
        }
        
        console.log(`Bulk embedding results: ${allSuccessful.length} successful, ${failed.length} failed`);
        console.log('All successful embeddings:', allSuccessful.map(e => ({ topic: e.topic, embeddingLength: e.embedding?.length })));
        
        res.status(200);
        res.json({
            success: true,
            total: cleanTopics.length,
            successful: allSuccessful.length,
            failed: failed.length,
            embeddings: allSuccessful,
            failures: failed,
            timestamp: new Date().toISOString()
        });
    }
    catch (error)
    {
        console.error('Error in /bulk-embeddings:', error);
        res.status(500);
        res.json({ 
            error: 'Failed to process bulk embeddings',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

router.post('/compare-similarity', async (req: Request, res: Response) =>
{
    try
    {
        const { word1, word2 } = req.body;

        if (!word1 || !word2) 
        {
            res.status(400);
            res.json({ 
                error: 'Both word1 and word2 are required' 
            });
            return;
        }

        // Trim and validate inputs
        const cleanWord1 = word1.trim();
        const cleanWord2 = word2.trim();        if (!cleanWord1 || !cleanWord2) 
        {
            res.status(400);
            res.json({ 
                error: 'Words cannot be empty' 
            });
            return;
        }

        console.log(`Comparing semantic similarity: "${cleanWord1}" vs "${cleanWord2}"`);

        // Get embeddings for both words using the MatchmakingManager's private method
        // We'll create a public method for this
        let embedding1: number[];
        let embedding2: number[];        try 
        {
            // Use the public getEmbedding method
            embedding1 = await MatchmakingManager.getEmbedding(cleanWord1);
            embedding2 = await MatchmakingManager.getEmbedding(cleanWord2);
        }        catch (embeddingError) 
        {
            console.error('Error getting embeddings:', embeddingError);
            res.status(500);
            res.json({ 
                error: 'Failed to generate embeddings for the provided words',
                details: embeddingError instanceof Error ? embeddingError.message : 'Unknown error'
            });
            return;
        }

        // Calculate cosine similarity
        const similarity = cosineSimilarity(embedding1, embedding2);

        // Convert to percentage and round to 2 decimal places
        const similarityPercentage = Math.round(similarity * 10000) / 100;

        console.log(`Similarity score: ${similarity} (${similarityPercentage}%)`);        res.status(200);
        res.json({
            word1: cleanWord1,
            word2: cleanWord2,
            similarity: similarity,
            similarityPercentage: similarityPercentage,
            embeddingDimensions: embedding1.length,
            timestamp: new Date().toISOString()
        });
    }    catch (error)
    {
        console.error('Error in /compare-similarity:', error);
        res.status(500);
        res.json({ 
            error: 'Failed to compare semantic similarity',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
