-- Migration: Add unique constraint to vibe_checks table
-- This fixes the ON CONFLICT error by adding the required unique constraint on hashed_ip
-- 
-- Run this script to add the missing constraint to your existing vibe_checks table

-- Add unique constraint on hashed_ip for ON CONFLICT support
ALTER TABLE vibe_checks 
ADD CONSTRAINT uq_vibe_checks_hashed_ip UNIQUE (hashed_ip);

-- Optional: Add index for performance (if not already exists)
CREATE INDEX IF NOT EXISTS idx_vibe_checks_hashed_ip ON vibe_checks(hashed_ip);

-- Verification query to confirm constraint was added
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE' 
  AND tc.table_name = 'vibe_checks'
  AND tc.table_schema = 'public';
