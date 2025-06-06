CREATE OR REPLACE FUNCTION public.is_user_vibe_checked(
    hashedIp TEXT
)
RETURNS TABLE(nudity BOOLEAN, gore BOOLEAN)
AS $$
BEGIN
    RETURN QUERY
    WITH vibe_analysis AS (
        SELECT 
            -- Verified checks within 7 days
            BOOL_OR(CASE WHEN vc.verified = true AND vc.inserted_at >= NOW() - INTERVAL '7 days' AND vc.nudity = true THEN true ELSE false END) AS verified_nudity,
            BOOL_OR(CASE WHEN vc.verified = true AND vc.inserted_at >= NOW() - INTERVAL '7 days' AND vc.gore = true THEN true ELSE false END) AS verified_gore,
            
            -- Count distinct source IPs for unverified nudity reports
            COUNT(DISTINCT CASE WHEN vc.verified = false AND vc.nudity = true THEN vc.source_ip END) AS unverified_nudity_count,
            
            -- Count distinct source IPs for unverified gore reports
            COUNT(DISTINCT CASE WHEN vc.verified = false AND vc.gore = true THEN vc.source_ip END) AS unverified_gore_count
        FROM vibe_checks vc
        WHERE vc.hashed_ip = hashedIp
    )
    SELECT 
        -- Nudity is enforceable if verified within 7 days OR 2+ different source IPs reported it
        va.verified_nudity OR va.unverified_nudity_count >= 2 AS nudity,
        
        -- Gore is enforceable if verified within 7 days OR 2+ different source IPs reported it
        va.verified_gore OR va.unverified_gore_count >= 2 AS gore
    FROM vibe_analysis va;
END;
$$ LANGUAGE plpgsql;
