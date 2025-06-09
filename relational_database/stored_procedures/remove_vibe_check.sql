CREATE OR REPLACE PROCEDURE public.remove_vibe_check(
    hashedIp TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    
    -- Delete all vibe check entries for the specified hashed IP
    DELETE FROM vibe_checks
    WHERE hashed_ip = hashedIp;
    
END;
$$;
