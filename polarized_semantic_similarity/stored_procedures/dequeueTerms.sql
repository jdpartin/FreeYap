-- PostgreSQL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'dequeueTerms') THEN
        DROP FUNCTION dequeueTerms;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION dequeueTerms(
    queueId UUID,
    terms TEXT[]
)
RETURNS VOID AS $$
BEGIN
    
    FOREACH term IN ARRAY terms LOOP
        DELETE FROM semantic_similarity_polarization_api_queue
        WHERE queueId = queueId AND term = term;
    END LOOP;

END;
$$ LANGUAGE plpgsql;
