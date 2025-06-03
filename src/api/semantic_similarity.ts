import express, { Request, Response } from 'express';
import MatchmakingManager from '../managers/matchmakingManager';

const router = express.Router();

// Cache interface for embeddings
interface EmbeddingCacheEntry 
{
    topic: string;
    embedding: Float32Array;
    lastUsed: Date;
}

// In-memory cache for embeddings
const embeddingCache = new Map<string, EmbeddingCacheEntry>();

// Pruning control
let lastPruneTime = new Date();
let isPruning = false;

// Cache configuration
const CACHE_EXPIRY_MINUTES = 5;
const PRUNE_INTERVAL_MINUTES = 5;

// Convert number array to Float32Array for reduced precision and memory usage
function convertToFloat32(embedding: number[]): Float32Array 
{
    return new Float32Array(embedding);
}

// Get embedding from cache or fetch and cache it
async function getCachedEmbedding(topic: string): Promise<Float32Array> 
{
    const normalizedTopic = topic.toLowerCase().trim();
    
    // Check cache first
    const cached = embeddingCache.get(normalizedTopic);
    if (cached) 
    {
        // Update last used timestamp
        cached.lastUsed = new Date();
        return cached.embedding;
    }
    
    // Fetch from MatchmakingManager and cache
    const rawEmbedding = await MatchmakingManager.getEmbedding(topic);
    const float32Embedding = convertToFloat32(rawEmbedding);
    
    // Cache the result
    embeddingCache.set(normalizedTopic, {
        topic: normalizedTopic,
        embedding: float32Embedding,
        lastUsed: new Date()
    });
    
    // Trigger pruning if needed
    triggerPruningIfNeeded();
    
    return float32Embedding;
}

// Background pruning function
async function pruneCache(): Promise<void> 
{
    if (isPruning) 
    {
        return;
    }
    
    isPruning = true;
    
    try 
    {
        const now = new Date();
        const expiryTime = new Date(now.getTime() - (CACHE_EXPIRY_MINUTES * 60 * 1000));
        
        for (const [key, entry] of embeddingCache.entries()) 
        {
            if (entry.lastUsed < expiryTime) 
            {
                embeddingCache.delete(key);
            }
        }
        
        lastPruneTime = now;
    }
    finally 
    {
        isPruning = false;
    }
}

// Trigger pruning if enough time has passed
function triggerPruningIfNeeded(): void 
{
    const now = new Date();
    const timeSinceLastPrune = now.getTime() - lastPruneTime.getTime();
    const pruneIntervalMs = PRUNE_INTERVAL_MINUTES * 60 * 1000;
    
    if (timeSinceLastPrune >= pruneIntervalMs && !isPruning) 
    {
        pruneCache();
    }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA: Float32Array | number[], vecB: Float32Array | number[]): number 
{
    console.warn('Cosine Similarity is being ran on the server.');

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

        if (!topics || !Array.isArray(topics) || topics.length === 0) 
        {
            res.status(400);
            res.json({ 
                error: 'Topics array is required' 
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
        
        const embeddings = [];
        const failures = [];
        
        // Use the cached method
        for (const topic of cleanTopics) 
        {
            try 
            {
                const embedding = await getCachedEmbedding(topic);
                embeddings.push({
                    topic: topic,
                    embedding: Array.from(embedding)
                });
            }
            catch (error) 
            {
                failures.push({
                    topic: topic,
                    error: error instanceof Error ? error.message : 'Failed to generate embedding'
                });
            }
        }
        
        res.status(200);
        res.json({
            success: true,
            total: cleanTopics.length,
            successful: embeddings.length,
            failed: failures.length,
            embeddings: embeddings,
            failures: failures,
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
        const cleanWord2 = word2.trim();        
        
        if (!cleanWord1 || !cleanWord2) 
        {
            res.status(400);
            res.json({ 
                error: 'Words cannot be empty' 
            });
            return;
        }        
        
        // Get embeddings for both words using the cached method
        let embedding1: Float32Array;
        let embedding2: Float32Array;        
        
        try 
        {
            // Use the cached getEmbedding method
            embedding1 = await getCachedEmbedding(cleanWord1);
            embedding2 = await getCachedEmbedding(cleanWord2);
        }
        catch (embeddingError) 
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
        
        res.status(200);

        res.json({
            word1: cleanWord1,
            word2: cleanWord2,
            similarity: similarity,
            similarityPercentage: similarityPercentage,
            embeddingDimensions: embedding1.length,
            timestamp: new Date().toISOString()
        });
    }    
    catch (error)
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
