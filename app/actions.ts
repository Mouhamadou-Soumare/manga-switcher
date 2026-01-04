"use server";

import { supabase } from "@/lib/supabaseClient";
import { revalidatePath } from "next/cache";
import type { CheckpointType } from "@/lib/types";
import { getTranslations } from 'next-intl/server';

// =====================================================
// Helper Function: Generate Unique Slug
// =====================================================
// Creates a URL-friendly slug from anime title
// Handles collisions by appending mal_id if needed
// =====================================================
async function generateUniqueSlug(title: string, malId: number): Promise<string> {
  // Create base slug from title
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single
    .trim()
    .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens

  // Check if slug already exists for a different anime
  const { data: existing } = await supabase
    .from('animes')
    .select('id')
    .eq('slug', slug)
    .neq('mal_id', malId)
    .maybeSingle();

  // If collision detected, append mal_id to make it unique
  if (existing) {
    slug = `${slug}-${malId}`;
  }

  return slug;
}

// =====================================================
// Helper Function: Generate Checkpoint Label
// =====================================================
// Creates a descriptive label based on checkpoint type
// Handles different content types with appropriate formatting
// Now supports internationalization
// =====================================================
async function generateCheckpointLabel(data: {
  type: CheckpointType;
  season?: number;
  episode?: number;
  arcName?: string;
  isCanon: boolean;
}): Promise<string> {
  const t = await getTranslations('labels');
  const { type, season, episode, arcName, isCanon } = data;
  const episodeInfo = episode ? ` (${t('episode')} ${episode})` : '';

  switch (type) {
    case 'SEASON':
      return season
        ? `${t('endSeason')} ${season}${episodeInfo}`
        : `${t('resumePoint')}${episodeInfo}`;

    case 'ARC':
      return arcName
        ? `${t('endArc')} ${arcName}${episodeInfo}`
        : `${t('endOfArc')}${episodeInfo}`;

    case 'MOVIE':
      return `${t('movie')}${!isCanon ? ` (${t('nonCanon')})` : ''}`;

    case 'OVA':
    case 'SPECIAL':
      return `${type}${!isCanon ? ` (${t('nonCanon')})` : ''}`;

    default:
      return t('resumePoint');
  }
}

export async function addCheckpoint(formData: FormData) {
  const malId = parseInt(formData.get("malId") as string);
  const title = formData.get("title") as string;
  const image = formData.get("image") as string;
  const chapter = parseInt(formData.get("chapter") as string);

  // Extract new fields
  const type = (formData.get("type") as CheckpointType) || 'SEASON';
  const isCanon = formData.get("isCanon") === 'true';
  const arcName = formData.get("arcName")?.toString() || null;
  const season = formData.get("season") ? parseInt(formData.get("season") as string) : null;
  const episode = formData.get("episode") ? parseInt(formData.get("episode") as string) : null;
  const volume = formData.get("volume") ? parseInt(formData.get("volume") as string) : null;
  const note = formData.get("note") as string;

  // Generate label based on checkpoint type
  const label = await generateCheckpointLabel({
    type,
    season: season ?? undefined,
    episode: episode ?? undefined,
    arcName: arcName || undefined,
    isCanon
  });

  // Generate unique slug from title
  const slug = await generateUniqueSlug(title, malId);

  // 1. On s'assure que l'Anime existe dans NOTRE base (Cache)
  // On utilise "upsert" : s'il existe on ne fait rien, sinon on le crée
  const { data: anime, error: animeError } = await supabase
    .from("animes")
    .upsert(
      { mal_id: malId, title: title, image: image, slug: slug },
      { onConflict: "mal_id" }
    )
    .select()
    .single();

  if (animeError) {
    console.error("Erreur création Anime", animeError);
    return { success: false, message: "Erreur lors de la création de l'anime" };
  }

  // 2. On ajoute le Checkpoint (le lien vers le chapitre)
  const { error: checkpointError } = await supabase
    .from("checkpoints")
    .insert({
      anime_id: anime.id,
      mal_id: malId,
      type: type,              // NEW: Content type
      is_canon: isCanon,       // NEW: Canon vs non-canon
      arc_name: arcName,       // NEW: For continuous series
      chapter: chapter,
      volume: volume,          // NOW USED
      season: season,
      episode: episode,
      label: label,            // Generated label
      note: note
    });

  if (checkpointError) {
    console.error("Erreur création Checkpoint", checkpointError);
    return { success: false, message: "Erreur lors de l'ajout du chapitre" };
  }

  // 3. On rafraîchit la page pour afficher le nouveau résultat direct
  revalidatePath(`/anime/${anime.slug}`);

  return { success: true };
}

/**
 * Vote for a checkpoint with robust anti-spam protection
 *
 * @param checkpointId - UUID of the checkpoint to vote on
 * @param type - Vote type ('up' or 'down')
 * @param fingerprint - Anonymized browser fingerprint
 * @returns Result object with success status and optional error details
 */
export async function voteForCheckpoint(
  checkpointId: string,
  type: 'up' | 'down',
  fingerprint: string
) {
  // Get IP address and User-Agent from headers (server-side only)
  const { headers } = await import('next/headers');
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '0.0.0.0';
  const userAgent = headersList.get('user-agent') || 'unknown';

  // Call the robust PostgreSQL function
  const { data, error } = await supabase.rpc('vote_for_checkpoint_v2', {
    p_checkpoint_id: checkpointId,
    p_vote_type: type,
    p_voter_fingerprint: fingerprint,
    p_ip_address: ip,
    p_user_agent: userAgent
  });

  if (error) {
    return {
      success: false,
      errorCode: 'DATABASE_ERROR',
      message: 'Erreur lors du vote'
    };
  }

  // Check if function returned result
  if (!data || data.length === 0) {
    return {
      success: false,
      errorCode: 'NO_RESULT',
      message: 'Erreur lors du vote'
    };
  }

  const result = data[0];

  // Handle errors from the function
  if (!result.success) {
    return {
      success: false,
      errorCode: result.error_code,
      message: result.message,
      requiresCaptcha: result.requires_captcha
    };
  }

  // Success - revalidate the specific anime page cache
  // First, get the anime slug from the checkpoint
  const { data: checkpoint } = await supabase
    .from('checkpoints')
    .select('anime_id')
    .eq('id', checkpointId)
    .single();

  if (checkpoint) {
    const { data: anime } = await supabase
      .from('animes')
      .select('slug')
      .eq('id', checkpoint.anime_id)
      .single();

    if (anime?.slug) {
      // Revalidate the specific anime page
      revalidatePath(`/anime/${anime.slug}`, 'page');
    }
  }

  // Also revalidate the generic pattern as fallback
  revalidatePath('/anime/[slug]', 'page');

  return {
    success: true
  };
}