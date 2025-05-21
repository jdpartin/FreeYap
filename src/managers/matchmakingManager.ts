import DatabaseManager from '../managers/databaseManager';
import { webRTCServerManager } from '../index';
import axios from 'axios';

// Matchmaking preference
// Users with topics (Topic Users): Matched Topic Users > Random Topic Users > Mismatched Topic Users (Only when delayed)
// Users with no topic (Random Users): Delayed Topic Users > Random Topic Users (Only when delayed)
// NEVER MATCH: Random Topic Users with Un-delayed Topic Users

interface UserQueueInfo
{
    session_id: string;
    topics: string[];
    inserted_at: string;
}

interface EmbeddingResponse
{
    embedding: number[];
}

class MatchmakingManager
{
    static async JoinQueue(sessionId: string, topics: string[]): Promise<void>
    {
        await this.#initialMatchmaking(sessionId, topics);
    }

    static async PerformDelayedMatchmaking(sessionId: string, topics: string[]): Promise<void>
    {
        const queueInfoPromise = db.executeFunction('get_and_delete_queue_entry', { sessionId: sessionId as unknown as 'UUID' }) as Promise<UserQueueInfo[]>;

        const matchmakingResult = await this.#delayedMatchmaking(sessionId, topics);

        if (!matchmakingResult)
        {
            const queueInfo = await queueInfoPromise;

            if (queueInfo && queueInfo.length > 0)
            {
                const queuedUser = queueInfo[0];

                // Map snake_case to camelCase
                const mappedUser = {
                    sessionId: queuedUser.session_id,
                    topics: queuedUser.topics,
                    insertedAt: queuedUser.inserted_at
                };

                db.executeStoredProcedure('add_back_to_queue', {
                    sessionId: mappedUser.sessionId,
                    topics: JSON.stringify(mappedUser.topics), // Convert topics to JSONB array
                    insertedAt: mappedUser.insertedAt
                });
            }
        }
    }

    static async LeaveQueue(sessionId: string): Promise<void>
    {
        await this.#removeFromQueue(sessionId);
    }

    //#region Private Methods

    static mapToCamelCase(userQueueInfo: UserQueueInfo): { sessionId: string; topics: string[]; insertedAt: string }
    {
        return {
            sessionId: userQueueInfo.session_id,
            topics: userQueueInfo.topics,
            insertedAt: userQueueInfo.inserted_at
        };
    }

    static async #initialMatchmaking(sessionId: string, topics: string[]): Promise<void>
    {
        if (topics && topics.length > 0)
        {
            const bestMatch = await this.getBestTopicMatch(sessionId, topics);

            if (bestMatch && bestMatch.length > 0)
            {
                const mappedMatch = this.mapToCamelCase(bestMatch[0]);
                await this.#triggerConnection(sessionId, mappedMatch.sessionId);
                return;
            }
        }
        else
        {
            const result = (await db.executeFunction('get_oldest_delayed_term_user', {})) as { get_oldest_delayed_term_user: string | null }[];
            const delayedMatchSessionId = result[0].get_oldest_delayed_term_user;

            if (delayedMatchSessionId)
            {
                await this.#triggerConnection(sessionId, delayedMatchSessionId);
                return;
            }
        }

        await this.#addToQueue(sessionId, topics);
    }

    static async getBestTopicMatch(sessionId: string, topics: string[]): Promise<UserQueueInfo[]>
    {
        const matchingTopics = await this.#getMatchingTopics(topics);

        if (matchingTopics && matchingTopics.length > 0)
        {
            return (await db.executeFunction('get_queued_user_with_most_matches', {
                matchedTopics: matchingTopics
            })) as UserQueueInfo[];
        }

        return [];
    }

    static async #getMatchingTopics(topics: string[]): Promise<string[]>
    {
        if (topics && topics.length > 0)
        {
            const threshold = 0.9;

            const results = await db.searchVectorBatch(topics, 1000);

            const matchedTopics = results.flatMap((result: any) =>
                result.matches.filter((match: any) => match.score >= threshold).map((match: any) => match.topic)
            );

            return [...new Set(matchedTopics)]; // Remove duplicates
        }

        return [];
    }

    static async #triggerConnection(sessionId: string, matchedSessionId: string): Promise<void>
    {
        const roomId = `${sessionId}-${matchedSessionId}`;

        try {
            await axios.post(`http://localhost:${process.env.PORT || 3000}/api/webrtc/join-room`, {
                roomId,
                sessionIds: [sessionId, matchedSessionId]
            });
            console.log(`Triggered connection for users ${sessionId} and ${matchedSessionId} in room ${roomId}`);
        } catch (error) {
            console.error('Error triggering connection:', error);
        }
    }

    static async triggerConnection(user1Id: string, user2Id: string): Promise<void>
    {
        const roomId = `${user1Id}-${user2Id}`;

        try {
            await axios.post(`http://localhost:${process.env.PORT || 3000}/api/webrtc/join-room`, {
                roomId,
                sessionIds: [user1Id, user2Id]
            });
            console.log(`Triggered connection for users ${user1Id} and ${user2Id} in room ${roomId}`);
        } catch (error) {
            console.error('Error triggering connection:', error);
        }
    }

    static async #addToQueue(sessionId: string, topics: string[]): Promise<void>
    {
        if (topics && topics.length > 0)
        {
            const embeddings = await Promise.all(topics.map(topic => this.#getEmbedding(topic)));
            const vectorDataArray = topics.map((topic, index) => ({
                vector: embeddings[index],
                metadata: { sessionId, topic }
            }));

            db.vectorBatchInsert('topics_collection', vectorDataArray);
        }

        db.executeStoredProcedure('add_to_queue', {
            sessionId: sessionId as unknown as 'UUID',
            topics: JSON.stringify(topics) as unknown as 'JSONB' // Convert topics to JSONB array
        });
    }

    static async #delayedMatchmaking(sessionId: string, topics: string[]): Promise<boolean>
    {
        if (topics && topics.length > 0)
        {
            const randomTopicResult = (await db.executeFunction('get_oldest_random_topic_user', {})) as { get_oldest_random_topic_user: UserQueueInfo[] | null }[];

            if (randomTopicResult && randomTopicResult.length > 0 && randomTopicResult[0].get_oldest_random_topic_user)
            {
                const randomTopicUser = randomTopicResult[0].get_oldest_random_topic_user;
                if (randomTopicUser.length > 0)
                {
                    const mappedUser = this.mapToCamelCase(randomTopicUser[0]);
                    await this.#triggerConnection(sessionId, mappedUser.sessionId);
                    return true;
                }
            }

            const mismatchedTopicResult = (await db.executeFunction('get_oldest_topic_user', {})) as { get_oldest_topic_user: UserQueueInfo[] | null }[];

            if (mismatchedTopicResult && mismatchedTopicResult.length > 0 && mismatchedTopicResult[0].get_oldest_topic_user)
            {
                const mismatchedTopicUser = mismatchedTopicResult[0].get_oldest_topic_user;
                if (mismatchedTopicUser.length > 0)
                {
                    const mappedUser = this.mapToCamelCase(mismatchedTopicUser[0]);
                    await this.#triggerConnection(sessionId, mappedUser.sessionId);
                    return true;
                }
            }
        }
        else
        {
            const randomTopicResult = (await db.executeFunction('get_oldest_random_topic_user', {})) as { get_oldest_random_topic_user: UserQueueInfo[] | null }[];

            if (randomTopicResult && randomTopicResult.length > 0 && randomTopicResult[0].get_oldest_random_topic_user)
            {
                const randomTopicUser = randomTopicResult[0].get_oldest_random_topic_user;
                if (randomTopicUser.length > 0)
                {
                    const mappedUser = this.mapToCamelCase(randomTopicUser[0]);
                    await this.#triggerConnection(sessionId, mappedUser.sessionId);
                    return true;
                }
            }
        }

        return false;
    }

    static async #removeFromQueue(sessionId: string): Promise<void>
    {
        db.executeStoredProcedure('remove_from_queue', { sessionId });
    }

    static async #getEmbedding(term: string): Promise<number[]>
    {
        const existingEmbedding = (await db.executeStoredProcedure('get_text_embedding', { term })) as EmbeddingResponse;

        if (existingEmbedding && existingEmbedding.embedding)
        {
            return existingEmbedding.embedding;
        }

        const openai = require('openai');
        const apiKey = process.env.OPENAI_API_KEY;
        const configuration = new openai.Configuration({ apiKey });
        const openaiClient = new openai.OpenAIApi(configuration);

        const response = await openaiClient.createEmbedding({
            model: 'text-embedding-ada-002',
            input: term
        });

        if (!response || !response.data || !response.data[0] || !response.data[0].embedding)
        {
            throw new Error('Failed to fetch embedding from OpenAI API.');
        }

        const embedding = response.data[0].embedding;

        db.executeStoredProcedure('save_text_embedding', { term, embedding });

        return embedding;
    }
}

const db = new DatabaseManager();

export default MatchmakingManager;
