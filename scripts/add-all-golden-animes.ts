#!/usr/bin/env tsx
/**
 * Script pour ajouter TOUS les animes des Golden Data manquants
 * Extrait les MAL IDs depuis manga-transitions.json et les ajoute via Jikan
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Lire le fichier Golden Data
const goldenDataPath = resolve(process.cwd(), 'data/manga-transitions.json');
const goldenDataRaw = readFileSync(goldenDataPath, 'utf-8');
const goldenData = JSON.parse(goldenDataRaw);

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function fetchAnimeFromJikan(malId: number, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);

      if (res.status === 429) {
        // Rate limit - attendre plus longtemps
        const waitTime = attempt * 2000; // 2s, 4s, 6s
        console.log(`   ⏳ Rate limit, attente ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!res.ok) {
        console.error(`   ❌ Erreur HTTP ${res.status} pour MAL ${malId}`);
        return null;
      }

      const json = await res.json();
      return json.data;
    } catch (error) {
      console.error(`   ❌ Erreur réseau (tentative ${attempt}/${retries}):`, error);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  return null;
}

async function addAnime(malId: number, seriesTitle: string) {
  // Vérifier si existe déjà
  const { data: existing } = await supabase
    .from('animes')
    .select('mal_id, title')
    .eq('mal_id', malId)
    .maybeSingle();

  if (existing) {
    console.log(`⏭️  Déjà présent: ${existing.title}`);
    return { success: false, reason: 'exists' };
  }

  // Fetch depuis Jikan
  console.log(`📥 ${seriesTitle} (MAL: ${malId})...`);
  const animeData = await fetchAnimeFromJikan(malId);

  if (!animeData) {
    console.log(`   ⚠️  Impossible de récupérer les données`);
    return { success: false, reason: 'fetch_error' };
  }

  const slug = createSlug(animeData.title);
  const imageUrl = animeData.images?.jpg?.large_image_url || animeData.images?.jpg?.image_url;

  // Vérifier si le slug existe déjà
  const { data: existingSlug } = await supabase
    .from('animes')
    .select('slug, title')
    .eq('slug', slug)
    .maybeSingle();

  if (existingSlug) {
    console.log(`   ⚠️  Slug '${slug}' déjà utilisé par: ${existingSlug.title}`);
    // Ajouter un suffixe au slug
    const uniqueSlug = `${slug}-${malId}`;

    const { data: inserted, error } = await supabase
      .from('animes')
      .insert({
        mal_id: malId,
        title: animeData.title,
        slug: uniqueSlug,
        image: imageUrl,
      })
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Erreur insertion: ${error.message}`);
      return { success: false, reason: 'insert_error', error };
    }

    console.log(`   ✅ Ajouté avec slug unique: ${uniqueSlug}`);
    return { success: true, data: inserted };
  }

  // Insérer normalement
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
    console.error(`   ❌ Erreur insertion: ${error.message}`);
    return { success: false, reason: 'insert_error', error };
  }

  console.log(`   ✅ Ajouté: ${inserted.title} (slug: ${slug})`);
  return { success: true, data: inserted };
}

async function searchAnimeByTitle(title: string): Promise<number | null> {
  try {
    const searchQuery = encodeURIComponent(title);
    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${searchQuery}&limit=1&order_by=members&sort=desc`);

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    if (json.data && json.data.length > 0) {
      return json.data[0].mal_id;
    }

    return null;
  } catch (error) {
    console.error(`   ❌ Erreur recherche: ${error}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Ajout de TOUS les animes des Golden Data...\n');

  // Extraire les titres depuis les Golden Data
  const seriesToProcess: Array<{ title: string; seriesId: string }> = [];

  for (const series of goldenData.series) {
    seriesToProcess.push({
      title: series.title_en,
      seriesId: series.series_id
    });
  }

  console.log(`📊 ${seriesToProcess.length} animes à traiter\n`);

  let added = 0;
  let skipped = 0;
  let errors = 0;
  let notFound = 0;

  for (let i = 0; i < seriesToProcess.length; i++) {
    const { title, seriesId } = seriesToProcess[i];

    console.log(`[${i + 1}/${seriesToProcess.length}] ${title}`);

    // Chercher le MAL ID
    const malId = await searchAnimeByTitle(title);

    if (!malId) {
      console.log(`   ⚠️  Anime introuvable sur MyAnimeList`);
      notFound++;
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }

    console.log(`   🔍 Trouvé: MAL ${malId}`);

    const result = await addAnime(malId, title);

    if (result.success) {
      added++;
    } else if (result.reason === 'exists') {
      skipped++;
    } else {
      errors++;
    }

    // Rate limiting: 1 requête toutes les 700ms (~1.4 req/sec)
    // 2 requêtes par série (search + fetch), donc 700ms = sécurité
    if (i < seriesToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 700));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('='.repeat(60));
  console.log(`✅ Animes ajoutés:     ${added}`);
  console.log(`⏭️  Déjà existants:     ${skipped}`);
  console.log(`❌ Erreurs:            ${errors}`);
  console.log(`🔍 Introuvables:       ${notFound}`);
  console.log(`📊 Total traité:       ${seriesToProcess.length}`);

  console.log('\n💡 Prochaine étape:');
  console.log('   Relancez: npx tsx scripts/link-series-to-animes.ts');
  console.log('   Pour lier toutes les Golden Data aux animes\n');
}

main().catch(console.error);
