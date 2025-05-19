-- Stored Procedure: addBackToQueue
-- Description: Inserts an entry back into the queue table.

CREATE OR REPLACE FUNCTION add_back_to_queue(session_id TEXT, topics JSONB, inserted_at TIMESTAMP)
RETURNS VOID AS $$
BEGIN

    INSERT INTO matchmaking_queue
    (
        session_id, 
        inserted_at,
        last_heartbeat,
        has_topics
    )
    VALUES 
    (
        session_id, 
        inserted_at,
        now(),
        jsonb_array_length(topics) > 0
    );

    INSERT INTO queue_topics
    (
        session_id,
        topic
    )
    SELECT session_id, jsonb_array_elements_text(topics);

END;
$$ LANGUAGE plpgsql;
