-- =====================================================
-- MangaSwitch - Golden Data Schema
-- =====================================================
-- Cette migration crée le schéma pour la "Golden Data"
-- avec toutes les séries anime-manga vérifiées
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Table: series
-- Stocke toutes les séries avec leurs points de transition
-- =====================================================
CREATE TABLE IF NOT EXISTS public.series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id TEXT NOT NULL UNIQUE, -- Slug (ex: "jujutsu-kaisen")

  -- Titres
  title_en TEXT NOT NULL,
  title_jp TEXT NOT NULL,
  title_fr TEXT,

  -- Métadonnées de base
  source_material TEXT NOT NULL CHECK (source_material IN ('manga', 'light_novel', 'web_novel', 'visual_novel')),
  priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  status TEXT NOT NULL CHECK (status IN ('ongoing', 'completed', 'hiatus', 'cancelled')),
  transition_type TEXT NOT NULL CHECK (transition_type IN ('direct', 'divergent', 'original_ending', 'complex')),

  -- Dernier anime (stocké en JSONB pour flexibilité)
  last_anime JSONB NOT NULL,
  -- Structure: { event, episode?, season?, arc?, air_date? }

  -- Points de continuation
  manga_continuation JSONB,
  -- Structure: { chapter, volume?, note? }

  light_novel_continuation JSONB,
  -- Structure: { volume, chapter?, note? }

  manga_adaptation_info JSONB,
  -- Structure: { status, last_chapter?, warning? }

  -- Avertissements
  warning_flag BOOLEAN NOT NULL DEFAULT FALSE,
  warning_message TEXT,
  recommendation TEXT,

  -- Liens d'affiliation (stocké en JSONB)
  affiliate_links JSONB,
  -- Structure: { amazon_fr?, fnac?, cultura?, manga_store?, digital? }

  -- SEO (stocké en JSONB)
  seo JSONB,
  -- Structure: { description, keywords[], alternate_titles[]? }

  -- Tags (array de texte pour faciliter les requêtes)
  tags TEXT[],

  -- Score de popularité (1-10)
  popularity_score INTEGER CHECK (popularity_score >= 1 AND popularity_score <= 10),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- Index pour la recherche full-text
  search_vector tsvector
);

-- =====================================================
-- Indexes pour performance optimale
-- =====================================================

-- Index unique sur series_id
CREATE UNIQUE INDEX IF NOT EXISTS series_series_id_key ON public.series USING btree (series_id);

-- Index sur la priorité (pour filtrage rapide P0, P1, etc.)
CREATE INDEX IF NOT EXISTS series_priority_idx ON public.series USING btree (priority);

-- Index sur le source_material
CREATE INDEX IF NOT EXISTS series_source_material_idx ON public.series USING btree (source_material);

-- Index sur le statut
CREATE INDEX IF NOT EXISTS series_status_idx ON public.series USING btree (status);

-- Index sur le warning_flag
CREATE INDEX IF NOT EXISTS series_warning_flag_idx ON public.series USING btree (warning_flag) WHERE warning_flag = TRUE;

-- Index sur les tags (GIN pour recherche dans arrays)
CREATE INDEX IF NOT EXISTS series_tags_idx ON public.series USING gin (tags);

-- Index sur la popularité (pour trier)
CREATE INDEX IF NOT EXISTS series_popularity_idx ON public.series USING btree (popularity_score DESC NULLS LAST);

-- Index sur last_updated (pour trier par récence)
CREATE INDEX IF NOT EXISTS series_last_updated_idx ON public.series USING btree (last_updated DESC);

-- Index GIN sur les champs JSONB pour recherche rapide
CREATE INDEX IF NOT EXISTS series_seo_idx ON public.series USING gin (seo);
CREATE INDEX IF NOT EXISTS series_last_anime_idx ON public.series USING gin (last_anime);

-- Index full-text search (pour recherche de texte)
CREATE INDEX IF NOT EXISTS series_search_vector_idx ON public.series USING gin (search_vector);

-- =====================================================
-- Function: Mise à jour automatique du search_vector
-- =====================================================
CREATE OR REPLACE FUNCTION update_series_search_vector()
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
DROP TRIGGER IF EXISTS series_search_vector_update ON public.series;
CREATE TRIGGER series_search_vector_update
  BEFORE INSERT OR UPDATE ON public.series
  FOR EACH ROW
  EXECUTE FUNCTION update_series_search_vector();

-- =====================================================
-- Function: Mise à jour automatique de last_updated
-- =====================================================
CREATE OR REPLACE FUNCTION update_last_updated_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour last_updated automatiquement
DROP TRIGGER IF EXISTS series_last_updated_trigger ON public.series;
CREATE TRIGGER series_last_updated_trigger
  BEFORE UPDATE ON public.series
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated_timestamp();

-- =====================================================
-- RPC Function: search_series
-- =====================================================
-- Fonction optimisée pour la recherche de séries
-- avec scoring de pertinence
CREATE OR REPLACE FUNCTION search_series(
  search_query TEXT,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  series_data JSONB,
  relevance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    row_to_json(s.*)::JSONB AS series_data,
    (
      -- Score basé sur la similarité de texte
      ts_rank(s.search_vector, plainto_tsquery('english', search_query)) * 10 +

      -- Bonus pour correspondance exacte dans title_en
      CASE WHEN LOWER(s.title_en) = LOWER(search_query) THEN 20 ELSE 0 END +
      CASE WHEN LOWER(s.title_en) LIKE LOWER('%' || search_query || '%') THEN 10 ELSE 0 END +

      -- Bonus pour correspondance dans title_jp
      CASE WHEN LOWER(s.title_jp) = LOWER(search_query) THEN 20 ELSE 0 END +
      CASE WHEN LOWER(s.title_jp) LIKE LOWER('%' || search_query || '%') THEN 10 ELSE 0 END +

      -- Bonus pour correspondance dans title_fr
      CASE WHEN LOWER(s.title_fr) = LOWER(search_query) THEN 20 ELSE 0 END +
      CASE WHEN LOWER(s.title_fr) LIKE LOWER('%' || search_query || '%') THEN 10 ELSE 0 END +

      -- Bonus de priorité
      CASE s.priority
        WHEN 'P0' THEN 5
        WHEN 'P1' THEN 3
        WHEN 'P2' THEN 1
        ELSE 0
      END +

      -- Bonus de popularité
      COALESCE(s.popularity_score * 0.5, 0)
    ) AS relevance
  FROM public.series s
  WHERE
    s.search_vector @@ plainto_tsquery('english', search_query)
    OR LOWER(s.title_en) LIKE LOWER('%' || search_query || '%')
    OR LOWER(s.title_jp) LIKE LOWER('%' || search_query || '%')
    OR LOWER(s.title_fr) LIKE LOWER('%' || search_query || '%')
    OR EXISTS (
      SELECT 1 FROM unnest(s.tags) AS tag
      WHERE LOWER(tag) LIKE LOWER('%' || search_query || '%')
    )
  ORDER BY relevance DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- RPC Function: get_series_by_priority
-- =====================================================
CREATE OR REPLACE FUNCTION get_series_by_priority(
  priority_level TEXT
)
RETURNS SETOF public.series AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.series
  WHERE priority = priority_level
  ORDER BY popularity_score DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- RPC Function: get_popular_series
-- =====================================================
CREATE OR REPLACE FUNCTION get_popular_series(
  min_score INTEGER DEFAULT 8,
  result_limit INTEGER DEFAULT 10
)
RETURNS SETOF public.series AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.series
  WHERE popularity_score >= min_score
  ORDER BY popularity_score DESC NULLS LAST
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- RPC Function: get_series_by_tag
-- =====================================================
CREATE OR REPLACE FUNCTION get_series_by_tag(
  tag_name TEXT
)
RETURNS SETOF public.series AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.series
  WHERE LOWER(tag_name) = ANY(SELECT LOWER(unnest(tags)))
  ORDER BY popularity_score DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- RPC Function: get_series_with_warnings
-- =====================================================
CREATE OR REPLACE FUNCTION get_series_with_warnings()
RETURNS SETOF public.series AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.series
  WHERE warning_flag = TRUE
  ORDER BY priority ASC, popularity_score DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- RPC Function: get_recommendations
-- =====================================================
-- Recommandations basées sur les tags communs
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
  -- Récupérer les caractéristiques de la série cible
  SELECT tags, source_material, priority
  INTO target_tags, target_source, target_priority
  FROM public.series
  WHERE series_id = target_series_id;

  IF target_tags IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    row_to_json(s.*)::JSONB AS series_data,
    (
      -- Score basé sur les tags communs
      (SELECT COUNT(*) FROM unnest(s.tags) AS tag WHERE tag = ANY(target_tags)) * 10 +

      -- Bonus si même source material
      CASE WHEN s.source_material = target_source THEN 5 ELSE 0 END +

      -- Bonus si même priorité
      CASE WHEN s.priority = target_priority THEN 3 ELSE 0 END +

      -- Bonus de popularité
      COALESCE(s.popularity_score * 0.5, 0)
    )::FLOAT AS similarity_score
  FROM public.series s
  WHERE s.series_id != target_series_id
    AND s.tags && target_tags  -- Au moins un tag en commun
  ORDER BY similarity_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- RPC Function: get_database_stats
-- =====================================================
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_series', (SELECT COUNT(*) FROM public.series),
    'manga_count', (SELECT COUNT(*) FROM public.series WHERE source_material = 'manga'),
    'light_novel_count', (SELECT COUNT(*) FROM public.series WHERE source_material = 'light_novel'),
    'warning_count', (SELECT COUNT(*) FROM public.series WHERE warning_flag = TRUE),
    'completed_count', (SELECT COUNT(*) FROM public.series WHERE status = 'completed'),
    'ongoing_count', (SELECT COUNT(*) FROM public.series WHERE status = 'ongoing'),
    'priority_distribution', (
      SELECT jsonb_build_object(
        'P0', (SELECT COUNT(*) FROM public.series WHERE priority = 'P0'),
        'P1', (SELECT COUNT(*) FROM public.series WHERE priority = 'P1'),
        'P2', (SELECT COUNT(*) FROM public.series WHERE priority = 'P2'),
        'P3', (SELECT COUNT(*) FROM public.series WHERE priority = 'P3')
      )
    )
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- Comments pour documentation
-- =====================================================
COMMENT ON TABLE public.series IS 'Golden Data: Collection curatée de séries anime-manga avec points de transition vérifiés';
COMMENT ON COLUMN public.series.series_id IS 'Identifiant unique slug (ex: jujutsu-kaisen)';
COMMENT ON COLUMN public.series.priority IS 'Priorité SEO: P0=80% trafic, P1=15%, P2=4%, P3=1%';
COMMENT ON COLUMN public.series.transition_type IS 'Type de transition: direct, divergent, original_ending, complex';
COMMENT ON COLUMN public.series.warning_flag IS 'TRUE si la série nécessite un avertissement (divergence, fin originale, etc.)';
COMMENT ON COLUMN public.series.search_vector IS 'Index full-text pour recherche rapide (mis à jour automatiquement)';

-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;

-- Policy: Tout le monde peut lire les séries
CREATE POLICY "Anyone can view series" ON public.series
  FOR SELECT USING (true);

-- Policy: Seuls les utilisateurs authentifiés peuvent insérer (optionnel)
-- CREATE POLICY "Authenticated users can insert series" ON public.series
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Golden Data schema migration completed successfully!';
  RAISE NOTICE '📊 Table created: series';
  RAISE NOTICE '🔍 Indexes created: 10 performance indexes';
  RAISE NOTICE '⚙️  Functions created: 7 RPC functions';
  RAISE NOTICE '🔒 Row Level Security enabled';
END $$;
