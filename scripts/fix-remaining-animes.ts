#!/usr/bin/env tsx
/**
 * Script pour corriger les 35 animes mal liés
 * Utilise un mapping manuel series_id → MAL ID correct
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mapping manuel: series_id → correct MAL ID
const MANUAL_MAL_MAPPING: Record<string, number> = {
  'my-hero-academia': 31964,      // Boku no Hero Academia
  'frieren': 52991,                // Sousou no Frieren
  'blue-lock': 49596,              // Blue Lock
  'solo-leveling': 52299,          // Solo Leveling
  'the-dangers-in-my-heart': 52578, // Boku no Kokoro no Yabai Yatsu
  'wind-breaker': 59234,           // Wind Breaker (2024)
  'kaiju-no-8': 56451,             // Kaijuu 8-gou
  'zom-100': 54112,                // Zom 100: Zombie ni Naru made ni Shitai 100 no Koto
  'heavenly-delusion': 51180,      // Tengoku Daimakyou
  '100-kanojo': 51040,             // Kimi no Koto ga Daidaidaidaidaisuki na 100-nin no Kanojo
  'dungeon-meshi': 52701,          // Dungeon Meshi (Delicious in Dungeon)
  'kusuriya-no-hitorigoto': 54492, // Kusuriya no Hitorigoto (The Apothecary Diaries)
  'mushoku-tensei': 39535,         // Mushoku Tensei
  'rezero': 31240,                 // Re:Zero kara Hajimeru Isekai Seikatsu
  'tensura': 37430,                // Tensei shitara Slime Datta Ken
  'konosuba': 30831,               // Kono Subarashii Sekai ni Shukufuku wo!
  'classroom-of-the-elite': 35507, // Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e
  'shield-hero': 35790,            // Tate no Yuusha no Nariagari
  'goblin-slayer': 37349,          // Goblin Slayer
  'kumo-desu-ga': 41463,           // Kumo desu ga, Nani ka?
  'eminence-in-shadow': 48316,     // Kage no Jitsuryokusha ni Naritakute!
  'saga-of-tanya': 32615,          // Youjo Senki
  'danmachi': 28121,               // Dungeon ni Deai wo Motomeru no wa Machigatteiru Darou ka
  'bookworm': 39468,               // Honzuki no Gekokujou
  'promised-neverland': 37779,     // Yakusoku no Neverland
  'blue-exorcist': 9919,           // Ao no Exorcist
  'fullmetal-alchemist-2003': 121, // Fullmetal Alchemist (2003)
  'seraph-of-the-end': 26243,      // Owari no Seraph
  'kaguya-sama': 37999,            // Kaguya-sama wa Kokurasetai
  'nagatoro': 42351,               // Ijiranaide, Nagatoro-san
  'komi-san': 48926,               // Komi-san wa, Comyushou desu.
  'dress-up-darling': 48736,       // Sono Bisque Doll wa Koi wo Suru
  'rent-a-girlfriend': 40839,      // Kanojo, Okarishimasu
  'call-of-the-night': 50346,      // Yofukashi no Uta
  'insomniacs-after-school': 56647 // Kimi wa Houkago Insomnia
};

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
        const waitTime = attempt * 2000;
        console.log(`   ⏳ Rate limit, attente ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!res.ok) {
        console.error(`   ❌ Erreur HTTP ${res.status}`);
        return null;
      }

      const json = await res.json();
      return json.data;
    } catch (error) {
      console.error(`   ❌ Erreur (tentative ${attempt}/${retries})`);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  return null;
}

async function addOrUpdateAnime(seriesId: string, malId: number) {
  console.log(`\n[${seriesId}] MAL: ${malId}`);

  // Vérifier si l'anime existe déjà dans animes
  const { data: existingAnime } = await supabase
    .from('animes')
    .select('*')
    .eq('mal_id', malId)
    .maybeSingle();

  let animeId: string;

  if (existingAnime) {
    console.log(`   ✅ Anime existe: ${existingAnime.title}`);
    animeId = existingAnime.id;
  } else {
    // Fetch et créer l'anime
    console.log(`   📥 Récupération depuis Jikan...`);
    const animeData = await fetchAnimeFromJikan(malId);

    if (!animeData) {
      console.log(`   ❌ Impossible de récupérer`);
      return { success: false };
    }

    const slug = createSlug(animeData.title);
    const imageUrl = animeData.images?.jpg?.large_image_url || animeData.images?.jpg?.image_url;

    // Vérifier collision de slug
    const { data: slugCheck } = await supabase
      .from('animes')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();

    const finalSlug = slugCheck ? `${slug}-${malId}` : slug;

    const { data: newAnime, error } = await supabase
      .from('animes')
      .insert({
        mal_id: malId,
        title: animeData.title,
        slug: finalSlug,
        image: imageUrl,
      })
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Erreur insertion: ${error.message}`);
      return { success: false };
    }

    console.log(`   ✅ Anime créé: ${newAnime.title} (${finalSlug})`);
    animeId = newAnime.id;
  }

  // Lier la série à l'anime
  const { error: updateError } = await supabase
    .from('series_metadata')
    .update({
      anime_id: animeId,
      mal_id: malId,
    })
    .eq('series_id', seriesId);

  if (updateError) {
    console.error(`   ❌ Erreur liaison: ${updateError.message}`);
    return { success: false };
  }

  console.log(`   ✅ Série liée avec succès`);
  return { success: true };
}

async function main() {
  console.log('🔧 Correction des 35 animes restants...\n');

  const entries = Object.entries(MANUAL_MAL_MAPPING);
  console.log(`📊 ${entries.length} animes à corriger\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const [seriesId, malId] = entries[i];

    const result = await addOrUpdateAnime(seriesId, malId);

    if (result.success) {
      success++;
    } else {
      failed++;
    }

    // Rate limiting
    if (i < entries.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('='.repeat(60));
  console.log(`✅ Succès:    ${success}`);
  console.log(`❌ Échecs:    ${failed}`);
  console.log(`📊 Total:     ${entries.length}`);

  // Vérification finale
  console.log('\n🔍 Vérification finale...');
  const { data: linkedSeries } = await supabase
    .from('series_metadata')
    .select('*')
    .not('anime_id', 'is', null);

  const { data: totalSeries } = await supabase
    .from('series_metadata')
    .select('id', { count: 'exact' });

  const total = totalSeries?.length || 0;
  const linked = linkedSeries?.length || 0;
  const percentage = total > 0 ? ((linked / total) * 100).toFixed(1) : '0';

  console.log(`   ✅ ${linked} / ${total} séries liées`);
  console.log(`   📊 Taux de liaison: ${percentage}%\n`);

  console.log('💡 Prochaine étape:');
  console.log('   Testez vos animes préférés sur localhost:3001/anime/[slug]');
  console.log('   Ils devraient tous afficher le badge "✓ VÉRIFIÉ" !\n');
}

main().catch(console.error);
