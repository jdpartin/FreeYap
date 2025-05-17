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
        // This function will be responsible for processing the matchmaking queue
        // and pairing users based on their preferences and availability.
        // It will run as a single instance when triggered and run only for a specific session.
        // The function will then check a work_queue for the next session to process.
    }

    //#endregion
}

module.exports = Matchmaking;