
CREATE OR REPLACE FUNCTION public.get_oldest_delayed_term_user(mode TEXT)
RETURNS TABLE (
    get_oldest_delayed_term_user TEXT
) AS $$
BEGIN

    RETURN QUERY
    SELECT q.socket_id
    FROM matchmaking_queue q
    WHERE 
        q.chat_mode = mode
        AND q.has_topics = TRUE AND q.inserted_at <= NOW() - INTERVAL '11 seconds' -- Matchmaking stagger to prevent race conditions
    ORDER BY q.inserted_at ASC
    LIMIT 1;

END;
$$ LANGUAGE plpgsql;
