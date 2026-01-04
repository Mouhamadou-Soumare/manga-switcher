/**
 * MangaSwitch - Data Access Layer (Supabase)
 *
 * Fonctions pour interroger la Golden Data depuis Supabase
 * Alternative à manga-data.ts (JSON statique)
 */

import { createClient } from '@supabase/supabase-js';
import type { MangaSeries, SearchResult, Priority } from './types/manga';

// Client Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Récupère toutes les séries vérifiées
 */
export async function getAllSeries(): Promise<MangaSeries[]> {
  const { data, error } = await supabase
    .from('series_metadata')
    .select('*')
    .eq('verified', true)
    .order('priority', { ascending: true })
    .order('popularity_score', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching all series:', error);
    return [];
  }

  return data as MangaSeries[];
}

/**
 * Récupère une série par son ID
 */
export async function getSeriesById(seriesId: string): Promise<MangaSeries | null> {
  const { data, error } = await supabase
    .from('series_metadata')
    .select('*')
    .eq('series_id', seriesId)
    .single();

  if (error) {
    console.error(`Error fetching series ${seriesId}:`, error);
    return null;
  }

  return data as MangaSeries;
}

/**
 * Récupère les détails complets d'une série (metadata + anime + checkpoints)
 */
export async function getSeriesDetail(seriesId: string) {
  const { data, error } = await supabase.rpc('get_series_detail', {
    target_series_id: seriesId,
  });

  if (error) {
    console.error(`Error fetching series detail ${seriesId}:`, error);
    return null;
  }

  return data;
}

/**
 * Recherche de séries avec scoring de pertinence
 */
export async function searchSeries(query: string, limit: number = 10): Promise<SearchResult[]> {
  const { data, error } = await supabase.rpc('search_series_enhanced', {
    search_query: query,
    result_limit: limit,
  });

  if (error) {
    console.error('Error searching series:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    series: item.series_data,
    relevance: item.relevance,
  }));
}

/**
 * Récupère les séries par priorité
 */
export async function getSeriesByPriority(priority: Priority): Promise<MangaSeries[]> {
  const { data, error } = await supabase
    .from('series_metadata')
    .select('*')
    .eq('priority', priority)
    .eq('verified', true)
    .order('popularity_score', { ascending: false, nullsFirst: false });

  if (error) {
    console.error(`Error fetching series by priority ${priority}:`, error);
    return [];
  }

  return data as MangaSeries[];
}

/**
 * Récupère les séries avec des avertissements
 */
export async function getSeriesWithWarnings(): Promise<MangaSeries[]> {
  const { data, error } = await supabase
    .from('series_metadata')
    .select('*')
    .eq('warning_flag', true)
    .eq('verified', true)
    .order('priority', { ascending: true })
    .order('popularity_score', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching series with warnings:', error);
    return [];
  }

  return data as MangaSeries[];
}

/**
 * Récupère les séries par type de source
 */
export async function getSeriesBySourceType(
  sourceType: 'manga' | 'light_novel' | 'web_novel' | 'visual_novel'
): Promise<MangaSeries[]> {
  const { data, error } = await supabase
    .from('series_metadata')
    .select('*')
    .eq('source_material', sourceType)
    .eq('verified', true)
    .order('popularity_score', { ascending: false, nullsFirst: false });

  if (error) {
    console.error(`Error fetching series by source type ${sourceType}:`, error);
    return [];
  }

  return data as MangaSeries[];
}

/**
 * Récupère les séries populaires
 */
export async function getPopularSeries(minScore: number = 8): Promise<MangaSeries[]> {
  const { data, error } = await supabase
    .from('series_metadata')
    .select('*')
    .gte('popularity_score', minScore)
    .eq('verified', true)
    .order('popularity_score', { ascending: false });

  if (error) {
    console.error('Error fetching popular series:', error);
    return [];
  }

  return data as MangaSeries[];
}

/**
 * Récupère les séries par tag
 */
export async function getSeriesByTag(tag: string): Promise<MangaSeries[]> {
  const { data, error } = await supabase
    .from('series_metadata')
    .select('*')
    .contains('tags', [tag.toLowerCase()])
    .eq('verified', true)
    .order('popularity_score', { ascending: false, nullsFirst: false });

  if (error) {
    console.error(`Error fetching series by tag ${tag}:`, error);
    return [];
  }

  return data as MangaSeries[];
}

/**
 * Récupère tous les tags uniques
 */
export async function getAllTags(): Promise<string[]> {
  const { data, error } = await supabase
    .from('series_metadata')
    .select('tags')
    .eq('verified', true);

  if (error) {
    console.error('Error fetching tags:', error);
    return [];
  }

  const tagsSet = new Set<string>();
  data.forEach((row: any) => {
    if (row.tags && Array.isArray(row.tags)) {
      row.tags.forEach((tag: string) => tagsSet.add(tag));
    }
  });

  return Array.from(tagsSet).sort();
}

/**
 * Récupère les statistiques de la base de données
 */
export async function getDatabaseStats() {
  const { data, error } = await supabase.rpc('get_database_stats');

  if (error) {
    console.error('Error fetching database stats:', error);
    return null;
  }

  return data;
}

/**
 * Récupère les séries récemment mises à jour
 */
export async function getRecentlyUpdatedSeries(limit: number = 10): Promise<MangaSeries[]> {
  const { data, error } = await supabase
    .from('series_metadata')
    .select('*')
    .eq('verified', true)
    .order('last_updated', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recently updated series:', error);
    return [];
  }

  return data as MangaSeries[];
}

/**
 * Récupère des recommandations basées sur une série
 */
export async function getRecommendations(seriesId: string, limit: number = 5): Promise<MangaSeries[]> {
  const { data, error } = await supabase.rpc('get_recommendations', {
    target_series_id: seriesId,
    result_limit: limit,
  });

  if (error) {
    console.error(`Error fetching recommendations for ${seriesId}:`, error);
    return [];
  }

  return (data || []).map((item: any) => item.series_data);
}

/**
 * Génère un slug URL-friendly depuis un titre
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Client Supabase pour usage direct
 */
export { supabase };

/**
 * Récupère la vue complète (anime + metadata + checkpoints)
 */
export async function getCompleteSeriesView(limit: number = 100) {
  const { data, error } = await supabase
    .from('series_complete')
    .select('*')
    .limit(limit);

  if (error) {
    console.error('Error fetching complete series view:', error);
    return [];
  }

  return data;
}

/**
 * Recherche dans la vue complète (animes + metadata)
 */
export async function searchCompleteView(query: string, limit: number = 10) {
  const { data, error } = await supabase
    .from('series_complete')
    .select('*')
    .or(`anime_title.ilike.%${query}%,title_en.ilike.%${query}%,title_jp.ilike.%${query}%`)
    .limit(limit);

  if (error) {
    console.error('Error searching complete view:', error);
    return [];
  }

  return data;
}
