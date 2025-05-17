class SessionManager
{

    //#region Public Methods

    static async InitializeSession(webrtcId, topics)
    {
        try
        {
            const db = require('./databaseManager');

            // Call the stored procedure to initialize the session
            const sessionData = await db.executeStoredProcedure('initializeSession', {
                webrtcId,
                topics
            });

            // Insert each topic into the vector database
            for (const topic of topics)
            {
                await db.insertVector('topics_collection', topic, { sessionId: sessionData.sessionId });
            }

            return sessionData;
        }
        catch (err)
        {
            console.error('Error initializing session:', err);
            throw err;
        }
    }

    static async EndSession(sessionId)
    {
        try
        {
            const db = require('./databaseManager');

            // Call the stored procedure to end the session
            await db.executeStoredProcedure('endSession', { sessionId });

            // Clean up associated topics from the vector database
            await db.deleteVector('topics_collection', sessionId);
        }
        catch (err)
        {
            console.error('Error ending session:', err);
            throw err;
        }
    }

    static async UpdateSessionTopics(sessionId, newTopics)
    {
        try
        {
            const db = require('./databaseManager');

            // Fetch existing topics from the vector database
            const existingTopics = await db.searchVector('topics_collection', { sessionId }, 1000);

            // Determine topics to add and remove
            const existingTopicSet = new Set(existingTopics.map(topic => topic.name));
            const newTopicSet = new Set(newTopics);

            const topicsToAdd = newTopics.filter(topic => !existingTopicSet.has(topic));
            const topicsToRemove = existingTopics.filter(topic => !newTopicSet.has(topic.name));

            // Add new topics to the vector database
            for (const topic of topicsToAdd)
            {
                await db.insertVector('topics_collection', topic, { sessionId });
            }

            // Remove old topics from the vector database
            for (const topic of topicsToRemove)
            {
                await db.deleteVector('topics_collection', topic.id);
            }

            // Update the relational database with the new topics
            await db.executeStoredProcedure('updateSessionTopics', {
                sessionId,
                newTopics
            });
        }
        catch (err)
        {
            console.error('Error updating session topics:', err);
            throw err;
        }
    }

    //#endregion


    //#region Private Methods

    // Add any private helper methods here

    //#endregion
}

module.exports = SessionManager;
