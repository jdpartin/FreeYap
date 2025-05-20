-- Purpose: Finds the queued user with the most matching topics.
-- Parameters:
--   matched_topics (TEXT[]): Array of matched topics.

-- Function: GetQueuedUserWithMostMatches
-- Description: Finds the session ID with the most matching topics from the queue_topics table.

CREATE OR REPLACE FUNCTION public.get_queued_user_with_most_matches(
    topicList TEXT[]
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    SELECT q.session_id
    INTO session_id
    FROM matchmaking_queue q
    JOIN queue_topics qt ON q.session_id = qt.session_id
    WHERE qt.topic = ANY(topicList)
    GROUP BY q.session_id
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    RETURN session_id;
END;
$$ LANGUAGE plpgsql;
