-- Purpose: Retrieves the vibe check preferences for a specific hashed IP address.

CREATE OR REPLACE FUNCTION get_vibe_checks(hashedIp TEXT)
RETURNS TABLE (
    id UUID,
    hashed_ip TEXT,
    source_ip TEXT,
    gore BOOLEAN,
    nudity BOOLEAN,
    inserted_at TIMESTAMP,
    verified BOOLEAN
) AS $$
BEGIN

    RETURN QUERY
    SELECT 
        vibe_checks.id,
        vibe_checks.hashed_ip,
        vibe_checks.source_ip,
        vibe_checks.gore,
        vibe_checks.nudity,
        vibe_checks.inserted_at,
        vibe_checks.verified
    FROM vibe_checks
    WHERE vibe_checks.hashed_ip = hashedIp;
    
END;
$$ LANGUAGE plpgsql;
