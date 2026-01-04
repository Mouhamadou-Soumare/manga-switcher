import Link from "next/link";
import { TrendingUp } from "lucide-react";

// Helper function to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single
    .trim()
    .replace(/^-+|-+$/g, '');      // Remove leading/trailing hyphens
}

interface TrendingAnime {
  mal_id: number;
  title: string;
  images: {
    jpg: {
      small_image_url: string;
    };
  };
  score: number;
  popularity: number;
}

async function getTrendingAnimes(): Promise<TrendingAnime[]> {
  try {
    const res = await fetch('https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=3', {
      next: { revalidate: 86400 }
    });

    if (!res.ok) {
      throw new Error('Failed to fetch trending animes');
    }

    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching trending animes:', error);
    return [
      { mal_id: 20, title: "Naruto", images: { jpg: { small_image_url: "" } }, score: 8, popularity: 1 },
      { mal_id: 51009, title: "Jujutsu Kaisen", images: { jpg: { small_image_url: "" } }, score: 9, popularity: 2 },
      { mal_id: 16498, title: "Attack on Titan", images: { jpg: { small_image_url: "" } }, score: 9, popularity: 3 },
    ];
  }
}

export default async function TrendingAnimes() {
  const trendingAnimes = await getTrendingAnimes();

  return (
    <div className="w-full max-w-xl lg:max-w-2xl xl:max-w-3xl">
      <div className="flex items-center justify-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Populaires en ce moment
        </span>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {trendingAnimes.map((anime) => {
          const slug = generateSlug(anime.title);
          return (
            <Link
              key={anime.mal_id}
              href={`/anime/${slug}`}
              className="group relative bg-white px-5 py-2.5 rounded-full shadow-sm hover:shadow-md hover:scale-105 cursor-pointer transition-all duration-200 border border-gray-100 hover:border-primary/30"
            >
              {/* Gradient hover effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 rounded-full transition-opacity" />

              <div className="relative flex items-center gap-2">
                {/* Anime image thumbnail (optional) */}
                {anime.images?.jpg?.small_image_url && (
                  <img
                    src={anime.images.jpg.small_image_url}
                    alt={anime.title}
                    className="w-6 h-6 rounded-full object-cover border border-gray-200"
                  />
                )}

                <span className="text-sm font-semibold text-slate-700 group-hover:text-primary transition-colors">
                  {anime.title}
                </span>

                {/* Score badge */}
                {anime.score && (
                  <span className="ml-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    ★ {anime.score}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Subtle hint text */}
      <p className="text-xs text-slate-400 text-center mt-3">
        Clique pour voir où reprendre le manga
      </p>
    </div>
  );
}
