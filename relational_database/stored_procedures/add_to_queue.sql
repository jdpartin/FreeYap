
CREATE OR REPLACE PROCEDURE public.add_to_queue(
    socketId TEXT,
    topics JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN

    DELETE FROM matchmaking_queue
    WHERE socket_id = socketId;    
    
    IF topics IS NOT NULL AND jsonb_array_length(topics) > 0 THEN

        INSERT INTO matchmaking_queue 
        (
            socket_id,
            inserted_at,
            has_topics
        )
        VALUES
        (
            socketId,
            NOW(),
            TRUE
        );

        -- Add topics to the queue_topics table
        INSERT INTO queue_topics
        (
            socket_id,
            topic
        )
        SELECT socketId, jsonb_array_elements_text(topics);

    ELSE

        INSERT INTO matchmaking_queue 
        (
            socket_id,
            inserted_at,
            has_topics
        )
        VALUES
        (
            socketId,
            NOW(),
            FALSE
        );

    END IF;
    
END;
$$;