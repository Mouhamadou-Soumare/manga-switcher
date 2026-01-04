-- =====================================================
-- MangaSwitcher Database Schema
-- =====================================================
-- This migration creates the complete database schema
-- for the MangaSwitcher application.
-- =====================================================

-- Table: animes
-- Stores anime metadata from MyAnimeList
CREATE TABLE IF NOT EXISTS public.animes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mal_id BIGINT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  image TEXT,
  slug TEXT UNIQUE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for animes table
CREATE UNIQUE INDEX IF NOT EXISTS animes_pkey ON public.animes USING btree (id);
CREATE UNIQUE INDEX IF NOT EXISTS animes_mal_id_key ON public.animes USING btree (mal_id);
CREATE UNIQUE INDEX IF NOT EXISTS animes_slug_key ON public.animes USING btree (slug);

COMMENT ON TABLE public.animes IS 'Stores anime information from MyAnimeList';
COMMENT ON COLUMN public.animes.mal_id IS 'MyAnimeList unique identifier';
COMMENT ON COLUMN public.animes.slug IS 'URL-friendly slug for SEO (e.g., naruto-shippuden)';

-- Table: checkpoints
-- Stores user-submitted anime-to-manga chapter mappings
CREATE TABLE IF NOT EXISTS public.checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anime_id UUID NOT NULL REFERENCES animes(id) ON DELETE CASCADE,
  mal_id BIGINT,
  type TEXT DEFAULT 'SEASON',
  season INTEGER,
  episode INTEGER,
  chapter INTEGER NOT NULL CHECK (chapter > 0),
  volume INTEGER CHECK (volume IS NULL OR volume > 0),
  label TEXT NOT NULL,
  note TEXT,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for checkpoints table
CREATE UNIQUE INDEX IF NOT EXISTS checkpoints_pkey ON public.checkpoints USING btree (id);
CREATE INDEX IF NOT EXISTS checkpoints_anime_id_idx ON public.checkpoints USING btree (anime_id);

COMMENT ON TABLE public.checkpoints IS 'User-submitted mappings between anime episodes and manga chapters';
COMMENT ON COLUMN public.checkpoints.type IS 'Type of content: SEASON, MOVIE, OVA, etc.';
COMMENT ON COLUMN public.checkpoints.chapter IS 'Manga chapter number where the anime stops';
COMMENT ON COLUMN public.checkpoints.volume IS 'Manga volume number (optional)';
COMMENT ON COLUMN public.checkpoints.label IS 'Display label (e.g., "Fin Saison 1")';

-- =====================================================
-- RPC Function: vote_checkpoint
-- =====================================================
-- Handles upvoting and downvoting of checkpoints
-- Parameters:
--   row_id: UUID of the checkpoint to vote on
--   vote_type: 'up' or 'down'
-- =====================================================
CREATE OR REPLACE FUNCTION vote_checkpoint(
  row_id UUID,
  vote_type TEXT
) RETURNS VOID AS $$
BEGIN
  IF vote_type = 'up' THEN
    UPDATE checkpoints SET upvotes = upvotes + 1 WHERE id = row_id;
  ELSIF vote_type = 'down' THEN
    UPDATE checkpoints SET downvotes = downvotes + 1 WHERE id = row_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION vote_checkpoint IS 'Increment upvotes or downvotes for a checkpoint';

-- =====================================================
-- Migrations for Existing Database
-- =====================================================
-- Run these queries separately if you already have data
-- =====================================================

-- 1. Add CASCADE DELETE to existing foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'checkpoints_anime_id_fkey'
    AND table_name = 'checkpoints'
  ) THEN
    ALTER TABLE checkpoints
      DROP CONSTRAINT checkpoints_anime_id_fkey,
      ADD CONSTRAINT checkpoints_anime_id_fkey
        FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Add CHECK constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'checkpoints_chapter_positive'
  ) THEN
    ALTER TABLE checkpoints
      ADD CONSTRAINT checkpoints_chapter_positive CHECK (chapter > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'checkpoints_volume_positive'
  ) THEN
    ALTER TABLE checkpoints
      ADD CONSTRAINT checkpoints_volume_positive CHECK (volume IS NULL OR volume > 0);
  END IF;
END $$;

-- 3. Add performance index
CREATE INDEX IF NOT EXISTS checkpoints_anime_id_idx
  ON checkpoints USING btree (anime_id);

-- 4. Generate slugs for existing animes (if any)
-- This will create URL-friendly slugs from titles
UPDATE animes
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(title, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL OR slug = '';

-- 5. Make slug NOT NULL (only run after slugs are generated)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'animes'
    AND column_name = 'slug'
    AND is_nullable = 'YES'
  ) THEN
    -- Check if all slugs are filled
    IF NOT EXISTS (SELECT 1 FROM animes WHERE slug IS NULL OR slug = '') THEN
      ALTER TABLE animes ALTER COLUMN slug SET NOT NULL;
    ELSE
      RAISE NOTICE 'Cannot set slug to NOT NULL: some animes have empty slugs';
    END IF;
  END IF;
END $$;

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'MangaSwitcher schema migration completed successfully!';
  RAISE NOTICE 'Tables created: animes, checkpoints';
  RAISE NOTICE 'Function created: vote_checkpoint';
  RAISE NOTICE 'All indexes and constraints applied';
END $$;
