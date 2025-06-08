-- Clear all entries from the matchmaking queue for testing purposes
-- This procedure removes all users from the queue and associated topics
-- WARNING: This should only be used in testing environments

CREATE OR REPLACE PROCEDURE public.clear_matchmaking_queue()
LANGUAGE plpgsql
AS $$
BEGIN
    
    DELETE FROM matchmaking_queue;
    
END;
$$;
