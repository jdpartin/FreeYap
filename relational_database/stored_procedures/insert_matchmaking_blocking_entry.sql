
CREATE OR REPLACE PROCEDURE public.insert_matchmaking_blocking_entry(
    sourceIp TEXT,
    blockedIP TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN

    -- check if the two ips are already linked to each other in either direction
    IF NOT EXISTS (
        SELECT 1
        FROM matchmaking_blocking
        WHERE (source_ip = sourceIp AND blocked_ip = blockedIP)
           OR (source_ip = blockedIP AND blocked_ip = sourceIp)
    ) THEN

        -- insert the new blocking entry
        INSERT INTO matchmaking_blocking 
        (
            source_ip,
            blocked_ip
        )
        VALUES
        (
            sourceIp,
            blockedIP
        );

    END IF;
    
END;
$$;