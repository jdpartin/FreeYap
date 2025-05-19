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

    /**
     * Executes a database function in the relational database.
     * @param {string} functionName - The name of the database function to execute.
     * @param {object} params - The parameters to pass to the database function.
     * @returns {Promise<object>} - The result of the database function execution.
     */
    async executeStoredProcedure(functionName, params)
    {
        try
        {
            await this.#connectToRelationalDatabase();

            // Ensure parameters are passed as a single object with correct keys
            const { data, error } = await this.supabase.rpc(functionName, params);
            if (error)
            {
                throw new Error(`Error executing database function ${functionName}: ${error.message}`);
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

    /**
     * Executes a stored procedure in the relational database.
     * @param {string} procedureName - The name of the stored procedure to execute.
     * @param {object} params - The parameters to pass to the stored procedure.
     * @returns {Promise<object>} - The result of the stored procedure execution.
     */
    async executeStoredProcedure_NOTWORKING(procedureName, params)
    {
        try
        {
            await this.#connectToRelationalDatabase();

            // Use Supabase's postgres.rpc method to call the stored procedure
            const { data, error } = await this.supabase.postgres.rpc(procedureName, params);
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

    /**
     * Inserts a single vector into the vector database.
     * @param {string} collectionName - The name of the collection in the vector database.
     * @param {Array<number>} vector - The numerical representation of the data.
     * @param {object} metadata - Additional information associated with the vector.
     * @returns {Promise<object>} - The response from the vector database.
     */
    async insertVector(collectionName, vector, metadata)
    {
        try
        {
            // Use Qdrant client for inserting vectors
            const response = await this.vectorDbClient.upsert(collectionName, {
                points: [
                    {
                        vector,
                        payload: metadata
                    }
                ]
            });

            if (!response || response.status !== 'ok')
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

    /**
     * Inserts multiple vectors into the vector database in a batch.
     * @param {string} collectionName - The name of the collection in the vector database.
     * @param {Array<{vector: Array<number>, metadata: object}>} vectors - An array of objects containing vectors and their associated metadata.
     * @returns {Promise<object>} - The response from the vector database.
     */
    async vectorBatchInsert(collectionName, vectors)
    {
        try
        {
            // Prepare points for batch insertion
            const points = vectors.map(({ vector, metadata }) => ({ vector, payload: metadata }));

            // Use Qdrant client for batch inserting vectors
            const response = await this.vectorDbClient.upsert(collectionName, { points });

            if (!response || response.status !== 'ok')
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

    /**
     * Searches for similar vectors in the vector database.
     * @param {string} collectionName - The name of the collection in the vector database.
     * @param {Array<number>} queryVector - The vector to search for similar items.
     * @param {number} topK - The number of top similar results to return.
     * @returns {Promise<Array<object>>} - The search results from the vector database.
     */
    async searchVector(collectionName, queryVector, topK)
    {
        try
        {
            // Use Qdrant client for vector search
            const response = await this.vectorDbClient.search(collectionName, {
                vector: queryVector,
                limit: topK
            });

            if (!response || !response.result)
            {
                throw new Error(`Error searching vectors in ${collectionName}: No results returned.`);
            }

            return response.result;
        }
        catch (err)
        {
            console.error(`Error searching vectors in ${collectionName}:`, err);
            throw err;
        }
    }

    /**
     * Performs a batch search for multiple terms in the vector database.
     * @param {Array<string>} terms - The terms to search for matches.
     * @param {number} topK - The number of top results to return for each term.
     * @returns {Promise<Array<{term: string, matches: Array<object>}>>} - The search results for each term.
     */
    async searchVectorBatch(terms, topK = 10)
    {
        const collectionName = 'your_collection_name'; // Centralized collection name

        try
        {
            const points = terms.map(term => ({ term }));

            const response = await this.vectorDbClient.search(collectionName, {
                vectors: points,
                limit: topK
            });

            if (!response || !response.result)
            {
                throw new Error(`Error performing batch search in ${collectionName}: No results returned.`);
            }

            return response.result.map((res, index) => ({
                term: terms[index],
                matches: res
            }));
        }
        catch (err)
        {
            console.error(`Error performing batch search in ${collectionName}:`, err);
            throw err;
        }
    }

    /**
     * Deletes a vector from the vector database.
     * @param {string} collectionName - The name of the collection in the vector database.
     * @param {string} vectorId - The unique identifier of the vector to delete.
     * @returns {Promise<object>} - The response from the vector database.
     */
    async deleteVector(collectionName, vectorId)
    {
        try
        {
            // Use Qdrant client for deleting vectors
            const response = await this.vectorDbClient.delete(collectionName, {
                points: [vectorId]
            });

            if (!response || response.status !== 'ok')
            {
                throw new Error(`Error deleting vector from ${collectionName}: ${response.status}`);
            }

            return response;
        }
        catch (err)
        {
            console.error(`Error deleting vector from ${collectionName}:`, err);
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
