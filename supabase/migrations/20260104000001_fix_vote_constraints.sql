-- =====================================================
-- Migration: Add Vote Count Constraints
-- =====================================================
-- Ensures upvotes and downvotes cannot be negative
-- =====================================================

-- Add CHECK constraints to prevent negative vote counts
DO $$
BEGIN
  -- Add constraint for upvotes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'checkpoints_upvotes_non_negative'
  ) THEN
    ALTER TABLE checkpoints
      ADD CONSTRAINT checkpoints_upvotes_non_negative CHECK (upvotes >= 0);
    RAISE NOTICE 'Added constraint: checkpoints_upvotes_non_negative';
  END IF;

  -- Add constraint for downvotes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'checkpoints_downvotes_non_negative'
  ) THEN
    ALTER TABLE checkpoints
      ADD CONSTRAINT checkpoints_downvotes_non_negative CHECK (downvotes >= 0);
    RAISE NOTICE 'Added constraint: checkpoints_downvotes_non_negative';
  END IF;
END $$;

-- Fix any existing negative values (if any)
UPDATE checkpoints
SET upvotes = 0
WHERE upvotes < 0;

UPDATE checkpoints
SET downvotes = 0
WHERE downvotes < 0;

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Vote constraints migration completed successfully!';
  RAISE NOTICE 'Vote counts are now guaranteed to be non-negative';
END $$;
