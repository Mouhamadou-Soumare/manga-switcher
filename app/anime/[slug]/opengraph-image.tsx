import { ImageResponse } from 'next/og';
import { supabase } from '@/lib/supabaseClient';

// Runtime configuration
export const runtime = 'edge';
export const alt = 'MangaSwitcher - Find where to continue the manga';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// Helper to fetch anime data
async function getAnimeData(slug: string) {
  const { data: anime } = await supabase
    .from('animes')
    .select('*, checkpoints(*)')
    .eq('slug', slug)
    .maybeSingle();

  if (!anime) return null;

  // Get fresh checkpoints
  const { data: freshCheckpoints } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('anime_id', anime.id)
    .order('created_at', { ascending: false });

  if (freshCheckpoints) {
    anime.checkpoints = freshCheckpoints;
  }

  // Sort checkpoints to get hero checkpoint
  const allCheckpoints = anime.checkpoints || [];
  allCheckpoints.sort((a: any, b: any) => {
    // 1. Canon content before non-canon
    if (a.is_canon !== b.is_canon) {
      return a.is_canon ? -1 : 1;
    }
    // 2. Type priority: SEASON/ARC > MOVIE > OVA/SPECIAL
    const typePriority: Record<string, number> = {
      SEASON: 0,
      ARC: 0,
      MOVIE: 1,
      OVA: 2,
      SPECIAL: 2
    };
    const aPriority = typePriority[a.type] ?? 99;
    const bPriority = typePriority[b.type] ?? 99;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    // 3. By chapter (descending)
    return b.chapter - a.chapter;
  });

  const heroCheckpoint = allCheckpoints.length > 0 ? allCheckpoints[0] : null;

  return {
    anime,
    heroCheckpoint
  };
}

// Helper to fetch Jikan anime data for better images
async function getJikanAnime(malId: number) {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (error) {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  try {
    const data = await getAnimeData(slug);

    // Fallback design if no data
    if (!data || !data.anime) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              fontFamily: 'sans-serif',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px',
              }}
            >
              <div
                style={{
                  fontSize: 80,
                  fontWeight: 900,
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                MangaSwitcher
              </div>
              <div
                style={{
                  fontSize: 36,
                  color: 'rgba(255, 255, 255, 0.9)',
                  textAlign: 'center',
                  maxWidth: '800px',
                }}
              >
                Find exactly where to resume in the manga
              </div>
              <div
                style={{
                  fontSize: 28,
                  color: 'rgba(255, 255, 255, 0.7)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  padding: '16px 32px',
                  borderRadius: '12px',
                }}
              >
                Contribute to the community!
              </div>
            </div>
          </div>
        ),
        {
          ...size,
        }
      );
    }

    const { anime, heroCheckpoint } = data;

    // Fetch better quality image from Jikan if available
    const jikanData = await getJikanAnime(anime.mal_id);
    const animeImage = jikanData?.images?.jpg?.large_image_url || anime.image;
    const animeTitle = jikanData?.title || anime.title;

    // If no checkpoint exists
    if (!heroCheckpoint) {
      return new ImageResponse(
        (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              fontFamily: 'sans-serif',
            }}
          >
            {/* Left side - Anime Image */}
            <div
              style={{
                width: '40%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
              }}
            >
              {animeImage && (
                <img
                  src={animeImage}
                  alt={animeTitle}
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '550px',
                    objectFit: 'cover',
                    borderRadius: '16px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                  }}
                />
              )}
            </div>

            {/* Right side - Content */}
            <div
              style={{
                width: '60%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '60px',
                gap: '32px',
              }}
            >
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 900,
                  color: 'white',
                  lineHeight: 1.2,
                  display: 'flex',
                }}
              >
                {animeTitle}
              </div>

              <div
                style={{
                  fontSize: 40,
                  color: '#94a3b8',
                  display: 'flex',
                }}
              >
                No checkpoint data yet
              </div>

              <div
                style={{
                  fontSize: 28,
                  color: '#5646F5',
                  fontWeight: 700,
                  backgroundColor: 'rgba(86, 70, 245, 0.1)',
                  padding: '20px 32px',
                  borderRadius: '12px',
                  display: 'flex',
                }}
              >
                Help the community contribute!
              </div>

              <div
                style={{
                  fontSize: 24,
                  color: '#64748b',
                  display: 'flex',
                }}
              >
                MangaSwitcher
              </div>
            </div>
          </div>
        ),
        {
          ...size,
        }
      );
    }

    // With checkpoint data
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Left side - Anime Image */}
          <div
            style={{
              width: '40%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
          >
            {animeImage && (
              <img
                src={animeImage}
                alt={animeTitle}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '550px',
                  objectFit: 'cover',
                  borderRadius: '16px',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                }}
              />
            )}
          </div>

          {/* Right side - Content */}
          <div
            style={{
              width: '60%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '60px',
              gap: '24px',
            }}
          >
            {/* Anime Title */}
            <div
              style={{
                fontSize: 48,
                fontWeight: 900,
                color: 'white',
                lineHeight: 1.2,
                display: 'flex',
              }}
            >
              {animeTitle}
            </div>

            {/* Checkpoint Label */}
            <div
              style={{
                fontSize: 28,
                color: '#94a3b8',
                display: 'flex',
              }}
            >
              {heroCheckpoint.label}
            </div>

            {/* Main CTA - Chapter Number */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginTop: '16px',
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  color: '#cbd5e1',
                  fontWeight: 600,
                  display: 'flex',
                }}
              >
                Resume at
              </div>
              <div
                style={{
                  fontSize: 96,
                  fontWeight: 900,
                  color: '#5646F5',
                  lineHeight: 1,
                  display: 'flex',
                }}
              >
                Chapter {heroCheckpoint.chapter}
              </div>
              {heroCheckpoint.volume && (
                <div
                  style={{
                    fontSize: 24,
                    color: '#64748b',
                    display: 'flex',
                  }}
                >
                  Volume {heroCheckpoint.volume}
                </div>
              )}
            </div>

            {/* Footer Badge */}
            <div
              style={{
                fontSize: 20,
                color: '#94a3b8',
                marginTop: '24px',
                display: 'flex',
              }}
            >
              MangaSwitcher
            </div>
          </div>
        </div>
      ),
      {
        ...size,
      }
    );
  } catch (error) {
    console.error('OG Image generation error:', error);

    // Fallback error design
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            fontFamily: 'sans-serif',
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 900,
              color: 'white',
              textAlign: 'center',
            }}
          >
            MangaSwitcher
          </div>
        </div>
      ),
      {
        ...size,
      }
    );
  }
}
