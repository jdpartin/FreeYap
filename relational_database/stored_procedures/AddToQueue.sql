CREATE OR REPLACE PROCEDURE public.add_to_queue(
    session_id UUID,
    topics JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF topics IS NOT NULL AND jsonb_array_length(topics) > 0 THEN

        INSERT INTO matchmaking_queue 
        (
            session_id, 
            has_topics, 
            last_heartbeat, 
            inserted_at
        )
        VALUES 
        (
            session_id, 
            TRUE, 
            NOW(), 
            NOW()
        );

        -- Insert each topic into queue_topics
        INSERT INTO queue_topics
        (
            session_id, 
            topic
        )
        SELECT 
            session_id, 
            jsonb_array_elements_text(topics);

    ELSE
    
        INSERT INTO matchmaking_queue 
        (
            session_id, 
            has_topics, 
            last_heartbeat, 
            inserted_at
        )
        VALUES 
        (
            session_id, 
            FALSE, 
            NOW(), 
            NOW()
        );

    END IF;
END;
$$;