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
    );

END;
$$ LANGUAGE plpgsql;
