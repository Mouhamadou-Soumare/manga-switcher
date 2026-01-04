#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function forceLinkJJK() {
  console.log('🔗 Force linking Jujutsu Kaisen...\n');

  // Récupérer l'anime
  const { data: anime } = await supabase
    .from('animes')
    .select('*')
    .eq('mal_id', 40748)
    .single();

  console.log(`Anime: ${anime.title} (ID: ${anime.id}, MAL: ${anime.mal_id})`);

  // Mettre à jour la metadata
  const { data: updated, error } = await supabase
    .from('series_metadata')
    .update({
      anime_id: anime.id,
      mal_id: anime.mal_id,
    })
    .eq('series_id', 'jujutsu-kaisen')
    .select()
    .single();

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log('✅ Liaison effectuée:');
  console.log(`   Series: ${updated.title_en}`);
  console.log(`   Anime ID: ${updated.anime_id}`);
  console.log(`   MAL ID: ${updated.mal_id}`);
  console.log(`   Chapter: ${updated.manga_continuation?.chapter}`);
}

forceLinkJJK().catch(console.error);
