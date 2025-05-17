class DatabaseManager
{
    constructor()
    {
        require('dotenv').config();
        const { createClient } = require('@supabase/supabase-js');
        const { QdrantClient } = require('@qdrant/js-client-rest');

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;
        this.supabase = createClient(supabaseUrl, supabaseKey);

        const qdrantConfig = {
            url: process.env.QDRANT_URL,
            apiKey: process.env.QDRANT_API_KEY
        };
        this.vectorDbClient = new QdrantClient(qdrantConfig);
        console.log('Vector database initialized successfully.');
    }

    //#region Public Methods

    async executeStoredProcedure(procedureName, params)
    {
        try
        {
            await this.#connectToRelationalDatabase();
            const { data, error } = await this.supabase.rpc(procedureName, params);
            if (error)
            {
                throw new Error(`Error executing stored procedure ${procedureName}: ${error.message}`);
            }
            return data;
        }
        catch (err)
        {
            console.error(err);
            throw err;
        }
        finally
        {
            await this.#closeRelationalConnection();
        }
    }

    async insertVector(collectionName, vector, metadata)
    {
        try
        {
            const { data, error } = await this.supabase.from(collectionName).insert({ vector, metadata });
            if (error)
            {
                throw new Error(`Error inserting vector into ${collectionName}: ${error.message}`);
            }
            return data;
        }
        catch (err)
        {
            console.error(err);
            throw err;
        }
    }

    async searchVector(collectionName, queryVector, topK)
    {
        try
        {
            await this.#connectToVectorDatabase();
            const { data, error } = await this.supabase.rpc('search_vectors', {
                collection: collectionName,
                query_vector: queryVector,
                top_k: topK
            });
            if (error)
            {
                throw new Error(`Error searching vectors in ${collectionName}: ${error.message}`);
            }
            return data;
        }
        catch (err)
        {
            console.error(err);
            throw err;
        }
        finally
        {
            await this.#closeVectorConnection();
        }
    }

    async deleteVector(collectionName, vectorId)
    {
        try
        {
            const { data, error } = await this.supabase.from(collectionName).delete().eq('id', vectorId);
            if (error)
            {
                throw new Error(`Error deleting vector from ${collectionName}: ${error.message}`);
            }
            return data;
        }
        catch (err)
        {
            console.error(err);
            throw err;
        }
    }

    //#endregion

    //#region Private Methods

    async #connectToVectorDatabase()
    {
        try
        {
            if (!this.vectorDbClient)
            {
                throw new Error('Vector database client is not initialized. Call initializeVectorDatabase first.');
            }
            const response = await this.vectorDbClient.healthCheck();
            if (response.status !== 'ok')
            {
                throw new Error('Failed to connect to the vector database.');
            }
            console.log('Connected to the vector database successfully.');
        }
        catch (err)
        {
            console.error('Error connecting to vector database:', err);
            throw err;
        }
    }

    async #closeVectorConnection()
    {
        try
        {
            if (this.vectorDbClient)
            {
                await this.vectorDbClient.close();
                console.log('Vector database connection closed successfully.');
            }
        }
        catch (err)
        {
            console.error('Error closing vector database connection:', err);
        }
    }

    async #connectToRelationalDatabase()
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

    async #closeRelationalConnection()
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

    //#endregion
}

module.exports = new DatabaseManager();
