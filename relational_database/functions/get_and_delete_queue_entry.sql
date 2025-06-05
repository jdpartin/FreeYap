
-- DO NOT REMOVE TOPICS THEY HAVE A FOREIGN KEY CONSTRAINT THAT WILL CLEAN THEM UP
-- Updated to explicitly delete queue_topics FIRST to avoid foreign key constraint violation

CREATE OR REPLACE FUNCTION get_and_delete_queue_entry(socketId TEXT)
RETURNS TABLE (
    socket_id TEXT,
    inserted_at TIMESTAMP,
    has_topics BOOLEAN,
    chat_mode TEXT,
    nudity BOOLEAN,
    gore BOOLEAN,
    ip_hash TEXT
) AS $$
DECLARE
    queue_entry_record RECORD;
BEGIN    -- First, get the queue entry before deleting anything
    SELECT q.socket_id, q.inserted_at, q.has_topics, q.chat_mode, q.nudity, q.gore, q.ip_hash
    INTO queue_entry_record
    FROM matchmaking_queue q
    WHERE q.socket_id = socketId;
    
    -- If no entry found, return empty result
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Delete from queue_topics first (child table)
    DELETE FROM queue_topics
    WHERE queue_topics.socket_id = socketId;
    
    -- Then delete from matchmaking_queue (parent table)
    DELETE FROM matchmaking_queue
    WHERE matchmaking_queue.socket_id = socketId;
      -- Return the stored queue entry data
    RETURN QUERY
    SELECT 
        queue_entry_record.socket_id,
        queue_entry_record.inserted_at,
        queue_entry_record.has_topics,
        queue_entry_record.chat_mode,
        queue_entry_record.nudity,
        queue_entry_record.gore,
        queue_entry_record.ip_hash;
    
END;
$$ LANGUAGE plpgsql;