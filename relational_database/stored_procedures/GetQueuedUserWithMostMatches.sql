-- Purpose: Finds the queued user with the most matching terms.
-- Parameters:
--   matched_topics (TEXT[]): Array of matched topics.

-- Stored Procedure: GetQueuedUserWithMostMatches
-- Description: Finds the session ID with the most matching topics from the queue_topics table.

CREATE OR REPLACE PROCEDURE public.get_queued_user_with_most_matches(
    IN topic_list TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    best_match RECORD;
BEGIN
    SELECT q.session_id, COUNT(*) AS match_count
    INTO best_match
    FROM matchmaking_queue q
    JOIN queue_topics qt ON q.session_id = qt.session_id
    WHERE qt.topic = ANY(topic_list)
    GROUP BY q.session_id
    ORDER BY match_count DESC
    LIMIT 1;

    IF FOUND THEN
        RAISE NOTICE 'Best match: %', best_match.session_id;
    ELSE
        RAISE NOTICE 'No matches found';
    END IF;
END;
$$;
