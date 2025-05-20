-- Purpose: Adds a user to the matchmaking queue.
-- Parameters:
--   session_id (UUID): The session ID of the user.
--   topics (JSONB): A JSONB array of topics associated with the session.

CREATE OR REPLACE PROCEDURE public.add_to_queue(
    sessionId UUID,
    topics JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN

    DELETE FROM matchmaking_queue
    WHERE session_id = sessionId;

    IF topics IS NOT NULL AND jsonb_array_length(topics) > 0 THEN

        INSERT INTO matchmaking_queue 
        (
            session_id,
            inserted_at,
            has_topics
        )
        VALUES
        (
            sessionId,
            NOW(),
            TRUE
        );

    ELSE

        INSERT INTO matchmaking_queue 
        (
            session_id,
            inserted_at,
            has_topics
        )
        VALUES
        (
            sessionId,
            NOW(),
            FALSE
        );

    END IF;
    
END;
$$;