const db = require('../managers/databaseManager');

class Matchmaking
{
    //#region Properties

    
    static #work_queue = [];
    static #worker_running = false;


    //#endregion

    //#region Public Methods


    static async JoinQueue(sessionId)
    {
        try
        {
            await db.executeStoredProcedure('JoinQueue', { sessionId });
            await this.#enqueueWork(sessionId);
        }
        catch (error)
        {
            console.error('Error in JoinQueue:', error);
            throw error;
        }
    }

    static async LeaveQueue(sessionId)
    {
        try
        {
            // Call the leave queue procedure in the database
            await db.executeStoredProcedure('LeaveQueue', { sessionId });

            // Check if the sessionId is in the work queue and remove it
            const index = this.#work_queue.indexOf(sessionId);
            if (index !== -1)
            {
                this.#work_queue.splice(index, 1);
            }
        }
        catch (error)
        {
            console.error('Error in LeaveQueue:', error);
            throw error;
        }
    }


    //#endregion

    //#region Private Methods


    static async #enqueueWork(sessionId)
    {
        if (this.#work_queue.includes(sessionId))
        {
            return;
        }

        this.#work_queue.push(sessionId);

        if (!this.#worker_running)
        {
            this.#worker_running = true;

            try
            {
                await this.#queueWorker();
            }
            catch (error)
            {
                console.error('Error in #queueWorker:', error);
            }
            finally
            {
                this.#worker_running = false;
            }
        }
    }

    static async #queueWorker()
    {
        for (const sessionId of this.#work_queue)
        {
            try
            {
                var foundMatch;

                if (this.#userHasTopics(sessionId))
                {
                    const user_topics_with_similarity_scores = await db.searchVector('topics_collection', { sessionId }, 1000);

                    if (this.#areSemanticallySimilar(user_topics_with_similarity_scores))
                    {
                        var semanticSimilarityThreshold = 0.6;
                        
                        var averagedEmbedding = await this.#getAveragedEmbedding(user_topics_with_similarity_scores);
                        var semanticallySimilarTopicsFromQueueWithScores = await this.#getSemanticallySimilarTopicsFromQueueForEmbedding(averagedEmbedding, semanticSimilarityThreshold);

                        if (semanticallySimilarTopicsFromQueueWithScores.length > 0)
                        {
                            var canIgnorePolarity = await this.#hasCategory(user_topics_with_similarity_scores) || await this.#hasPolarizedTopics(user_topics_with_similarity_scores);

                            foundMatch = await this.#getBestMatchFromQueue(semanticallySimilarTopicsFromQueueWithScores, canIgnorePolarity);
                        }
                    }
                    else
                    {
                        var semanticSimilarityThreshold = 0.8;

                        var semanticallySimilarTopicsFromQueue = [];

                        for (const topic of user_topics_with_similarity_scores)
                        {
                            var semanticallySimilarTopicsFromQueueWithScores = await this.#getSemanticallySimilarTopicsFromQueueForTopics(topic, semanticSimilarityThreshold);

                            for (const similarTopic of semanticallySimilarTopicsFromQueueWithScores)
                            {
                                if (!semanticallySimilarTopicsFromQueue.some(t => t.id === similarTopic.id))
                                {
                                    semanticallySimilarTopicsFromQueue.push(similarTopic);
                                }
                            }
                        }

                        foundMatch = await this.#getBestMatchFromQueue(semanticallySimilarTopicsFromQueueWithScores, ignorePolarity = false);
                    }
                }
                else // Random chat users
                {
                    foundMatch = await this.#getOldestDelayedUser();
                }

                if (foundMatch)
                {
                    this.#notifyMatches(sessionId, foundMatch);
                }
            }
            catch (error)
            {
                console.error(`Error processing sessionId ${sessionId}:`, error);
            }
        }
    }


    //#region queueWorker Sub Methods


    static async #userHasTopics(sessionId)
    {

    }

    static async #areSemanticallySimilar(topics_with_similarity_scores)
    {
        return topics_with_similarity_scores.every(result => result.score > 0.6);
    }

    static async #hasPolarizedTopics(topics_with_similarity_scores)
    {
        // we will need to search the relational database to see if this is pre-calculated
        // otherwise enter it into a queue to be calculated by AI

        // we will go one by one cross matching each topic against the others
    }

    static async #hasSamePolarity(topic, similarTopic)
    {

    }

    static async #getAveragedEmbedding(topics_with_similarity_scores)
    {
        // we will need to query the vector database for the embedding of each topic
        // then we will average the embedding
    }

    static async #hasCategory(topics_with_similarity_scores)
    {
        // we will need to search the relational database to see if this is pre-calculated
        // otherwise enter it into a queue to be calculated by AI

        // This checks if any topic is a category
    }

    static async #getSemanticallySimilarTopicsFromQueueForTopics(topics, semanticSimilarityThreshold)
    {
        
    }

    static async #getSemanticallySimilarTopicsFromQueueForEmbedding(embedding, semanticSimilarityThreshold)
    {
        
    }

    static async #getBestMatchFromQueue(topics_with_similarity_scores, ignorePolarity)
    {
        // consider the similarity score
        // consider the number of matching topics
    }

    static async #notifyMatches(sessionId, foundMatch)
    {
        
    }

    static async #getOldestDelayedUser()
    {
        
    }


    //#endregion


    //#endregion
}

module.exports = Matchmaking;