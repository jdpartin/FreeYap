-- Purpose: Retrieves and deletes the oldest entry in the queue.
-- Parameters:
--   session_id (UUID): The session ID of the user.

CREATE OR REPLACE PROCEDURE get_and_delete_queue_entry()
LANGUAGE plpgsql AS $$
DECLARE
    queue_entry RECORD;
BEGIN
    SELECT * INTO queue_entry FROM matchmaking_queue ORDER BY inserted_at LIMIT 1;
    IF FOUND THEN
        DELETE FROM matchmaking_queue WHERE session_id = queue_entry.session_id;
    END IF;
END;
$$;