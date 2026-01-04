-- =====================================================
-- MangaSwitch - Series Metadata (Golden Data)
-- =====================================================
-- Cette migration ajoute la table series_metadata qui
-- enrichit les animes existants avec la Golden Data
-- vérifiée et curatée.
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: series_metadata
-- Enrichit les animes avec des données vérifiées
-- =====================================================
CREATE TABLE IF NOT EXISTS public.series_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Référence à l'anime (peut être NULL si pas encore lié)
  anime_id UUID REFERENCES public.animes(id) ON DELETE SET NULL,
  mal_id BIGINT UNIQUE, -- Pour lier même sans anime_id

  -- Identifiant unique pour SEO/URLs
  series_id TEXT NOT NULL UNIQUE, -- Slug (ex: "jujutsu-kaisen")

  -- Titres enrichis
  title_en TEXT NOT NULL,
  title_jp TEXT NOT NULL,
  title_fr TEXT,

  -- Métadonnées de classification
  source_material TEXT NOT NULL CHECK (source_material IN ('manga', 'light_novel', 'web_novel', 'visual_novel')),
  priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  status TEXT NOT NULL CHECK (status IN ('ongoing', 'completed', 'hiatus', 'cancelled')),
  transition_type TEXT NOT NULL CHECK (transition_type IN ('direct', 'divergent', 'original_ending', 'complex')),

  -- Informations sur le dernier anime (JSONB pour flexibilité)
  last_anime JSONB NOT NULL,
  -- Structure: { event, episode?, season?, arc?, air_date? }

  -- Points de continuation officiels
  manga_continuation JSONB,
  -- Structure: { chapter, volume?, note? }

  light_novel_continuation JSONB,
  -- Structure: { volume, chapter?, note? }

  -- Informations sur l'adaptation manga (pour les LN)
  manga_adaptation_info JSONB,
  -- Structure: { status, last_chapter?, warning? }

  -- Système d'avertissement
  warning_flag BOOLEAN NOT NULL DEFAULT FALSE,
  warning_message TEXT,
  recommendation TEXT,

  -- Liens d'affiliation (JSONB)
  affiliate_links JSONB DEFAULT '{}'::jsonb,
  -- Structure: { amazon_fr?, fnac?, cultura?, manga_store?, digital? }

  -- SEO optimisé (JSONB)
  seo JSONB,
  -- Structure: { description, keywords[], alternate_titles[]? }

  -- Tags pour filtrage et recommandations
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Score de popularité (1-10)
  popularity_score INTEGER CHECK (popularity_score >= 1 AND popularity_score <= 10),

  -- Indicateur de vérification
  verified BOOLEAN NOT NULL DEFAULT TRUE, -- TRUE = Golden Data officielle

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Index pour la recherche full-text
  search_vector tsvector
);

-- =====================================================
-- Indexes pour performance optimale
-- =====================================================

-- Index unique sur series_id (pour URLs SEO)
CREATE UNIQUE INDEX IF NOT EXISTS series_metadata_series_id_key ON public.series_metadata USING btree (series_id);

-- Index sur anime_id (jointure rapide)
CREATE INDEX IF NOT EXISTS series_metadata_anime_id_idx ON public.series_metadata USING btree (anime_id);

-- Index unique sur mal_id
CREATE UNIQUE INDEX IF NOT EXISTS series_metadata_mal_id_key ON public.series_metadata USING btree (mal_id) WHERE mal_id IS NOT NULL;

-- Index sur la priorité (pour filtrage P0, P1, etc.)
CREATE INDEX IF NOT EXISTS series_metadata_priority_idx ON public.series_metadata USING btree (priority);

-- Index sur le source_material
CREATE INDEX IF NOT EXISTS series_metadata_source_idx ON public.series_metadata USING btree (source_material);

-- Index sur le statut
CREATE INDEX IF NOT EXISTS series_metadata_status_idx ON public.series_metadata USING btree (status);

-- Index sur warning_flag (filtre rapide des séries problématiques)
CREATE INDEX IF NOT EXISTS series_metadata_warning_idx ON public.series_metadata USING btree (warning_flag) WHERE warning_flag = TRUE;

-- Index GIN sur les tags (recherche dans arrays)
CREATE INDEX IF NOT EXISTS series_metadata_tags_idx ON public.series_metadata USING gin (tags);

-- Index sur la popularité (tri)
CREATE INDEX IF NOT EXISTS series_metadata_popularity_idx ON public.series_metadata USING btree (popularity_score DESC NULLS LAST);

-- Index sur last_updated (tri par récence)
CREATE INDEX IF NOT EXISTS series_metadata_updated_idx ON public.series_metadata USING btree (last_updated DESC);

-- Index GIN sur JSONB pour recherche rapide
CREATE INDEX IF NOT EXISTS series_metadata_seo_idx ON public.series_metadata USING gin (seo);
CREATE INDEX IF NOT EXISTS series_metadata_last_anime_idx ON public.series_metadata USING gin (last_anime);

-- Index full-text search
CREATE INDEX IF NOT EXISTS series_metadata_search_idx ON public.series_metadata USING gin (search_vector);

-- Index sur verified
CREATE INDEX IF NOT EXISTS series_metadata_verified_idx ON public.series_metadata USING btree (verified) WHERE verified = TRUE;

-- =====================================================
-- Function: Mise à jour automatique du search_vector
-- =====================================================
CREATE OR REPLACE FUNCTION update_series_metadata_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title_en, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.title_jp, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(NEW.title_fr, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour search_vector automatiquement
DROP TRIGGER IF EXISTS series_metadata_search_update ON public.series_metadata;
CREATE TRIGGER series_metadata_search_update
  BEFORE INSERT OR UPDATE ON public.series_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_series_metadata_search_vector();

-- =====================================================
-- Function: Mise à jour automatique de last_updated
-- =====================================================
CREATE OR REPLACE FUNCTION update_series_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour last_updated
DROP TRIGGER IF EXISTS series_metadata_timestamp_trigger ON public.series_metadata;
CREATE TRIGGER series_metadata_timestamp_trigger
  BEFORE UPDATE ON public.series_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_series_metadata_timestamp();

-- =====================================================
-- Vue combinée: series_complete
-- Combine animes + series_metadata + meilleurs checkpoints
-- =====================================================
CREATE OR REPLACE VIEW series_complete AS
SELECT
  a.id as anime_id,
  a.mal_id,
  a.title as anime_title,
  a.image,
  a.slug as anime_slug,
  sm.id as metadata_id,
  sm.series_id,
  sm.title_en,
  sm.title_jp,
  sm.title_fr,
  sm.source_material,
  sm.priority,
  sm.status,
  sm.transition_type,
  sm.last_anime,
  sm.manga_continuation as official_continuation,
  sm.light_novel_continuation,
  sm.manga_adaptation_info,
  sm.warning_flag,
  sm.warning_message,
  sm.recommendation,
  sm.affiliate_links,
  sm.seo,
  sm.tags,
  sm.popularity_score,
  sm.verified,
  sm.last_updated as metadata_updated,
  -- Meilleur checkpoint communautaire (le plus voté)
  (
    SELECT jsonb_build_object(
      'chapter', c.chapter,
      'volume', c.volume,
      'label', c.label,
      'note', c.note,
      'upvotes', c.upvotes,
      'downvotes', c.downvotes,
      'score', c.upvotes - c.downvotes
    )
    FROM checkpoints c
    WHERE c.anime_id = a.id
    ORDER BY (c.upvotes - c.downvotes) DESC
    LIMIT 1
  ) as community_checkpoint,
  -- Nombre total de checkpoints communautaires
  (SELECT COUNT(*) FROM checkpoints WHERE anime_id = a.id) as community_checkpoints_count
FROM public.animes a
LEFT JOIN public.series_metadata sm ON a.id = sm.anime_id OR a.mal_id = sm.mal_id;

COMMENT ON VIEW series_complete IS 'Vue complète combinant animes, métadonnées vérifiées et checkpoints communautaires';

-- =====================================================
-- RPC Function: search_series_enhanced
-- Recherche améliorée dans animes + metadata
-- =====================================================
CREATE OR REPLACE FUNCTION search_series_enhanced(
  search_query TEXT,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  series_data JSONB,
  relevance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH metadata_results AS (
    SELECT
      sm.*,
      (
        -- Score de recherche
        ts_rank(sm.search_vector, plainto_tsquery('english', search_query)) * 10 +
        CASE WHEN LOWER(sm.title_en) = LOWER(search_query) THEN 20 ELSE 0 END +
        CASE WHEN LOWER(sm.title_en) LIKE LOWER('%' || search_query || '%') THEN 10 ELSE 0 END +
        CASE WHEN LOWER(sm.title_jp) = LOWER(search_query) THEN 20 ELSE 0 END +
        CASE WHEN LOWER(sm.title_jp) LIKE LOWER('%' || search_query || '%') THEN 10 ELSE 0 END +
        CASE WHEN LOWER(sm.title_fr) = LOWER(search_query) THEN 20 ELSE 0 END +
        CASE WHEN LOWER(sm.title_fr) LIKE LOWER('%' || search_query || '%') THEN 10 ELSE 0 END +
        CASE sm.priority WHEN 'P0' THEN 5 WHEN 'P1' THEN 3 WHEN 'P2' THEN 1 ELSE 0 END +
        COALESCE(sm.popularity_score * 0.5, 0)
      ) AS score
    FROM public.series_metadata sm
    WHERE
      sm.search_vector @@ plainto_tsquery('english', search_query)
      OR LOWER(sm.title_en) LIKE LOWER('%' || search_query || '%')
      OR LOWER(sm.title_jp) LIKE LOWER('%' || search_query || '%')
      OR LOWER(sm.title_fr) LIKE LOWER('%' || search_query || '%')
  ),
  anime_results AS (
    SELECT
      a.*,
      (
        CASE WHEN LOWER(a.title) = LOWER(search_query) THEN 15 ELSE 0 END +
        CASE WHEN LOWER(a.title) LIKE LOWER('%' || search_query || '%') THEN 8 ELSE 0 END
      ) AS score
    FROM public.animes a
    WHERE LOWER(a.title) LIKE LOWER('%' || search_query || '%')
      AND NOT EXISTS (SELECT 1 FROM metadata_results mr WHERE mr.anime_id = a.id OR mr.mal_id = a.mal_id)
  )
  SELECT
    row_to_json(mr.*)::JSONB,
    mr.score
  FROM metadata_results mr
  WHERE mr.score > 0
  UNION ALL
  SELECT
    row_to_json(ar.*)::JSONB,
    ar.score
  FROM anime_results ar
  WHERE ar.score > 0
  ORDER BY relevance DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- RPC Function: get_series_detail
-- Récupère les détails complets (metadata + checkpoints)
-- =====================================================
CREATE OR REPLACE FUNCTION get_series_detail(
  target_series_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'metadata', row_to_json(sm.*)::JSONB,
    'anime', (
      SELECT row_to_json(a.*)::JSONB
      FROM animes a
      WHERE a.id = sm.anime_id OR a.mal_id = sm.mal_id
      LIMIT 1
    ),
    'community_checkpoints', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'chapter', c.chapter,
          'volume', c.volume,
          'label', c.label,
          'note', c.note,
          'upvotes', c.upvotes,
          'downvotes', c.downvotes,
          'score', c.upvotes - c.downvotes,
          'created_at', c.created_at
        ) ORDER BY (c.upvotes - c.downvotes) DESC
      )
      FROM checkpoints c
      WHERE c.anime_id = sm.anime_id
    )
  )
  INTO result
  FROM series_metadata sm
  WHERE sm.series_id = target_series_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- RPC Function: get_recommendations
-- Recommandations basées sur les tags
-- =====================================================
CREATE OR REPLACE FUNCTION get_recommendations(
  target_series_id TEXT,
  result_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  series_data JSONB,
  similarity_score FLOAT
) AS $$
DECLARE
  target_tags TEXT[];
  target_source TEXT;
  target_priority TEXT;
BEGIN
  SELECT tags, source_material, priority
  INTO target_tags, target_source, target_priority
  FROM public.series_metadata
  WHERE series_id = target_series_id;

  IF target_tags IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    row_to_json(sm.*)::JSONB AS series_data,
    (
      (SELECT COUNT(*) FROM unnest(sm.tags) AS tag WHERE tag = ANY(target_tags)) * 10 +
      CASE WHEN sm.source_material = target_source THEN 5 ELSE 0 END +
      CASE WHEN sm.priority = target_priority THEN 3 ELSE 0 END +
      COALESCE(sm.popularity_score * 0.5, 0)
    )::FLOAT AS similarity_score
  FROM public.series_metadata sm
  WHERE sm.series_id != target_series_id
    AND sm.tags && target_tags
  ORDER BY similarity_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- RPC Function: get_database_stats
-- Statistiques globales
-- =====================================================
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_series', (SELECT COUNT(*) FROM public.series_metadata),
    'total_animes', (SELECT COUNT(*) FROM public.animes),
    'total_checkpoints', (SELECT COUNT(*) FROM public.checkpoints),
    'verified_series', (SELECT COUNT(*) FROM public.series_metadata WHERE verified = TRUE),
    'manga_count', (SELECT COUNT(*) FROM public.series_metadata WHERE source_material = 'manga'),
    'light_novel_count', (SELECT COUNT(*) FROM public.series_metadata WHERE source_material = 'light_novel'),
    'warning_count', (SELECT COUNT(*) FROM public.series_metadata WHERE warning_flag = TRUE),
    'completed_count', (SELECT COUNT(*) FROM public.series_metadata WHERE status = 'completed'),
    'ongoing_count', (SELECT COUNT(*) FROM public.series_metadata WHERE status = 'ongoing'),
    'priority_distribution', (
      SELECT jsonb_build_object(
        'P0', (SELECT COUNT(*) FROM public.series_metadata WHERE priority = 'P0'),
        'P1', (SELECT COUNT(*) FROM public.series_metadata WHERE priority = 'P1'),
        'P2', (SELECT COUNT(*) FROM public.series_metadata WHERE priority = 'P2'),
        'P3', (SELECT COUNT(*) FROM public.series_metadata WHERE priority = 'P3')
      )
    )
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.series_metadata ENABLE ROW LEVEL SECURITY;

-- Policy: Tout le monde peut lire
CREATE POLICY "Anyone can view series metadata" ON public.series_metadata
  FOR SELECT USING (true);

-- Policy: Seuls les admins peuvent modifier (optionnel)
-- CREATE POLICY "Only admins can modify metadata" ON public.series_metadata
--   FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- =====================================================
-- Comments pour documentation
-- =====================================================
COMMENT ON TABLE public.series_metadata IS 'Golden Data: Métadonnées vérifiées enrichissant les animes avec points de transition officiels';
COMMENT ON COLUMN public.series_metadata.anime_id IS 'Référence à la table animes (peut être NULL si pas encore lié)';
COMMENT ON COLUMN public.series_metadata.mal_id IS 'MyAnimeList ID pour liaison automatique';
COMMENT ON COLUMN public.series_metadata.series_id IS 'Slug unique pour URLs SEO (ex: jujutsu-kaisen)';
COMMENT ON COLUMN public.series_metadata.priority IS 'Priorité SEO: P0=80% trafic, P1=15%, P2=4%, P3=1%';
COMMENT ON COLUMN public.series_metadata.verified IS 'TRUE = Golden Data officielle vérifiée';
COMMENT ON COLUMN public.series_metadata.warning_flag IS 'TRUE si avertissement nécessaire (divergence, fin originale, etc.)';

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Series Metadata schema created successfully!';
  RAISE NOTICE '📊 Table: series_metadata (Golden Data)';
  RAISE NOTICE '👁️  View: series_complete (animes + metadata + checkpoints)';
  RAISE NOTICE '🔍 Indexes: 15 performance indexes';
  RAISE NOTICE '⚙️  Functions: 4 RPC functions';
  RAISE NOTICE '🔒 Row Level Security: enabled';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '   1. Run seed script to import Golden Data';
  RAISE NOTICE '   2. Link metadata to existing animes via mal_id';
  RAISE NOTICE '   3. Update frontend to use series_complete view';
END $$;
