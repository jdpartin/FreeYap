import { QdrantClient } from '@qdrant/js-client-rest';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

class DatabaseManager
{
    private vectorDbClient: QdrantClient;
    private pool: Pool;

    constructor()
    {
        require('dotenv').config();

        const qdrantConfig = {
            url: process.env.QDRANT_URL || '',
            apiKey: process.env.QDRANT_API_KEY || ''
        };
        this.vectorDbClient = new QdrantClient(qdrantConfig);

        this.pool = new Pool({
            connectionString: process.env.RENDER_DATABASE_URL,
            user: process.env.RENDER_DATABASE_USER,
            password: process.env.RENDER_DATABASE_PASSWORD,
            database: process.env.RENDER_DATABASE_NAME,
            ssl: {
                rejectUnauthorized: false
            }
        });
    }

    public async executeStoredProcedure(functionName: string, params: object): Promise<any>
    {
        const placeholders = Object.keys(params).map((_, index) => `$${index + 1}`).join(', ');
        const query = `CALL public.${functionName}(${placeholders})`;
        const values = Object.values(params);
        return this.runQuery(query, values);
    }    public async insertVector(collectionName: string, vector: number[], metadata: Record<string, unknown>): Promise<any>
    {
        try
        {
            const response = await this.vectorDbClient.upsert(collectionName, {
                points: [
                    {
                        id: uuidv4(), // Use UUID for unique point IDs
                        vector,
                        payload: metadata
                    }
                ]
            });            if (!response || (response.status !== 'acknowledged' && response.status !== 'completed')) // Accept both acknowledged and completed
            {
                throw new Error(`Error inserting vector into ${collectionName}: ${response.status}`);
            }

            return response;
        }
        catch (err)
        {
            console.error(`Error inserting vector into ${collectionName}:`, err);
            throw err;
        }
    }    public async vectorBatchInsert(collectionName: string, vectors: { vector: number[]; metadata: Record<string, unknown> }[]): Promise<any>
    {
        try
        {
            const points = vectors.map(({ vector, metadata }) => ({
                id: uuidv4(), // Use UUID for unique point IDs
                vector,
                payload: metadata
            }));

            const response = await this.vectorDbClient.upsert(collectionName, { points });            if (!response || (response.status !== 'acknowledged' && response.status !== 'completed')) // Accept both acknowledged and completed
            {
                throw new Error(`Error batch inserting vectors into ${collectionName}: ${response.status}`);
            }

            return response;
        }
        catch (err)
        {
            console.error(`Error batch inserting vectors into ${collectionName}:`, err);
            throw err;
        }
    }

    public async searchVector(collectionName: string, queryVector: number[], topK: number): Promise<any[]>
    {
        try
        {
            const response = await this.vectorDbClient.search(collectionName, {
                vector: queryVector,
                limit: topK
            });

            if (!response || !Array.isArray(response)) // Adjust response validation
            {
                throw new Error(`Error searching vectors in ${collectionName}: No results returned.`);
            }

            return response; // Return the response directly
        }
        catch (err)
        {
            console.error(`Error searching vectors in ${collectionName}:`, err);
            throw err;
        }
    }    
    
    // Search for similar topics using embeddings from PostgreSQL
    public async searchVectorBatch(
        topics: string[], 
        mode?: string, 
        nudity?: boolean | null,
        gore?: boolean | null,
        topK = 10
    ): Promise<{ topic: string; matches: any[] }[]>
    {
        const collectionName = 'topics_collection';

        try
        {
            const results = await Promise.all(
                topics.map(async (topic) =>
                {                    // Get the embedding for this topic from PostgreSQL
                    const embeddingResult = await this.executeFunction('get_topic_embedding', { topicText: topic }) as { topic: string; embedding: number[] }[];
                    
                    if (!embeddingResult || embeddingResult.length === 0 || !embeddingResult[0].embedding) {
                        return { topic, matches: [] };
                    }

                    // Prepare search options with optional mode filtering
                    const searchOptions: any = {
                        vector: embeddingResult[0].embedding,
                        limit: topK
                    };                    // Build filter conditions
                    const filterConditions: any[] = [];

                    // Add mode filtering if mode is specified
                    if (mode) {
                        filterConditions.push({
                            key: 'mode',
                            match: {
                                value: mode
                            }
                        });
                    }                    
                    
                    // Add nudity filtering - null can match either, but true and false cannot match each other
                    if (nudity !== undefined) {
                        if (nudity === null) {
                            // null: can match with anything (no filter needed for null)
                            // Actually, we don't need to add any filter for null since it should match everything
                        } else if (nudity === false) {
                            // false: exclude true values (allow false and null)
                            filterConditions.push({
                                must_not: [
                                    {
                                        key: 'nudity',
                                        match: {
                                            value: true
                                        }
                                    }
                                ]
                            });
                        } else if (nudity === true) {
                            // true: exclude false values (allow true and null)
                            filterConditions.push({
                                must_not: [
                                    {
                                        key: 'nudity',
                                        match: {
                                            value: false
                                        }
                                    }
                                ]
                            });
                        }
                    }                    // Add gore filtering - null can match either, but true and false cannot match each other
                    if (gore !== undefined) {
                        if (gore === null) {
                            // null: can match with anything (no filter needed for null)
                            // Actually, we don't need to add any filter for null since it should match everything
                        } else if (gore === false) {
                            // false: exclude true values (allow false and null)
                            filterConditions.push({
                                must_not: [
                                    {
                                        key: 'gore',
                                        match: {
                                            value: true
                                        }
                                    }
                                ]
                            });
                        } else if (gore === true) {
                            // true: exclude false values (allow true and null)
                            filterConditions.push({
                                must_not: [
                                    {
                                        key: 'gore',
                                        match: {
                                            value: false
                                        }
                                    }
                                ]
                            });
                        }
                    }

                    // Apply filters if any conditions exist
                    if (filterConditions.length > 0) {
                        searchOptions.filter = {
                            must: filterConditions
                        };
                    }

                    const response = await this.vectorDbClient.search(collectionName, searchOptions);

                    if (!response || !Array.isArray(response))
                    {
                        throw new Error(`Error searching vector for topic ${topic} in ${collectionName}: No results returned.`);
                    }

                    return { topic, matches: response };
                })
            );

            return results;
        }
        catch (err)
        {
            console.error(`Error performing batch search in ${collectionName}:`, err);
            throw err;
        }
    }

    public async runQuery(query: string, params: any[] = []): Promise<any>
    {
        try
        {
            const result = await this.pool.query(query, params);
            return result.rows;
        }
        catch (err)
        {
            console.error('Error running query:', err);
            throw err;
        }
    }

    private async connectToRelationalDatabase(): Promise<void>
    {
        try
        {
            
        }
        catch (err)
        {
            console.error('Error connecting to relational database:', err);
            throw err;
        }
    }

    private async closeRelationalConnection(): Promise<void>
    {
        try
        {
            
        }
        catch (err)
        {
            console.error('Error closing relational database connection:', err);
        }
    }

    public async executeFunction(functionName: string, params: object): Promise<any>
    {
        const placeholders = Object.keys(params).map((_, index) => `$${index + 1}`).join(', ');
        const query = `SELECT * FROM public.${functionName}(${placeholders})`;
        const values = Object.values(params);
        return this.runQuery(query, values);
    }

    /**
     * Get a client from the connection pool
     * @returns A client from the pool that must be released after use
     */
    public async getClient()
    {
        return await this.pool.connect();
    }

    /**
     * Returns the singleton instance of DatabaseManager
     * @returns The singleton instance of DatabaseManager
     */
    public static getInstance(): DatabaseManager
    {
        if (!DatabaseManager.instance)
        {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    private static instance: DatabaseManager;

    public async deleteVectorsBySocketId(collectionName: string, socketId: string): Promise<any>
    {
        try
        {
            const response = await this.vectorDbClient.delete(collectionName, {
                filter: {
                    must: [
                        {
                            key: 'socketId',
                            match: {
                                value: socketId
                            }
                        }
                    ]
                }
            });

            if (!response || (response.status !== 'acknowledged' && response.status !== 'completed'))
            {
                console.warn(`Warning: Vector deletion response status: ${response?.status || 'unknown'}`);
            }

            return response;
        }
        catch (err)
        {
            console.error(`Error deleting vectors for socketId ${socketId} from ${collectionName}:`, err);
            throw err;
        }
    }
}

export default DatabaseManager;
