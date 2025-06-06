CREATE OR REPLACE PROCEDURE public.insert_vibe_check(
    hashedIp TEXT,
    sourceIp TEXT,
    gorePreference BOOLEAN,
    nudityPreference BOOLEAN,
    verifiedStatus BOOLEAN
)
AS $$
BEGIN

    -- Insert or update the vibe check entry for the hashed IP
    INSERT INTO vibe_checks 
    (
        hashed_ip,
        source_ip,
        gore,
        nudity,
        verified
    )
    VALUES 
    (
        hashedIp,
        sourceIp,
        gorePreference,
        nudityPreference,
        verifiedStatus
    )
    ON CONFLICT (hashed_ip) 
    DO UPDATE SET
        source_ip = EXCLUDED.source_ip,
        gore = EXCLUDED.gore,
        nudity = EXCLUDED.nudity,
        verified = EXCLUDED.verified;

END;
$$ LANGUAGE plpgsql;
