
-- DO NOT REMOVE TOPICS THEY HAVE A FOREIGN KEY CONSTRAINT THAT WILL CLEAN THEM UP

CREATE OR REPLACE FUNCTION get_and_delete_queue_entry(socketId TEXT)
RETURNS TABLE (
    socket_id TEXT,
    inserted_at TIMESTAMP,
    has_topics BOOLEAN
) AS $$
BEGIN

    RETURN QUERY
    WITH deleted_entry AS (
        DELETE FROM matchmaking_queue
        WHERE matchmaking_queue.socket_id = socketId
        RETURNING matchmaking_queue.socket_id, matchmaking_queue.inserted_at, matchmaking_queue.has_topics
    )
    SELECT 
        d.socket_id,
        d.inserted_at,
        d.has_topics
    FROM deleted_entry d;
    
END;
$$ LANGUAGE plpgsql;