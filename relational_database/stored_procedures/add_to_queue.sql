
CREATE OR REPLACE PROCEDURE public.add_to_queue(
    socketId TEXT,
    topics JSONB,
    mode TEXT
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
            has_topics,
            chat_mode
        )
        VALUES
        (
            socketId,
            NOW(),
            TRUE,
            mode
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
            has_topics,
            chat_mode
        )
        VALUES
        (
            socketId,
            NOW(),
            FALSE,
            mode
        );

    END IF;
    
END;
$$;