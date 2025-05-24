
-- DO NOT REMOVE TOPICS THEY HAVE A FOREIGN KEY CONSTRAINT THAT WILL CLEAN THEM UP

CREATE OR REPLACE PROCEDURE public.remove_from_queue(
    socketId TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    
    DELETE FROM matchmaking_queue
    WHERE socket_id = socketId;
    
END;
$$;
