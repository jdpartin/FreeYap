-- Stored Procedure: addBackToQueue
-- Description: Inserts an entry back into the queue table.

CREATE OR REPLACE PROCEDURE public.add_back_to_queue(
    sessionId UUID,
    topics JSONB,
    insertedAt TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN

    DELETE FROM matchmaking_queue
    WHERE session_id = sessionId;

    INSERT INTO matchmaking_queue
    (
        session_id, 
        inserted_at,
        last_heartbeat,
        has_topics
    )
    VALUES 
    (
        sessionId, 
        insertedAt,
        now(),
        topics IS NOT NULL
    );

    INSERT INTO queue_topics
    (
        session_id,
        topic
    )
    SELECT sessionId, jsonb_array_elements_text(topics);

END;
$$;
