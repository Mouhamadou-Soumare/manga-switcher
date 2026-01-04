#!/usr/bin/env tsx
/**
 * Script pour ajouter les animes populaires manquants dans la table animes
 * depuis MyAnimeList API (Jikan)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// MAL IDs des animes populaires à ajouter (basés sur les Golden Data)
const POPULAR_ANIME_MAL_IDS = [
  31964,  // Boku no Hero Academia
  11061,  // Hunter x Hunter (2011)
  16498,  // Shingeki no Kyojin (Attack on Titan)
  40748,  // Jujutsu Kaisen
  38000,  // Kimetsu no Yaiba
  11757,  // Sword Art Online
  21,     // One Piece
  44511,  // Chainsaw Man
  48926,  // Sousou no Frieren
  52034,  // Oshi no Ko
  50265,  // Spy x Family
  48413,  // Ao Ashi / Blue Lock
  51009,  // Jigokuraku
  52211,  // Heavenly Delusion
  52034,  // Oshi no Ko
  35849,  // Darling in the Franxx
];

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function fetchAnimeFromJikan(malId: number) {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
    if (!res.ok) {
      console.error(`❌ Erreur Jikan pour MAL ${malId}: ${res.status}`);
      return null;
    }

    const json = await res.json();
    return json.data;
  } catch (error) {
    console.error(`❌ Erreur fetch MAL ${malId}:`, error);
    return null;
  }
}

async function addAnime(malId: number) {
  // Vérifier si l'anime existe déjà
  const { data: existing } = await supabase
    .from('animes')
    .select('mal_id, title')
    .eq('mal_id', malId)
    .maybeSingle();

  if (existing) {
    console.log(`⏭️  Déjà présent: ${existing.title} (MAL: ${malId})`);
    return { success: false, reason: 'exists' };
  }

  // Fetch depuis Jikan
  console.log(`📥 Récupération MAL ${malId}...`);
  const animeData = await fetchAnimeFromJikan(malId);

  if (!animeData) {
    return { success: false, reason: 'fetch_error' };
  }

  const slug = createSlug(animeData.title);
  const imageUrl = animeData.images?.jpg?.large_image_url || animeData.images?.jpg?.image_url;

  // Insérer dans la base
  const { data: inserted, error } = await supabase
    .from('animes')
    .insert({
      mal_id: malId,
      title: animeData.title,
      slug: slug,
      image: imageUrl,
    })
    .select()
    .single();

  if (error) {
    console.error(`❌ Erreur insertion: ${error.message}`);
    return { success: false, reason: 'insert_error', error };
  }

  console.log(`✅ Ajouté: ${inserted.title} (slug: ${slug})`);
  return { success: true, data: inserted };
}

async function main() {
  console.log('🚀 Ajout des animes populaires...\n');

  let added = 0;
  let skipped = 0;
  let errors = 0;

  for (const malId of POPULAR_ANIME_MAL_IDS) {
    const result = await addAnime(malId);

    if (result.success) {
      added++;
    } else if (result.reason === 'exists') {
      skipped++;
    } else {
      errors++;
    }

    // Rate limiting: attendre 333ms entre chaque requête (max 3 req/sec pour Jikan)
    await new Promise(resolve => setTimeout(resolve, 333));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(60));
  console.log(`✅ Animes ajoutés:     ${added}`);
  console.log(`⏭️  Déjà existants:     ${skipped}`);
  console.log(`❌ Erreurs:            ${errors}`);
  console.log(`📊 Total traité:       ${POPULAR_ANIME_MAL_IDS.length}`);

  console.log('\n💡 Prochaine étape:');
  console.log('   Relancez: npx tsx scripts/link-series-to-animes.ts');
  console.log('   Pour lier les Golden Data aux nouveaux animes\n');
}

main().catch(console.error);
