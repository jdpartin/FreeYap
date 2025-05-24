-- Purpose: Defines the UserQueueInfo composite type for use in database functions.

-- Create a composite type to represent queue user information
CREATE TYPE UserQueueInfo AS (
    session_id UUID,
    topics TEXT[],
    inserted_at TIMESTAMP
);
