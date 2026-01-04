#!/usr/bin/env tsx
/**
 * MangaSwitch - Script de seed pour la Golden Data
 *
 * Ce script importe les données de data/manga-transitions.json
 * dans la table series_metadata de Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-golden-data.ts
 *
 * Options:
 *   --clean : Nettoie les données existantes avant l'import
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import goldenData from '../data/manga-transitions.json';

// Charger les variables d'environnement depuis .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Utiliser la service role key pour bypasser le RLS lors du seed
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY (ou SUPABASE_SERVICE_ROLE_KEY pour le seed)');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Utilisation de la clé ANON.');
  console.warn('   Si le RLS bloque l\'insertion, ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env.local');
  console.warn('   Ou exécutez la migration: supabase/migrations/20260104120000_allow_insert_metadata.sql\n');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface MangaSeries {
  series_id: string;
  title_en: string;
  title_jp: string;
  title_fr?: string;
  source_material: string;
  priority: string;
  last_anime: any;
  manga_continuation?: any;
  light_novel_continuation?: any;
  manga_adaptation_info?: any;
  status: string;
  transition_type: string;
  warning_flag: boolean;
  warning_message?: string;
  recommendation?: string;
  affiliate_links?: any;
  seo?: any;
  tags?: string[];
  popularity_score?: number;
  last_updated?: string;
}

async function main() {
  const cleanMode = process.argv.includes('--clean');

  console.log('🚀 MangaSwitch - Golden Data Seed\n');
  console.log(`📊 Données à importer: ${goldenData.total_series} séries`);
  console.log(`📅 Version: ${goldenData.schema_version}`);
  console.log(`🔄 Mode: ${cleanMode ? 'CLEAN & IMPORT' : 'IMPORT ONLY'}\n`);

  // Test connexion
  const { data: testData, error: testError } = await supabase
    .from('series_metadata')
    .select('count')
    .limit(0);

  if (testError) {
    console.error('❌ Erreur de connexion à Supabase:', testError.message);
    console.error('   Assurez-vous que la migration 20260104110000_series_metadata.sql a été exécutée.\n');
    process.exit(1);
  }

  console.log('✅ Connexion à Supabase établie\n');

  // Nettoyage si demandé
  if (cleanMode) {
    console.log('🧹 Nettoyage des données existantes...');
    const { error: deleteError } = await supabase
      .from('series_metadata')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.warn('⚠️  Attention lors du nettoyage:', deleteError.message);
    } else {
      console.log('✅ Données existantes supprimées\n');
    }
  }

  // Import des données
  console.log('📥 Import des séries...\n');

  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ series: string; error: string }> = [];

  const BATCH_SIZE = 20;

  for (let i = 0; i < goldenData.series.length; i += BATCH_SIZE) {
    const batch = goldenData.series.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(goldenData.series.length / BATCH_SIZE);

    console.log(`   Batch ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + BATCH_SIZE, goldenData.series.length)})...`);

    // Préparer les données
    const seriesData = batch.map((series: MangaSeries) => ({
      series_id: series.series_id,
      mal_id: null, // À remplir manuellement ou via script de liaison
      anime_id: null, // À remplir automatiquement par trigger ou script
      title_en: series.title_en,
      title_jp: series.title_jp,
      title_fr: series.title_fr || null,
      source_material: series.source_material,
      priority: series.priority,
      last_anime: series.last_anime,
      manga_continuation: series.manga_continuation || null,
      light_novel_continuation: series.light_novel_continuation || null,
      manga_adaptation_info: series.manga_adaptation_info || null,
      status: series.status,
      transition_type: series.transition_type,
      warning_flag: series.warning_flag,
      warning_message: series.warning_message || null,
      recommendation: series.recommendation || null,
      affiliate_links: series.affiliate_links || {},
      seo: series.seo || null,
      tags: series.tags || [],
      popularity_score: series.popularity_score || null,
      verified: true,
      last_updated: series.last_updated || goldenData.last_updated,
    }));

    const { data, error } = await supabase
      .from('series_metadata')
      .insert(seriesData)
      .select('series_id');

    if (error) {
      console.error(`   ❌ Erreur batch ${batchNum}:`, error.message);
      errorCount += batch.length;
      batch.forEach((s: MangaSeries) => {
        errors.push({ series: s.series_id, error: error.message });
      });
    } else {
      const inserted = data?.length || 0;
      console.log(`   ✅ ${inserted} séries insérées`);
      successCount += inserted;
    }
  }

  // Résumé
  console.log('\n' + '='.repeat(50));
  console.log('📈 RÉSUMÉ DE L\'IMPORT');
  console.log('='.repeat(50));
  console.log(`✅ Succès:  ${successCount} séries`);
  console.log(`❌ Erreurs: ${errorCount} séries`);
  console.log(`📊 Total:   ${goldenData.total_series} séries\n`);

  if (errors.length > 0 && errors.length <= 10) {
    console.log('❌ Erreurs détaillées:');
    errors.forEach(({ series, error }) => {
      console.log(`   - ${series}: ${error}`);
    });
    console.log('');
  }

  // Statistiques
  console.log('📊 Vérification des statistiques...\n');

  const { data: stats, error: statsError } = await supabase.rpc('get_database_stats');

  if (statsError) {
    console.warn('⚠️  Impossible de récupérer les statistiques:', statsError.message);
  } else if (stats) {
    console.log('   Base de données:');
    console.log(`   ├─ Séries vérifiées: ${stats.verified_series}`);
    console.log(`   ├─ Total animes: ${stats.total_animes}`);
    console.log(`   ├─ Total checkpoints: ${stats.total_checkpoints}`);
    console.log(`   │`);
    console.log(`   ├─ Mangas: ${stats.manga_count}`);
    console.log(`   ├─ Light Novels: ${stats.light_novel_count}`);
    console.log(`   ├─ Avec avertissements: ${stats.warning_count}`);
    console.log(`   │`);
    console.log(`   ├─ En cours: ${stats.ongoing_count}`);
    console.log(`   ├─ Terminées: ${stats.completed_count}`);
    console.log(`   │`);
    console.log(`   └─ Par priorité:`);
    console.log(`      ├─ P0: ${stats.priority_distribution.P0} (80% trafic)`);
    console.log(`      ├─ P1: ${stats.priority_distribution.P1} (15% trafic)`);
    console.log(`      ├─ P2: ${stats.priority_distribution.P2} (4% trafic)`);
    console.log(`      └─ P3: ${stats.priority_distribution.P3} (1% trafic)`);
    console.log('');
  }

  // Tests rapides
  console.log('🔍 Tests de fonctionnalités...\n');

  // Test 1: Recherche
  const { data: searchResults } = await supabase.rpc('search_series_enhanced', {
    search_query: 'jujutsu',
    result_limit: 3,
  });

  if (searchResults && searchResults.length > 0) {
    console.log(`   ✅ Recherche "jujutsu": ${searchResults.length} résultats`);
    console.log(`      Premier: ${searchResults[0].series_data.title_en} (score: ${searchResults[0].relevance.toFixed(1)})`);
  } else {
    console.log('   ⚠️  Recherche "jujutsu": aucun résultat');
  }

  // Test 2: Récupération par ID
  const { data: jjk } = await supabase
    .from('series_metadata')
    .select('*')
    .eq('series_id', 'jujutsu-kaisen')
    .single();

  if (jjk) {
    console.log(`   ✅ Série "jujutsu-kaisen": trouvée`);
    console.log(`      Priorité: ${jjk.priority}, Tags: ${jjk.tags?.slice(0, 3).join(', ')}`);
  } else {
    console.log('   ⚠️  Série "jujutsu-kaisen": non trouvée');
  }

  // Test 3: Recommandations
  const { data: recs } = await supabase.rpc('get_recommendations', {
    target_series_id: 'jujutsu-kaisen',
    result_limit: 3,
  });

  if (recs && recs.length > 0) {
    console.log(`   ✅ Recommandations pour "jujutsu-kaisen": ${recs.length} résultats`);
    console.log(`      Première: ${recs[0].series_data.title_en} (score: ${recs[0].similarity_score.toFixed(1)})`);
  } else {
    console.log('   ⚠️  Recommandations: aucune trouvée');
  }

  // Test 4: Vue complète
  const { data: complete, error: completeError } = await supabase
    .from('series_complete')
    .select('*')
    .limit(1);

  if (!completeError && complete && complete.length > 0) {
    console.log(`   ✅ Vue "series_complete": fonctionnelle`);
  } else {
    console.log('   ⚠️  Vue "series_complete": erreur ou vide');
  }

  console.log('\n' + '='.repeat(50));
  console.log('✨ Import terminé avec succès!');
  console.log('='.repeat(50));
  console.log('\n📝 Prochaines étapes:');
  console.log('   1. Lier les séries aux animes existants via mal_id');
  console.log('   2. Mettre à jour le frontend pour utiliser series_metadata');
  console.log('   3. Tester l\'affichage des séries avec warnings');
  console.log('   4. Configurer les liens d\'affiliation\n');
}

main().catch((error) => {
  console.error('\n💥 Erreur fatale:', error);
  process.exit(1);
});
