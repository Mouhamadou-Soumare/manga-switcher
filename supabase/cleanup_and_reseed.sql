-- =====================================================
-- Cleanup Script: Remove old seed data and reseed
-- =====================================================
-- This script removes all existing checkpoint data
-- and re-inserts the corrected data without spoilers
-- =====================================================

-- Delete all existing checkpoints (cascade will handle relationships)
DELETE FROM public.checkpoints;

-- Delete all existing animes (this will also delete associated checkpoints due to CASCADE)
DELETE FROM public.animes;

-- Reset sequences if needed
-- (UUIDs don't need sequence reset)

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'All existing anime and checkpoint data has been deleted.';
  RAISE NOTICE 'You can now run the seed_checkpoints.sql file to insert the corrected data.';
END $$;
