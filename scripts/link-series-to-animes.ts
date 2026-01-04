#!/usr/bin/env tsx
/**
 * MangaSwitch - Script de liaison series_metadata ↔ animes
 *
 * Ce script lie automatiquement les séries de series_metadata
 * aux animes existants dans la table animes.
 *
 * Stratégie de matching :
 *   1. Recherche exacte par titre (normalisé)
 *   2. Recherche floue (similarité de chaîne)
 *   3. Recherche manuelle (confirmation utilisateur)
 *
 * Usage:
 *   npx tsx scripts/link-series-to-animes.ts
 *
 * Options:
 *   --auto : Mode automatique (pas de confirmation)
 *   --dry-run : Affiche les matches sans modifier la DB
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Charger les variables d'environnement
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Options
const isDryRun = process.argv.includes('--dry-run');
const isAuto = process.argv.includes('--auto');

/**
 * Normalise un titre pour la comparaison
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .replace(/[^a-z0-9\s]/g, '') // Garder seulement alphanumériques
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcule la similarité entre deux chaînes (Levenshtein distance simplifiée)
 */
function similarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Trouve le meilleur match pour une série
 */
function findBestMatch(
  seriesTitle: string,
  animes: Array<{ id: string; mal_id: number; title: string; slug: string }>
): { anime: any; score: number; matchType: 'exact' | 'fuzzy' | 'none' } {
  const normalizedSeries = normalizeTitle(seriesTitle);

  let bestMatch: { anime: any; score: number; matchType: 'exact' | 'fuzzy' | 'none' } = { anime: null, score: 0, matchType: 'none' as const };

  for (const anime of animes) {
    const normalizedAnime = normalizeTitle(anime.title);

    // Match exact
    if (normalizedAnime === normalizedSeries) {
      return { anime, score: 1.0, matchType: 'exact' };
    }

    // Match partiel (contient)
    if (normalizedAnime.includes(normalizedSeries) || normalizedSeries.includes(normalizedAnime)) {
      const score = 0.9;
      if (score > bestMatch.score) {
        bestMatch = { anime, score, matchType: 'fuzzy' };
      }
    }

    // Similarité de chaîne
    const simScore = similarity(normalizedAnime, normalizedSeries);
    if (simScore > bestMatch.score && simScore > 0.7) {
      bestMatch = { anime, score: simScore, matchType: 'fuzzy' };
    }
  }

  return bestMatch;
}

async function main() {
  console.log('🔗 MangaSwitch - Liaison series_metadata ↔ animes\n');

  if (isDryRun) {
    console.log('🔍 Mode DRY-RUN : Aucune modification ne sera faite\n');
  }

  if (isAuto) {
    console.log('🤖 Mode AUTO : Liaison automatique sans confirmation\n');
  }

  // Récupérer toutes les séries non liées
  console.log('📊 Récupération des données...');

  const { data: series, error: seriesError } = await supabase
    .from('series_metadata')
    .select('*')
    .is('anime_id', null);

  if (seriesError) {
    console.error('❌ Erreur lors de la récupération des séries:', seriesError);
    process.exit(1);
  }

  const { data: animes, error: animesError } = await supabase
    .from('animes')
    .select('id, mal_id, title, slug');

  if (animesError) {
    console.error('❌ Erreur lors de la récupération des animes:', animesError);
    process.exit(1);
  }

  console.log(`   ✅ ${series?.length || 0} séries à lier`);
  console.log(`   ✅ ${animes?.length || 0} animes disponibles\n`);

  if (!series || series.length === 0) {
    console.log('✨ Toutes les séries sont déjà liées !');
    return;
  }

  if (!animes || animes.length === 0) {
    console.log('⚠️  Aucun anime dans la base. Impossible de lier.');
    return;
  }

  // Statistiques
  let exactMatches = 0;
  let fuzzyMatches = 0;
  let noMatches = 0;
  let updated = 0;

  console.log('🔍 Recherche des correspondances...\n');

  for (const serie of series) {
    const match = findBestMatch(serie.title_en, animes);

    if (match.matchType === 'none') {
      console.log(`❌ Aucun match : ${serie.title_en} (${serie.series_id})`);
      noMatches++;
      continue;
    }

    const emoji = match.matchType === 'exact' ? '✅' : '🔶';
    const matchLabel = match.matchType === 'exact' ? 'EXACT' : `FUZZY (${(match.score * 100).toFixed(0)}%)`;

    console.log(`${emoji} ${matchLabel}: ${serie.title_en}`);
    console.log(`   → ${match.anime.title} (MAL: ${match.anime.mal_id})`);

    if (match.matchType === 'exact') {
      exactMatches++;
    } else {
      fuzzyMatches++;
    }

    // Mise à jour de la base de données
    if (!isDryRun) {
      const { error: updateError } = await supabase
        .from('series_metadata')
        .update({
          anime_id: match.anime.id,
          mal_id: match.anime.mal_id,
        })
        .eq('id', serie.id);

      if (updateError) {
        console.log(`   ❌ Erreur lors de la mise à jour: ${updateError.message}`);
      } else {
        console.log(`   ✅ Lié avec succès`);
        updated++;
      }
    }

    console.log('');
  }

  // Résumé
  console.log('='.repeat(60));
  console.log('📊 RÉSUMÉ DE LA LIAISON');
  console.log('='.repeat(60));
  console.log(`✅ Matches exacts:       ${exactMatches}`);
  console.log(`🔶 Matches approximatifs: ${fuzzyMatches}`);
  console.log(`❌ Aucun match:          ${noMatches}`);
  console.log(`📊 Total:                ${series.length}`);

  if (!isDryRun) {
    console.log(`\n💾 Séries mises à jour:   ${updated}`);
  } else {
    console.log(`\n🔍 Mode DRY-RUN : Aucune modification effectuée`);
    console.log(`   Pour appliquer les changements, relancez sans --dry-run`);
  }

  console.log('');

  // Suggestions pour les non-matchés
  if (noMatches > 0) {
    console.log('💡 Suggestions pour les séries non liées:');
    console.log('   1. Ajoutez ces animes dans la table animes via MyAnimeList');
    console.log('   2. Ou liez-les manuellement via SQL:');
    console.log('      UPDATE series_metadata SET mal_id = XXX, anime_id = (SELECT id FROM animes WHERE mal_id = XXX) WHERE series_id = \'...\';');
    console.log('');
  }

  // Vérification finale
  console.log('🔍 Vérification finale...');
  const { data: linkedSeries } = await supabase
    .from('series_metadata')
    .select('*')
    .not('anime_id', 'is', null);

  const { data: totalSeries } = await supabase
    .from('series_metadata')
    .select('count');

  console.log(`   ✅ ${linkedSeries?.length || 0} / ${totalSeries?.[0]?.count || 0} séries liées`);

  const percentage = totalSeries?.[0]?.count
    ? ((linkedSeries?.length || 0) / totalSeries[0].count * 100).toFixed(1)
    : 0;

  console.log(`   📊 Taux de liaison: ${percentage}%\n`);

  console.log('✨ Liaison terminée !\n');
}

main().catch((error) => {
  console.error('\n💥 Erreur fatale:', error);
  process.exit(1);
});
