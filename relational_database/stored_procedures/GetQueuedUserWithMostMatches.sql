-- Stored Procedure: GetQueuedUserWithMostMatches
-- Description: Finds the session ID with the most matching topics from the queue_topics table.

CREATE OR REPLACE PROCEDURE public.GetQueuedUserWithMostMatches(matched_topics JSONB)
LANGUAGE plpgsql
AS $$
DECLARE
    record RECORD; -- Declare a record variable to hold rows from temp_result
BEGIN
    -- Use a temporary table to store the result
    CREATE TEMP TABLE temp_result AS
    WITH top_session AS (
        SELECT 
            t.session_id, 
            COUNT(t.term) AS match_count
        FROM 
            queue_topics t
        WHERE 
            t.term = ANY (jsonb_array_elements_text(matched_topics))
        GROUP BY 
            t.session_id
        ORDER BY 
            match_count DESC
        LIMIT 1
    )
    SELECT 
        q.session_id, 
        t.match_count, 
        q.inserted_at, 
        q.last_heartbeat
    FROM 
        top_session t
    JOIN 
        matchmaking_queue q ON q.session_id = t.session_id;

    -- Loop through the temporary table and return rows
    FOR record IN SELECT * FROM temp_result LOOP
        RAISE NOTICE 'Session ID: %, Match Count: %, Inserted At: %, Last Heartbeat: %',
            record.session_id, record.match_count, record.inserted_at, record.last_heartbeat;
    END LOOP;

    -- Drop the temporary table
    DROP TABLE temp_result;
END;
$$;
