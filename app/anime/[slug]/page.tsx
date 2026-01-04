import Link from "next/link";
import { ArrowLeft, Info, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import ContributionForm from "@/components/ContributionForm";
import VoteButtons from "@/components/VoteButtons";
import type { Metadata } from "next";

async function getJikanAnime(id: string) {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (error) {
    return null;
  }
}

async function getSupabaseAnimeBySlug(slug: string) {
  const { data: anime } = await supabase
    .from('animes')
    .select('*, checkpoints(*)')
    .eq('slug', slug)
    .maybeSingle();

  // Force fresh data on every request (no cache)
  if (anime) {
    const { data: freshCheckpoints } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('anime_id', anime.id)
      .order('created_at', { ascending: false });

    if (freshCheckpoints) {
      anime.checkpoints = freshCheckpoints;
    }
  }

  return anime;
}

// Helper to reverse-search anime by slug if not in DB
async function findAnimeBySlug(slug: string) {
  // First try Supabase
  const supabaseAnime = await getSupabaseAnimeBySlug(slug);
  if (supabaseAnime) return { source: 'supabase', data: supabaseAnime };

  // If not found, try to find via Jikan by searching the title
  // Convert slug back to searchable title (naruto-shippuden -> naruto shippuden)
  const searchQuery = slug.replace(/-/g, ' ');

  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchQuery)}&limit=1`);
    if (!res.ok) return null;
    const json = await res.json();

    if (json.data && json.data.length > 0) {
      const jikanAnime = json.data[0];
      // Return a temporary object that matches our expected structure
      return {
        source: 'jikan',
        data: {
          mal_id: jikanAnime.mal_id,
          title: jikanAnime.title,
          image: jikanAnime.images.jpg.large_image_url,
          slug: slug,
          checkpoints: [] // No checkpoints yet since not in DB
        },
        jikanData: jikanAnime
      };
    }
  } catch (error) {
    console.error('Jikan search failed:', error);
  }

  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const result = await findAnimeBySlug(slug);

  if (!result) {
    return { title: "Anime introuvable - MangaSwitcher" };
  }

  const supabaseData = result.data;

  let jikanAnime = result.source === 'jikan' ? result.jikanData : null;
  if (result.source === 'supabase') {
    jikanAnime = await getJikanAnime(supabaseData.mal_id.toString());
  }

  let allCheckpoints = supabaseData?.checkpoints || [];
  allCheckpoints.sort((a: any, b: any) => b.chapter - a.chapter);
  const heroCheckpoint = allCheckpoints.length > 0 ? allCheckpoints[0] : null;

  const animeTitle = jikanAnime?.title || supabaseData.title;
  const animeImage = jikanAnime?.images?.jpg?.large_image_url || supabaseData.image;

  if (heroCheckpoint) {
    return {
      title: `À quel chapitre reprend l'anime ${animeTitle} ?`,
      description: `L'anime ${animeTitle} s'arrête à la ${heroCheckpoint.label}. Reprends le manga au Chapitre ${heroCheckpoint.chapter} ${heroCheckpoint.volume ? `(Tome ${heroCheckpoint.volume})` : ""}.`,
      alternates: {
        canonical: `/anime/${slug}`,
      },
      openGraph: {
        images: animeImage ? [animeImage] : [],
      },
    };
  } else {
    return {
      title: `À quel chapitre reprend ${animeTitle} ? - MangaSwitcher`,
      description: `Découvre où reprendre le manga ${animeTitle} après l'anime. Aide la communauté en ajoutant le chapitre manquant !`,
      openGraph: {
        images: animeImage ? [animeImage] : [],
      },
    };
  }
}

// --- COMPOSANT PAGE PRINCIPAL ---

// Force dynamic rendering to ensure vote counts are always fresh
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AnimePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Try to find anime (Supabase first, then Jikan)
  const result = await findAnimeBySlug(slug);

  if (!result) {
    return (
      <div className="max-w-md mx-auto p-10 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Anime introuvable</h1>
        <p className="text-slate-600 mb-6">Cet anime n'existe pas ou le slug est incorrect.</p>
        <Link href="/" className="text-primary hover:underline">
          Retour à la recherche
        </Link>
      </div>
    );
  }

  const supabaseData = result.data;

  let jikanAnime = result.source === 'jikan' ? result.jikanData : null;
  if (result.source === 'supabase') {
    jikanAnime = await getJikanAnime(supabaseData.mal_id.toString());
  }

  const animeTitle = jikanAnime?.title || supabaseData.title;
  const animeImage = jikanAnime?.images?.jpg?.large_image_url || supabaseData.image;
  const animeStatus = jikanAnime?.status || 'Unknown';

  let allCheckpoints = supabaseData?.checkpoints || [];

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

    // 3. By chapter (descending - most recent first)
    return b.chapter - a.chapter;
  });

  const heroCheckpoint = allCheckpoints.length > 0 ? allCheckpoints[0] : null;
  const historyCheckpoints = allCheckpoints.slice(1);

  return (
    <div className="max-w-md lg:max-w-2xl xl:max-w-3xl mx-auto pb-24 px-4 sm:px-0 lg:px-6">

      <div className="py-6">
        <Link href="/" className="p-2 -ml-2 hover:bg-gray-200 rounded-full transition-colors text-black inline-flex">
          <ArrowLeft className="w-6 h-6" />
        </Link>
      </div>

      <div className="space-y-3 mb-8">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight">
          {animeTitle}
        </h1>
        <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold text-white tracking-wide shadow-sm ${animeStatus === 'Finished Airing' ? 'bg-primary' : 'bg-primary'}`}>
          {animeStatus === 'Finished Airing' ? 'Terminé' : 'En cours'}
        </span>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/60 overflow-hidden mb-12 relative border border-slate-50">

        <div className="absolute top-0 w-full h-40 bg-gradient-to-b from-slate-50 to-white z-0"></div>

        <div className="relative z-10 flex flex-col items-center pt-8 px-6 lg:px-10 pb-12 lg:pb-16 text-center">

          {animeImage && (
            <img
              src={animeImage}
              alt={animeTitle}
              className="w-48 md:w-56 lg:w-64 xl:w-72 h-auto object-cover rounded-2xl shadow-lg mb-8 transform transition-transform duration-500 hover:scale-[1.02]"
            />
          )}

          {heroCheckpoint ? (
            <>
              <div className="space-y-2 mb-8">
                <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
                  {heroCheckpoint.label}
                </p>
                <div className="w-6 h-0.5 bg-slate-200 mx-auto rounded-full"></div>
              </div>

              <div className="mb-4">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-700 mb-2 font-mono">
                  Reprends au
                </h2>
                <span className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-primary tracking-tighter drop-shadow-sm">
                   Chapitre {heroCheckpoint.chapter}
                </span>

                <div className="w-24 h-1 bg-slate-100 mx-auto mt-8 rounded-full"></div>

                <div className="flex flex-wrap justify-center gap-2 mt-6">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${
                    heroCheckpoint.type === 'SEASON' ? 'bg-blue-100 text-blue-700' :
                    heroCheckpoint.type === 'MOVIE' ? 'bg-purple-100 text-purple-700' :
                    heroCheckpoint.type === 'ARC' ? 'bg-green-100 text-green-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {heroCheckpoint.type === 'SEASON' ? 'Saison' :
                     heroCheckpoint.type === 'MOVIE' ? 'Film' :
                     heroCheckpoint.type === 'ARC' ? 'Arc' :
                     heroCheckpoint.type}
                  </span>

                  {!heroCheckpoint.is_canon && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">
                      Non-canon
                    </span>
                  )}
                </div>

                {heroCheckpoint.volume && (
                  <p className="text-sm text-slate-400 mt-4 font-medium">
                    Tome {heroCheckpoint.volume}
                  </p>
                )}

                <div className="mt-6 flex justify-center">
                  <VoteButtons
                    checkpointId={heroCheckpoint.id}
                    initialUpvotes={heroCheckpoint.upvotes || 0}
                    initialDownvotes={heroCheckpoint.downvotes || 0}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 mb-8 max-w-xs">
                <h3 className="text-lg font-bold text-slate-800">
                  Pas encore de données
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Aide la communauté en indiquant le chapitre correspondant.
                </p>
              </div>

              <div className="w-full">
                <ContributionForm
                  malId={supabaseData.mal_id}
                  animeTitle={animeTitle}
                  animeImage={animeImage || ''}
                  variant="hero"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {(allCheckpoints.length > 0) && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">

           <div className="flex items-center justify-between px-2 pt-2">
             <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">
               Points d'arrêt précédents
             </h3>
             <ContributionForm
                malId={supabaseData.mal_id}
                animeTitle={animeTitle}
                animeImage={animeImage || ''}
                variant="small"
             />
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
             {historyCheckpoints.map((point: any) => (
               <div key={point.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex justify-between items-start group cursor-default">
                 <div className="flex flex-col flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                        point.type === 'SEASON' ? 'bg-blue-100 text-blue-700' :
                        point.type === 'MOVIE' ? 'bg-purple-100 text-purple-700' :
                        point.type === 'ARC' ? 'bg-green-100 text-green-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {point.type === 'SEASON' ? 'Saison' :
                         point.type === 'MOVIE' ? 'Film' :
                         point.type === 'ARC' ? 'Arc' :
                         point.type}
                      </span>

                      {!point.is_canon && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                          Non-canon
                        </span>
                      )}
                    </div>

                    <span className="font-bold text-slate-800 text-lg">
                      {point.label}
                    </span>

                    {point.volume && (
                      <p className="text-xs text-slate-500 mt-1">
                        Tome {point.volume}
                      </p>
                    )}

                    <div className="mt-2">
                        <VoteButtons
                            checkpointId={point.id}
                            initialUpvotes={point.upvotes || 0}
                            initialDownvotes={point.downvotes || 0}
                        />
                    </div>
                 </div>

                 <div className="flex items-center gap-3 ml-4">
                   <div className="text-right">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chapitre</span>
                      <span className="text-primary font-black text-xl">{point.chapter}</span>
                   </div>
                   <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                 </div>
               </div>
             ))}

             {historyCheckpoints.length === 0 && (
               <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl">
                 <p className="text-xs text-slate-400">Aucun historique pour l'instant</p>
               </div>
             )}
           </div>

           {heroCheckpoint?.note && (
             <div className="mt-6 bg-amber-50 p-5 rounded-2xl border border-amber-100 flex gap-4 items-start shadow-sm">
               <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
               <p className="text-sm text-amber-900 leading-relaxed">
                 <span className="font-bold block mb-1 text-amber-700">Note importante</span>
                 {heroCheckpoint.note}
               </p>
             </div>
           )}

        </div>
      )}
    </div>
  );
}
