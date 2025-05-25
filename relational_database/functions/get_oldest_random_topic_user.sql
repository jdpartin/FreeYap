
CREATE OR REPLACE FUNCTION public.get_oldest_random_topic_user(mode TEXT)
RETURNS TABLE (
    get_oldest_random_topic_user TEXT
) AS $$
BEGIN

    RETURN QUERY
    SELECT 
        q.socket_id
    FROM matchmaking_queue q
    WHERE 
        q.chat_mode = mode
        AND q.has_topics = FALSE AND q.inserted_at <= NOW() - INTERVAL '10 seconds'
    ORDER BY q.inserted_at ASC
    LIMIT 1;

END;
$$ LANGUAGE plpgsql;
