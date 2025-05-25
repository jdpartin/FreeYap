
-- DO NOT REMOVE TOPICS THEY HAVE A FOREIGN KEY CONSTRAINT THAT WILL CLEAN THEM UP
-- Updated to explicitly delete queue_topics in case foreign key constraint is missing

CREATE OR REPLACE PROCEDURE public.remove_from_queue(
    socketId TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    
    -- Delete from queue_topics first (in case FK constraint doesn't exist)
    DELETE FROM queue_topics
    WHERE socket_id = socketId;
    
    -- Then delete from matchmaking_queue
    DELETE FROM matchmaking_queue
    WHERE socket_id = socketId;
    
END;
$$;
