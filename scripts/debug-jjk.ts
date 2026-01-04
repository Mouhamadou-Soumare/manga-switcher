#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function check() {
  console.log('🔍 Vérification de Jujutsu Kaisen...\n');

  // 1. Vérifier l'anime Jujutsu Kaisen
  const { data: anime, error: animeError } = await supabase
    .from('animes')
    .select('*')
    .ilike('title', '%jujutsu%')
    .maybeSingle();

  if (animeError) {
    console.error('❌ Erreur anime:', animeError);
    return;
  }

  console.log('🎬 Anime trouvé:');
  console.log(`   ID: ${anime?.id}`);
  console.log(`   MAL ID: ${anime?.mal_id}`);
  console.log(`   Title: ${anime?.title}`);
  console.log(`   Slug: ${anime?.slug}\n`);

  // 2. Vérifier la série metadata liée
  const { data: metadata, error: metaError } = await supabase
    .from('series_metadata')
    .select('*')
    .eq('anime_id', anime?.id)
    .maybeSingle();

  if (metaError) {
    console.error('❌ Erreur metadata:', metaError);
  }

  console.log('📊 Golden Data (series_metadata):');
  if (metadata) {
    console.log(`   ✅ Trouvé!`);
    console.log(`   Series ID: ${metadata.series_id}`);
    console.log(`   Title: ${metadata.title_en}`);
    console.log(`   Anime ID: ${metadata.anime_id}`);
    console.log(`   MAL ID: ${metadata.mal_id}`);
    console.log(`   Chapter: ${metadata.manga_continuation?.chapter}`);
    console.log(`   Priority: ${metadata.priority}`);
  } else {
    console.log('   ❌ Aucune Golden Data liée!\n');

    // Chercher si la metadata existe sans lien
    const { data: unlinked } = await supabase
      .from('series_metadata')
      .select('*')
      .ilike('title_en', '%jujutsu%')
      .maybeSingle();

    if (unlinked) {
      console.log('   ⚠️  Metadata existe mais pas liée:');
      console.log(`      Series ID: ${unlinked.series_id}`);
      console.log(`      Anime ID: ${unlinked.anime_id}`);
      console.log(`      MAL ID: ${unlinked.mal_id}`);
    }
  }

  console.log('\n🔍 Test de la requête page (comme dans le code):');
  const { data: pageData } = await supabase
    .from('animes')
    .select('*, checkpoints(*)')
    .eq('slug', 'jujutsu-kaisen')
    .maybeSingle();

  if (pageData) {
    console.log(`   Anime: ${pageData.title}`);
    console.log(`   ID: ${pageData.id}`);

    const { data: goldenData } = await supabase
      .from('series_metadata')
      .select('*')
      .eq('anime_id', pageData.id)
      .maybeSingle();

    console.log(`   Golden Data: ${goldenData ? '✅ Trouvé' : '❌ Non trouvé'}`);
    if (goldenData) {
      console.log(`   Chapter: ${goldenData.manga_continuation?.chapter}`);
    }
  }
}

check().catch(console.error);
