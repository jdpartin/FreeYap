-- Stored Procedure: addBackToQueue
-- Description: Inserts an entry back into the queue table.

CREATE OR REPLACE FUNCTION addBackToQueue(sessionId TEXT, terms JSONB, insertedAt TIMESTAMP)
RETURNS VOID AS $$
BEGIN

    INSERT INTO matchmaking_queue
    (
        sessionId, 
        insertedAt,
        lastHeartbeat
    )
    VALUES 
    (
        sessionId, 
        insertedAt,
        now()
    );

    INSERT INTO queue_topics
    (
        sessionId,
        term
    )
    SELECT sessionId, jsonb_array_elements_text(terms);

END;
$$ LANGUAGE plpgsql;
