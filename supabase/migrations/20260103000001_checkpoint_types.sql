-- =====================================================
-- Migration: Enhanced Checkpoint Type System
-- =====================================================
-- Adds support for:
-- - Different content types (SEASON, MOVIE, ARC, OVA, SPECIAL)
-- - Canon vs non-canon content distinction
-- - Arc names for continuous series (One Piece, Naruto, etc.)
-- =====================================================

-- Add new fields to checkpoints table
ALTER TABLE public.checkpoints
  ADD COLUMN IF NOT EXISTS is_canon BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS arc_name TEXT;

-- Update type field constraint to support all content types
ALTER TABLE public.checkpoints
  DROP CONSTRAINT IF EXISTS checkpoints_type_check;

ALTER TABLE public.checkpoints
  ADD CONSTRAINT checkpoints_type_check
  CHECK (type IN ('SEASON', 'MOVIE', 'ARC', 'OVA', 'SPECIAL'));

-- Set default type for existing rows (backward compatibility)
UPDATE public.checkpoints
SET type = 'SEASON'
WHERE type IS NULL;

-- Make type non-nullable
ALTER TABLE public.checkpoints
  ALTER COLUMN type SET NOT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_checkpoints_type ON public.checkpoints(type);
CREATE INDEX IF NOT EXISTS idx_checkpoints_canon ON public.checkpoints(is_canon);

-- Add comment for documentation
COMMENT ON COLUMN public.checkpoints.type IS 'Type of content: SEASON (seasonal anime), MOVIE (theatrical release), ARC (story arc for continuous series), OVA/SPECIAL (additional content)';
COMMENT ON COLUMN public.checkpoints.is_canon IS 'Whether the content is part of the main storyline (canon) or filler/non-canon';
COMMENT ON COLUMN public.checkpoints.arc_name IS 'Name of the story arc for continuous series (e.g., "Marineford", "Wano")';
