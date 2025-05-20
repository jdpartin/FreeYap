-- Purpose: Retrieves the oldest user in the queue with delayed topic.
-- Parameters: None.

CREATE OR REPLACE FUNCTION public.get_oldest_delayed_topic_user()
RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    SELECT q.session_id
    INTO session_id
    FROM matchmaking_queue q
    WHERE q.has_topics = TRUE AND q.inserted_at <= NOW() - INTERVAL '10 seconds'
    ORDER BY q.inserted_at ASC
    LIMIT 1;

    RETURN session_id;
END;
$$ LANGUAGE plpgsql;
