/**
 * MangaSwitch - Data Access Layer
 *
 * Ce fichier fournit des fonctions utilitaires pour interroger la base de données
 * manga-transitions.json de manière type-safe et performante.
 */

import type { MangaDatabase, MangaSeries, SearchResult, Priority } from './types/manga';
import mangaData from '../data/manga-transitions.json';

// Cast des données JSON vers le type TypeScript
const database: MangaDatabase = mangaData as MangaDatabase;

/**
 * Récupère toutes les séries de la base de données
 */
export function getAllSeries(): MangaSeries[] {
  return database.series;
}

/**
 * Récupère une série par son ID
 */
export function getSeriesById(seriesId: string): MangaSeries | null {
  const series = database.series.find((s) => s.series_id === seriesId);
  return series || null;
}

/**
 * Recherche des séries par titre (anglais, japonais, français, ou titres alternatifs)
 * @param query - Terme de recherche
 * @param limit - Nombre maximum de résultats (par défaut: 10)
 */
export function searchSeries(query: string, limit: number = 10): SearchResult[] {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return [];
  }

  const results: SearchResult[] = [];

  for (const series of database.series) {
    let relevance = 0;

    // Recherche dans le titre anglais
    if (series.title_en.toLowerCase().includes(normalizedQuery)) {
      relevance += 10;
      if (series.title_en.toLowerCase() === normalizedQuery) {
        relevance += 20; // Bonus pour correspondance exacte
      }
    }

    // Recherche dans le titre japonais
    if (series.title_jp.toLowerCase().includes(normalizedQuery)) {
      relevance += 10;
      if (series.title_jp.toLowerCase() === normalizedQuery) {
        relevance += 20;
      }
    }

    // Recherche dans le titre français
    if (series.title_fr && series.title_fr.toLowerCase().includes(normalizedQuery)) {
      relevance += 10;
      if (series.title_fr.toLowerCase() === normalizedQuery) {
        relevance += 20;
      }
    }

    // Recherche dans les titres alternatifs
    if (series.seo?.alternate_titles) {
      for (const altTitle of series.seo.alternate_titles) {
        if (altTitle.toLowerCase().includes(normalizedQuery)) {
          relevance += 5;
          if (altTitle.toLowerCase() === normalizedQuery) {
            relevance += 15;
          }
        }
      }
    }

    // Bonus de priorité
    if (series.priority === 'P0') relevance += 5;
    if (series.priority === 'P1') relevance += 3;

    // Bonus de popularité
    if (series.popularity_score) {
      relevance += series.popularity_score * 0.5;
    }

    if (relevance > 0) {
      results.push({ series, relevance });
    }
  }

  // Trier par pertinence (décroissant) et limiter les résultats
  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

/**
 * Récupère les séries par priorité
 */
export function getSeriesByPriority(priority: Priority): MangaSeries[] {
  return database.series.filter((s) => s.priority === priority);
}

/**
 * Récupère les séries avec des avertissements (divergences, fins originales, etc.)
 */
export function getSeriesWithWarnings(): MangaSeries[] {
  return database.series.filter((s) => s.warning_flag === true);
}

/**
 * Récupère les séries par type de source
 */
export function getSeriesBySourceType(sourceType: 'manga' | 'light_novel' | 'web_novel' | 'visual_novel'): MangaSeries[] {
  return database.series.filter((s) => s.source_material === sourceType);
}

/**
 * Récupère les séries populaires (score >= 8)
 */
export function getPopularSeries(minScore: number = 8): MangaSeries[] {
  return database.series
    .filter((s) => s.popularity_score && s.popularity_score >= minScore)
    .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
}

/**
 * Récupère les séries par tags
 */
export function getSeriesByTag(tag: string): MangaSeries[] {
  return database.series.filter((s) => s.tags?.includes(tag.toLowerCase()));
}

/**
 * Récupère tous les tags uniques de la base de données
 */
export function getAllTags(): string[] {
  const tagsSet = new Set<string>();
  database.series.forEach((s) => {
    s.tags?.forEach((tag) => tagsSet.add(tag));
  });
  return Array.from(tagsSet).sort();
}

/**
 * Récupère les statistiques de la base de données
 */
export function getDatabaseStats() {
  const totalSeries = database.series.length;
  const mangaCount = database.series.filter((s) => s.source_material === 'manga').length;
  const lightNovelCount = database.series.filter((s) => s.source_material === 'light_novel').length;
  const warningCount = database.series.filter((s) => s.warning_flag).length;
  const completedCount = database.series.filter((s) => s.status === 'completed').length;
  const ongoingCount = database.series.filter((s) => s.status === 'ongoing').length;

  const priorityDistribution = {
    P0: database.series.filter((s) => s.priority === 'P0').length,
    P1: database.series.filter((s) => s.priority === 'P1').length,
    P2: database.series.filter((s) => s.priority === 'P2').length,
    P3: database.series.filter((s) => s.priority === 'P3').length,
  };

  return {
    totalSeries,
    mangaCount,
    lightNovelCount,
    warningCount,
    completedCount,
    ongoingCount,
    priorityDistribution,
    schemaVersion: database.schema_version,
    lastUpdated: database.last_updated,
  };
}

/**
 * Récupère les séries récemment mises à jour
 */
export function getRecentlyUpdatedSeries(limit: number = 10): MangaSeries[] {
  return database.series
    .filter((s) => s.last_updated)
    .sort((a, b) => {
      const dateA = new Date(a.last_updated!).getTime();
      const dateB = new Date(b.last_updated!).getTime();
      return dateB - dateA;
    })
    .slice(0, limit);
}

/**
 * Génère un slug URL-friendly depuis un titre
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Récupère des recommandations basées sur une série
 * (Basé sur les tags communs et la priorité)
 */
export function getRecommendations(seriesId: string, limit: number = 5): MangaSeries[] {
  const targetSeries = getSeriesById(seriesId);
  if (!targetSeries || !targetSeries.tags) {
    return [];
  }

  const targetTags = new Set(targetSeries.tags);
  const recommendations: Array<{ series: MangaSeries; score: number }> = [];

  for (const series of database.series) {
    if (series.series_id === seriesId) continue; // Skip la série elle-même

    let score = 0;

    // Score basé sur les tags communs
    if (series.tags) {
      const commonTags = series.tags.filter((tag) => targetTags.has(tag));
      score += commonTags.length * 10;
    }

    // Bonus si même source material
    if (series.source_material === targetSeries.source_material) {
      score += 5;
    }

    // Bonus si même priorité
    if (series.priority === targetSeries.priority) {
      score += 3;
    }

    // Bonus de popularité
    if (series.popularity_score) {
      score += series.popularity_score * 0.5;
    }

    if (score > 0) {
      recommendations.push({ series, score });
    }
  }

  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.series);
}

/**
 * Export par défaut de la base de données
 */
export default database;
