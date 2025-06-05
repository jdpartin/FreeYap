
CREATE OR REPLACE PROCEDURE public.add_to_queue(
    socketId TEXT,
    topics JSONB,
    mode TEXT,
    nudity BOOLEAN DEFAULT NULL,
    gore BOOLEAN DEFAULT NULL,
    ipHash TEXT DEFAULT NULL
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
            chat_mode,
            nudity,
            gore,
            ip_hash
        )        
        VALUES
        (
            socketId,
            NOW(),
            TRUE,
            mode,
            nudity,
            gore,
            ipHash
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
            chat_mode,
            nudity,
            gore,
            ip_hash
        )        
        VALUES
        (
            socketId,
            NOW(),
            FALSE,
            mode,
            nudity,
            gore,
            ipHash
        );

    END IF;
    
END;
$$;