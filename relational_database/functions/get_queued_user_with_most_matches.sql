
CREATE OR REPLACE FUNCTION public.get_queued_user_with_most_matches(
    matchedTopics TEXT[],
    mode TEXT
)
RETURNS TABLE (
    socket_id TEXT
) AS $$
BEGIN

    RETURN QUERY
    SELECT 
        q.socket_id
    FROM matchmaking_queue q
    JOIN queue_topics qt ON q.socket_id = qt.socket_id
    WHERE 
        q.chat_mode = mode
        AND qt.topic = ANY(matchedTopics)
    GROUP BY q.socket_id, q.chat_mode
    ORDER BY COUNT(*) DESC
    LIMIT 1;

END;
$$ LANGUAGE plpgsql;
