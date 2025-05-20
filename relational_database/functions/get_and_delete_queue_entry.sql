-- Purpose: Retrieves and deletes the specified entry in the queue.
-- Parameters:
--   sessionId (UUID): The session ID of the user.

CREATE OR REPLACE FUNCTION get_and_delete_queue_entry(sessionId UUID)
RETURNS TABLE (
    session_id UUID,
    inserted_at TIMESTAMP,
    last_heartbeat TIMESTAMP,
    has_topics BOOLEAN,
    topics TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH deleted_entry AS (
        DELETE FROM matchmaking_queue
        WHERE matchmaking_queue.session_id = sessionId
        RETURNING matchmaking_queue.session_id, matchmaking_queue.inserted_at, matchmaking_queue.last_heartbeat, matchmaking_queue.has_topics
    )
    SELECT 
        d.session_id,
        d.inserted_at,
        d.last_heartbeat,
        d.has_topics,
        ARRAY(SELECT topic FROM queue_topics WHERE queue_topics.session_id = d.session_id) AS topics
    FROM deleted_entry d;
END;
$$ LANGUAGE plpgsql;