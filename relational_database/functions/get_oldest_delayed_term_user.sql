
CREATE OR REPLACE FUNCTION public.get_oldest_delayed_term_user()
RETURNS TABLE (
    get_oldest_delayed_term_user TEXT
) AS $$
BEGIN

    RETURN QUERY
    SELECT q.socket_id
    FROM matchmaking_queue q
    WHERE q.has_topics = TRUE AND q.inserted_at <= NOW() - INTERVAL '10 seconds'
    ORDER BY q.inserted_at ASC
    LIMIT 1;

END;
$$ LANGUAGE plpgsql;
