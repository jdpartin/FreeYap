import DatabaseManager from '../managers/databaseManager';
import WebRTCServerManager from '../managers/webrtcServerManager';
import { webRTCServerManager } from '../index';
import VectorData from '../models/vectorData';
import { Server } from 'socket.io';

// Matchmaking preference
// Users with topics (Topic Users): Matched Topic Users > Random Topic Users > Mismatched Topic Users (Only when delayed)
// Users with no topic (Random Users): Delayed Topic Users > Random Topic Users (Only when delayed)
// NEVER MATCH: Random Topic Users with Un-delayed Topic Users

interface UserQueueInfo
{
    sessionId: string;
    terms: string[];
    insertedAt: string;
}

interface EmbeddingResponse
{
    embedding: number[];
}

class MatchmakingManager
{
    static async JoinQueue(sessionId: string, terms: string[]): Promise<void>
    {
        await this.#initialMatchmaking(sessionId, terms);
    }

    static async PerformDelayedMatchmaking(sessionId: string, terms: string[]): Promise<void>
    {
        const queueInfoPromise = db.executeStoredProcedure('GetAndDeleteQueueEntry', { sessionId }) as Promise<UserQueueInfo[]>;

        const matchmakingResult = await this.#delayedMatchmaking(sessionId, terms);

        if (!matchmakingResult)
        {
            const queueInfo = await queueInfoPromise;

            if (queueInfo && queueInfo.length > 0)
            {
                const queuedUser = queueInfo[0];

                db.executeStoredProcedure('addBackToQueue', {
                    sessionId: queuedUser.sessionId,
                    terms: queuedUser.terms,
                    insertedAt: queuedUser.insertedAt
                });
            }
        }
    }

    static async LeaveQueue(sessionId: string): Promise<void>
    {
        await this.#removeFromQueue(sessionId);
    }

    //#region Private Methods

    static async #initialMatchmaking(sessionId: string, terms: string[]): Promise<void>
    {
        if (terms.length > 0)
        {
            const bestMatch = await this.getBestTopicMatch(sessionId, terms);

            if (bestMatch && bestMatch.length > 0)
            {
                await this.#triggerConnection(sessionId, bestMatch[0].sessionId);
                return;
            }
        }
        else
        {
            const delayedUsers = (await db.executeStoredProcedure('GetOldestDelayedTermUser', { sessionId })) as UserQueueInfo[];

            if (delayedUsers && delayedUsers.length > 0)
            {
                await this.#triggerConnection(sessionId, delayedUsers[0].sessionId);
                return;
            }
        }

        await this.#addToQueue(sessionId, terms);
    }

    static async getBestTopicMatch(sessionId: string, terms: string[]): Promise<UserQueueInfo[]>
    {
        const matchingTerms = await this.#getMatchingTerms(terms);

        if (matchingTerms.length > 0)
        {
            return (await db.executeStoredProcedure('GetQueuedUserWithMostMatches', {
                matchedTopics: matchingTerms
            })) as UserQueueInfo[];
        }

        return [];
    }

    static async #getMatchingTerms(terms: string[]): Promise<string[]>
    {
        if (terms.length > 0)
        {
            const threshold = 0.9;

            const results = await db.searchVectorBatch(terms, 1000);

            const matchedTerms = results.flatMap((result: any) =>
                result.matches.filter((match: any) => match.score >= threshold).map((match: any) => match.term)
            );

            return [...new Set(matchedTerms)]; // Remove duplicates
        }

        return [];
    }

    static async #triggerConnection(sessionId: string, matchedSessionId: string): Promise<void>
    {
        const roomId = `${sessionId}-${matchedSessionId}`;

        webRTCServerManager.io.to(sessionId).emit('match-found', { roomId });
        webRTCServerManager.io.to(matchedSessionId).emit('match-found', { roomId });

        console.log(`Triggered connection for users ${sessionId} and ${matchedSessionId} in room ${roomId}`);
    }

    static async triggerConnection(user1Id: string, user2Id: string): Promise<void>
    {
        const roomId = `${user1Id}-${user2Id}`;

        webRTCServerManager.io.to(user1Id).emit('match-found', { roomId });
        webRTCServerManager.io.to(user2Id).emit('match-found', { roomId });

        console.log(`Triggered connection for users ${user1Id} and ${user2Id} in room ${roomId}`);
    }

    static async #addToQueue(sessionId: string, terms: string[]): Promise<void>
    {
        if (terms.length > 0)
        {
            const embeddings = await Promise.all(terms.map(term => this.#getEmbedding(term)));
            const vectorDataArray = terms.map((term, index) => ({
                vector: embeddings[index],
                metadata: { sessionId, term }
            }));

            db.vectorBatchInsert('topics_collection', vectorDataArray);
        }

        db.executeStoredProcedure('AddUserToQueue', { sessionId, terms });
    }

    static async #delayedMatchmaking(sessionId: string, terms: string[]): Promise<boolean>
    {
        if (terms.length > 0)
        {
            const randomTopicUser = (await db.executeStoredProcedure('GetOldestRandomTopicUser', {})) as UserQueueInfo[];

            if (randomTopicUser && randomTopicUser.length > 0)
            {
                const randomTopicUserId = randomTopicUser[0].sessionId;

                await this.#triggerConnection(sessionId, randomTopicUserId);
                return true;
            }

            const mismatchedTopicUser = (await db.executeStoredProcedure('GetOldestTopicUser', {})) as UserQueueInfo[];

            if (mismatchedTopicUser && mismatchedTopicUser.length > 0)
            {
                const mismatchedTopicUserId = mismatchedTopicUser[0].sessionId;

                await this.#triggerConnection(sessionId, mismatchedTopicUserId);
                return true;
            }
        }
        else
        {
            const delayedTopicUser = (await db.executeStoredProcedure('GetOldestDelayedTermUser', { sessionId })) as UserQueueInfo[];

            if (delayedTopicUser && delayedTopicUser.length > 0)
            {
                const delayedTopicUserId = delayedTopicUser[0].sessionId;

                await this.#triggerConnection(sessionId, delayedTopicUserId);
                return true;
            }

            const randomTopicUser = (await db.executeStoredProcedure('GetOldestRandomTopicUser', {})) as UserQueueInfo[];

            if (randomTopicUser && randomTopicUser.length > 0)
            {
                const randomTopicUserId = randomTopicUser[0].sessionId;

                await this.#triggerConnection(sessionId, randomTopicUserId);
                return true;
            }
        }

        return false;
    }

    static async #removeFromQueue(sessionId: string): Promise<void>
    {
        db.executeStoredProcedure('RemoveFromQueue', { sessionId });
    }

    static async #getEmbedding(term: string): Promise<number[]>
    {
        const existingEmbedding = (await db.executeStoredProcedure('GetTextEmbedding', { term })) as EmbeddingResponse;

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

        db.executeStoredProcedure('SaveTextEmbedding', { term, embedding });

        return embedding;
    }
}

const db = new DatabaseManager();

export default MatchmakingManager;
