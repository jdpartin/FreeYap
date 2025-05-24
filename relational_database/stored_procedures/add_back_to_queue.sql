
CREATE OR REPLACE PROCEDURE public.add_back_to_queue(
    socketId TEXT,
    topics JSONB,
    hasTopics BOOLEAN,
    insertedAt TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN

    DELETE FROM matchmaking_queue
    WHERE socket_id = socketId;

    INSERT INTO matchmaking_queue
    (
        socket_id, 
        inserted_at,
        has_topics
    )
    VALUES 
    (
        socketId, 
        insertedAt,
        hasTopics
    );

    INSERT INTO queue_topics
    (
        socket_id,
        topic
    )
    SELECT socketId, jsonb_array_elements_text(topics);

END;
$$;
