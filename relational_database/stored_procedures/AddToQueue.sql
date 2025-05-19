-- Purpose: Adds a user to the matchmaking queue.
-- Parameters:
--   session_id (UUID): The session ID of the user.
--   topics (JSONB): A JSONB array of topics associated with the session.

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
            has_topics
        )
        VALUES 
        (
            session_id, 
            TRUE
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
            has_topics
        )
        VALUES 
        (
            session_id, 
            FALSE
        );

    END IF;
END;
$$;