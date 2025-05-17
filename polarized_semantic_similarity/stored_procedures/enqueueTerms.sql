-- PostgreSQL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'enqueueTerms') THEN
        DROP FUNCTION enqueueTerms;
    END IF;
END $$;
CREATE OR REPLACE FUNCTION enqueueTerms(
    queueId UUID,
    terms TEXT[]
)
RETURNS VOID AS $$
DECLARE
    term TEXT;
BEGIN
    -- Loop through each term in the provided array
    FOREACH term IN ARRAY terms LOOP
        -- Check if the term already exists with the same queueId
        IF NOT EXISTS (
            SELECT 1
            FROM semantic_similarity_polarization_api_queue
            WHERE queueId = queueId AND term = term
        ) THEN
            -- Insert the term with the queueId if it does not exist
            INSERT INTO semantic_similarity_polarization_api_queue (queueId, term)
            VALUES (queueId, term);

            -- Insert the term into the vector database (pseudo-code, replace with actual implementation)
            PERFORM insert_into_vector_database(queueId, term);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;