import DatabaseManager from '../managers/databaseManager';
import io from 'socket.io';

// Matchmaking preference
// Users with topics (Topic Users): Matched Topic Users > Random Topic Users > Mismatched Topic Users (Only when delayed)
// Users with no topic (Random Users): Delayed Topic Users > Random Topic Users (Only when delayed)
// NEVER MATCH: Random Topic Users with Un-delayed Topic Users

interface UserQueueInfo
{
    socket_id: string;
    topics: string[];
    inserted_at: string;
}

interface EmbeddingResponse
{
    embedding: number[];
}

interface MatchmakingOptions {
    mode?: string;
    filters?: string[];
}

class MatchmakingManager
{

    private static socketIo: io.Server;

    static initialize(socketIo: io.Server): void
    {
        this.socketIo = socketIo;
    }

    static async JoinQueue(socketId: string, topics: string[], mode: string, options: MatchmakingOptions = {}): Promise<void>
    {
        await this.#initialMatchmaking(socketId, topics, mode);
    }    
    
    static async PerformDelayedMatchmaking(socketId: string, topics: string[], mode: string, options: MatchmakingOptions = {}): Promise<any>
    {
        const queueInfo = await db.executeFunction('get_and_delete_queue_entry', { socketId: socketId as unknown as 'UUID' }) as UserQueueInfo[];

        const matchmakingResult = await this.#delayedMatchmaking(socketId, topics, mode);

        if (!matchmakingResult)
        {
            if (queueInfo && queueInfo.length > 0)
            {
                const queuedUser = queueInfo[0];

                if (!queuedUser.topics)
                {
                    queuedUser.topics = [];
                }

                // Map snake_case to camelCase
                const mappedUser = {
                    socketId: queuedUser.socket_id,
                    topics: queuedUser.topics,
                    insertedAt: queuedUser.inserted_at
                };

                db.executeStoredProcedure('add_back_to_queue', {
                    socket_id: mappedUser.socketId,
                    topics: JSON.stringify(mappedUser.topics), // Convert topics to JSONB array
                    has_topics: mappedUser.topics.length > 0,
                    inserted_at: mappedUser.insertedAt,
                    mode: mode
                });
            }
        }
        
        return matchmakingResult;
    }

    static async LeaveQueue(socketId: string): Promise<void>
    {
        await this.#removeFromQueue(socketId);
    }

    // Public method to get embeddings for semantic similarity comparison
    static async getEmbedding(topic: string): Promise<number[]>
    {
        return await this.#getEmbedding(topic);
    }

    // Public method to get bulk embeddings with missing topic identification
    static async getBulkEmbeddings(topics: string[]): Promise<{ topic: string; embedding: number[] | null; found: boolean }[]>
    {
        if (!topics || topics.length === 0) 
        {
            return [];
        }

        try 
        {
            // Use the new stored procedure to get bulk embeddings
            const results = await db.executeFunction('get_bulk_topic_embeddings', { topics_array: topics }) as { topic: string; embedding: number[] | null; found: boolean }[];
            
            // For topics that weren't found, we could optionally generate embeddings here
            // But for now, we'll just return the results as-is
            return results;
        } 
        catch (error) 
        {
            console.error('Error getting bulk embeddings:', error);
            throw error;
        }
    }

    //#region Private Methods

    static mapToCamelCase(userQueueInfo: UserQueueInfo): { socketId: string; topics: string[]; insertedAt: string }
    {
        return {
            socketId: userQueueInfo.socket_id,
            topics: userQueueInfo.topics,
            insertedAt: userQueueInfo.inserted_at
        };
    }

    static async #initialMatchmaking(socketId: string, topics: string[], mode: string): Promise<void>
    {
        if (!socketId || !mode)
        {
            throw new Error('Invalid parameters for matchmaking. SocketId and mode are required.');
        }

        if (topics && topics.length > 0) // User has topics
        {
            this.saveTopicUsage(topics); // for popularity and reporting

            const bestMatch = await this.getBestTopicMatch(socketId, topics, mode);

            if (bestMatch && bestMatch.length > 0)
            {
                const mappedMatch = this.mapToCamelCase(bestMatch[0]);
                await this.#triggerConnection(socketId, mappedMatch.socketId);
                return;
            }
        }
        else // Random topic user
        {
            const result = (await db.executeFunction('get_oldest_delayed_term_user', {mode})) as { get_oldest_delayed_term_user: string | null }[];
            
            if (result && result.length > 0)
            {
                const delayedMatchSocketId = result[0].get_oldest_delayed_term_user;
                
                if (delayedMatchSocketId)
                {
                    await this.#triggerConnection(socketId, delayedMatchSocketId);
                    return;
                }
            }
        }

        await this.#addToQueue(socketId, topics, mode);
    }    static async getBestTopicMatch(socketId: string, topics: string[], mode: string): Promise<UserQueueInfo[]>
    {
        const matchingTopics = await this.#getMatchingTopics(topics, mode);

        if (matchingTopics && matchingTopics.length > 0)
        {
            return (await db.executeFunction('get_queued_user_with_most_matches',
            {
                matchedTopics: matchingTopics,
                mode: mode
            })) as UserQueueInfo[];
        }

        return [];
    }    
    
    static async saveTopicUsage(topics: string[]): Promise<void>
    {
        db.executeStoredProcedure('bulk_insert_topic_history', { topicArray: topics as unknown as 'TEXT[]' });
    }    
    
    static async #getMatchingTopics(topics: string[], mode: string): Promise<string[]>
    {
        if (topics && topics.length > 0)
        {
            const threshold = 0.8;

            const results = await db.searchVectorBatch(topics, mode, 1000);

            const matchedTopics = results.flatMap((result: any) =>
                result.matches
                    .filter((match: any) => match.score >= threshold)
                    .map((match: any) => {
                        return match.payload?.topic || match.topic;
                    })
                    .filter((topic: any) => topic !== undefined) // Remove undefined values
            );

            return [...new Set(matchedTopics)]; // Remove duplicates
        }

        return [];
    }
    
    static async #triggerConnection(socketId: string, matchedSocketId: string): Promise<void>
    {
        try
        {            console.log(`Triggering connection between ${socketId} and ${matchedSocketId}`);

            // delete both from queue - await these since they're now async
            await this.#removeFromQueue(socketId);
            await this.#removeFromQueue(matchedSocketId);

            // Emit match-found to both users, with one designated as initiator
            this.socketIo.to(socketId).emit('match-found', {
                socketId: socketId,
                matchedSocketId: matchedSocketId,
                isInitiator: true
            });

            this.socketIo.to(matchedSocketId).emit('match-found', {
                socketId: matchedSocketId,
                matchedSocketId: socketId,
                isInitiator: false
            });
        }
        catch (error)
        {
            console.error('Error triggering connection:', error);
        }
    }    
    
    static async #addToQueue(socketId: string, topics: string[], mode: string): Promise<void>
    {
        if (topics && topics.length > 0)
        {
            const embeddings = await Promise.all(topics.map(topic => this.#getEmbedding(topic)));
            const vectorDataArray = topics.map((topic, index) => ({
                vector: embeddings[index],
                metadata: { socketId, topic, mode }
            }));

            db.vectorBatchInsert('topics_collection', vectorDataArray);
        }

        db.executeStoredProcedure('add_to_queue',
        {
            socket_id: socketId as unknown as 'UUID',
            topics: JSON.stringify(topics) as unknown as 'JSONB', // Convert topics to JSONB array
            mode: mode
        });
    }    
    
    static async #delayedMatchmaking(socketId: string, topics: string[], mode: string): Promise<boolean>
    {
        if (topics && topics.length > 0)
        {
            const randomTopicResult = (await db.executeFunction('get_oldest_random_topic_user', {mode})) as { get_oldest_random_topic_user: UserQueueInfo[] | null }[];

            if (randomTopicResult && randomTopicResult.length > 0 && randomTopicResult[0].get_oldest_random_topic_user)
            {
                const randomTopicUser = randomTopicResult[0].get_oldest_random_topic_user;
                if (randomTopicUser.length > 0)
                {
                    const mappedUser = this.mapToCamelCase(randomTopicUser[0]);
                    await this.#triggerConnection(socketId, mappedUser.socketId);
                    return true;
                }
            }
            
            const mismatchedTopicResult = (await db.executeFunction('get_oldest_topic_user', {mode})) as { get_oldest_topic_user: UserQueueInfo[] | null }[];

            if (mismatchedTopicResult && mismatchedTopicResult.length > 0 && mismatchedTopicResult[0].get_oldest_topic_user)
            {
                const mismatchedTopicUser = mismatchedTopicResult[0].get_oldest_topic_user;
                if (mismatchedTopicUser.length > 0)
                {
                    const mappedUser = this.mapToCamelCase(mismatchedTopicUser[0]);
                    await this.#triggerConnection(socketId, mappedUser.socketId);
                    return true;
                }
            }
        }        
        else
        {
            const randomTopicResult = (await db.executeFunction('get_oldest_random_topic_user', {mode})) as { get_oldest_random_topic_user: string | null }[];

            if (randomTopicResult && randomTopicResult.length > 0 && randomTopicResult[0].get_oldest_random_topic_user)
            {
                const matchedSocketId = randomTopicResult[0].get_oldest_random_topic_user;
                
                await this.#triggerConnection(socketId, matchedSocketId);
                return true;
            }
        }

        return false;
    }    
    
    static async #removeFromQueue(socketId: string): Promise<void>
    {
        db.executeStoredProcedure('remove_from_queue', { socketId });
        db.deleteVectorsBySocketId('topics_collection', socketId);
    }
    
    static async #getEmbedding(topic: string): Promise<number[]>
    {
        const existingEmbedding = (await db.executeFunction('get_topic_embedding', { topicText: topic })) as EmbeddingResponse[];

        if (existingEmbedding && existingEmbedding.length > 0 && existingEmbedding[0].embedding)
        {
            return existingEmbedding[0].embedding;
        }

        const { OpenAI } = require('openai');
        const openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const response = await openaiClient.embeddings.create({
            model: 'text-embedding-ada-002',
            input: topic
        });

        if (!response || !response.data || !response.data[0] || !response.data[0].embedding)
        {
            throw new Error('Failed to fetch embedding from OpenAI API.');
        }

        const embedding = response.data[0].embedding;

        db.executeStoredProcedure('save_topic_embedding', { topicText: topic, topicEmbedding: embedding });

        return embedding;
    }
}

const db = new DatabaseManager();

export default MatchmakingManager;