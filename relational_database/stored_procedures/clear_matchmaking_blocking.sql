CREATE OR REPLACE PROCEDURE public.clear_matchmaking_blocking()
LANGUAGE plpgsql
AS $$
BEGIN
    
    DELETE FROM matchmaking_blocking;
    
END;
$$;
