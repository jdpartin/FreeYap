-- Stored Procedure: GetOldestDelayedTermUser
-- Description: Retrieves the oldest user in the queue with terms who has been waiting more than 10 seconds.

CREATE OR REPLACE PROCEDURE get_oldest_delayed_term_user()
LANGUAGE plpgsql AS $$
DECLARE
    oldest_user RECORD;
BEGIN
    SELECT * INTO oldest_user
    FROM matchmaking_queue
    WHERE has_topics = TRUE AND inserted_at <= NOW() - INTERVAL '10 seconds'
    ORDER BY inserted_at ASC
    LIMIT 1;

    IF FOUND THEN
        RAISE NOTICE 'Oldest user with terms: %', oldest_user.session_id;
    ELSE
        RAISE NOTICE 'No users with terms found who have been waiting more than 10 seconds';
    END IF;
END;
$$;
