import { QdrantClient } from '@qdrant/js-client-rest';
const { Pool } = require('pg');

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
        console.log('Vector database initialized successfully.');

        this.pool = new Pool({
            connectionString: process.env.RENDER_DATABASE_URL,
            user: process.env.RENDER_DATABASE_USER,
            password: process.env.RENDER_DATABASE_PASSWORD,
            database: process.env.RENDER_DATABASE_NAME
        });
    }

    public async executeStoredProcedure(functionName: string, params: object): Promise<any>
    {
        // New implementation using runQuery
        const query = `CALL ${functionName}(${Object.values(params).map(() => '?').join(', ')})`;
        return this.runQuery(query);
    }

    public async insertVector(collectionName: string, vector: number[], metadata: Record<string, unknown>): Promise<any>
    {
        try
        {
            const response = await this.vectorDbClient.upsert(collectionName, {
                points: [
                    {
                        id: Date.now().toString(), // Add unique ID for each point
                        vector,
                        payload: metadata
                    }
                ]
            });

            if (!response || response.status !== 'acknowledged') // Update status comparison
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
    }

    public async vectorBatchInsert(collectionName: string, vectors: { vector: number[]; metadata: Record<string, unknown> }[]): Promise<any>
    {
        try
        {
            const points = vectors.map(({ vector, metadata }) => ({
                id: Date.now().toString(), // Add unique ID for each point
                vector,
                payload: metadata
            }));

            const response = await this.vectorDbClient.upsert(collectionName, { points });

            if (!response || response.status !== 'acknowledged') // Update status comparison
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

    // Refactor searchVectorBatch to handle individual searches
    public async searchVectorBatch(terms: string[], topK = 10): Promise<{ term: string; matches: any[] }[]>
    {
        const collectionName = 'your_collection_name';

        try
        {
            const results = await Promise.all(
                terms.map(async (term) =>
                {
                    const response = await this.vectorDbClient.search(collectionName, {
                        vector: [0], // Placeholder vector for the term
                        limit: topK
                    });

                    if (!response || !Array.isArray(response))
                    {
                        throw new Error(`Error searching vector for term ${term} in ${collectionName}: No results returned.`);
                    }

                    return { term, matches: response };
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

    public async runQuery(query: string): Promise<any>
    {
        try
        {
            await this.connectToRelationalDatabase();

            const { data, error } = await this.supabase.rpc('public.run_query', { query });
            if (error)
            {
                throw new Error(`Error executing query: ${error.message}`);
            }
            return data;
        }
        catch (err)
        {
            console.error('Error running query:', err);
            throw err;
        }
        finally
        {
            await this.closeRelationalConnection();
        }
    }

    private async connectToRelationalDatabase(): Promise<void>
    {
        try
        {
            console.log('Connected to the relational database successfully.');
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
            console.log('Relational database connection closed successfully.');
        }
        catch (err)
        {
            console.error('Error closing relational database connection:', err);
        }
    }
}

export default DatabaseManager;
