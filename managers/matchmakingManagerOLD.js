const db = require('./databaseManager');
const webRTCServerManager = require('./webrtcServerManager');
const VectorData = require('../models/vectorData');


// Matchmaking preference
    // Users with topics (Topic Users): Matched Topic Users > Random Topic Users > Mismatched Topic Users (Only when delayed)
    // Users with no topic (Random Users): Delayed Topic Users > Random Topic Users (Only when delayed)
    // NEVER MATCH: Random Topic Users with Un-delayed Topic Users

class MatchmakingManager
{
    static async JoinQueue(sessionId, terms)
    {
        this.#initialMatchmaking(sessionId, terms);
    }

    static async PerformDelayedMatchmaking(sessionId, terms)
    {
        const queueInfoPromise = db.executeStoredProcedure('GetAndDeleteQueueEntry', { sessionId });

        const matchmakingResult = await this.#delayedMatchmaking(sessionId, terms);

        if (!matchmakingResult)
        {
            const queueInfo = await queueInfoPromise;

            if (queueInfo && queueInfo.length > 0)
            {
                const queuedUser = queueInfo[0];

                db.executeStoredProcedure('addBackToQueue', 
                    { sessionId: queuedUser.sessionId, terms: queuedUser.terms, insertedAt: queuedUser.insertedAt });
            }
        }
    }

    static async LeaveQueue(sessionId)
    {
        this.#removeFromQueue(sessionId);
    }


    //#region Private Methods


    static async #initialMatchmaking(sessionId, terms)
    {
        if (terms.length > 0)
        {
            const bestMatch = await this.getBestTopicMatch(sessionId, terms);

            if (bestMatch && bestMatch.length > 0)
            {
                this.#triggerConnection(sessionId, bestMatch[0].sessionId);
                return;
            }
        }
        else // Random chat user
        {
            const delayedUsers = await db.executeStoredProcedure('GetOldestDelayedTermUser', { sessionId });

            if (delayedUsers && delayedUsers.length > 0)
            {
                this.#triggerConnection(sessionId, delayedUsers[0].sessionId);
                return;
            }
        }

        await this.#addToQueue(sessionId, terms);
    }

    //#region Initial Matchmaking Sub Methods


    static async getBestTopicMatch(sessionId, terms)
    {
        const matchingTerms = await this.#getMatchingTerms(terms);

        if (matchingTerms.length > 0)
        {
            return await db.executeStoredProcedure('GetQueuedUserWithMostMatches', {
                matchedTopics: matchingTerms
            });
        }

        return [];
    }

    static async #getMatchingTerms(terms)
    {
        if (terms.length > 0)
        {
            const threshold = 0.9;

            // Removed direct reference to collection name
            const results = await db.searchVectorBatch(terms, 1000);

            const matchedTerms = results.flatMap(result =>
                result.matches.filter(match => match.score >= threshold).map(match => match.term)
            );

            return [...new Set(matchedTerms)]; // Remove duplicates
        }
        
        return [];
    }

    static async #triggerConnection(sessionId, matchedSessionId) {
        const roomId = `${sessionId}-${matchedSessionId}`;

        // Notify both users to join the same room
        webRTCServerManager.io.to(sessionId).emit('match-found', { roomId });
        webRTCServerManager.io.to(matchedSessionId).emit('match-found', { roomId });

        console.log(`Triggered connection for users ${sessionId} and ${matchedSessionId} in room ${roomId}`);
    }

    static async triggerConnection(user1Id, user2Id)
    {
        const roomId = `${user1Id}-${user2Id}`;
  
        // Notify both users to join the same room
        webRTCServerManager.io.to(user1Id).emit('match-found', { roomId });
        webRTCServerManager.io.to(user2Id).emit('match-found', { roomId });
  
        console.log(`Triggered connection for users ${user1Id} and ${user2Id} in room ${roomId}`);
    }

    static async #addToQueue(sessionId, terms)
    {
        if (terms.length > 0)
        {
            const embeddings = await Promise.all(terms.map(term => this.#getEmbedding(term)));
            const vectorDataArray = terms.map((term, index) => new VectorData(sessionId, embeddings[index], [term]));

            // Use bulk insert instead of singular insert
            db.vectorBatchInsert(vectorDataArray);
        }

        db.executeStoredProcedure('AddUserToQueue', { sessionId, terms });
    }


    //#endregion

    static async #delayedMatchmaking(sessionId, terms)
    {
        if (terms.length > 0) // Topics User
        {
            // Preference: Random Topic Users > Mismatched Topic Users

            const randomTopicUser = await db.executeStoredProcedure('GetOldestRandomTopicUser');

            if (randomTopicUser && randomTopicUser.length > 0)
            {
                const randomTopicUserId = randomTopicUser[0].sessionId;

                this.#triggerConnection(sessionId, randomTopicUserId);
                return true;
            }

            const mismatchedTopicUser = await db.executeStoredProcedure('GetOldestTopicUser');

            if (mismatchedTopicUser && mismatchedTopicUser.length > 0)
            {
                const mismatchedTopicUserId = mismatchedTopicUser[0].sessionId;

                this.#triggerConnection(sessionId, mismatchedTopicUserId);
                return true;
            }
        }
        else // Random chat user
        {
            // Preference: Delayed Topic Users > Random Topic Users
            
            const delayedTopicUser = await db.executeStoredProcedure('GetOldestDelayedTermUser', { sessionId });

            if (delayedTopicUser && delayedTopicUser.length > 0)
            {
                const delayedTopicUserId = delayedTopicUser[0].sessionId;

                this.#triggerConnection(sessionId, delayedTopicUserId);
                return true;
            }

            const randomTopicUser = await db.executeStoredProcedure('GetOldestRandomTopicUser');

            if (randomTopicUser && randomTopicUser.length > 0)
            {
                const randomTopicUserId = randomTopicUser[0].sessionId;

                this.#triggerConnection(sessionId, randomTopicUserId);
                return true;
            }
        }

        return false; // No match found
    }

    static async #removeFromQueue(sessionId)
    {
        db.executeStoredProcedure('RemoveFromQueue', { sessionId });
    }

    static async #getEmbedding(term)
    {
        const existingEmbedding = await db.executeStoredProcedure('GetTextEmbedding', { term });

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


    //#endregion
}

module.exports = MatchmakingManager;
