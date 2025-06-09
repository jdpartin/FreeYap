CREATE OR REPLACE PROCEDURE public.remove_matchmaking_blocking_entry(
    sourceIp TEXT,
    blockedIp TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN

    -- Remove blocking entries in both directions
    DELETE FROM matchmaking_blocking
    WHERE (source_ip = sourceIp AND blocked_ip = blockedIp)
       OR (source_ip = blockedIp AND blocked_ip = sourceIp);
    
END;
$$;
