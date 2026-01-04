"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, X } from "lucide-react";
import Link from "next/link";

interface AnimeResult {
  mal_id: number;
  title: string;
  images: {
    jpg: {
      image_url: string;
      small_image_url: string;
    };
  };
  year: number;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-+|-+$/g, '');
}

export default function SearchAnime() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnimeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Pour fermer les résultats si on clique ailleurs (bonus UX)
  const searchRef = useRef<HTMLDivElement>(null);

  // Close results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Le "Debounce" : on attend 500ms après la frappe avant d'appeler l'API
    const delayDebounceFn = setTimeout(async () => {
      if (query.length > 2) {
        setIsLoading(true);
        try {
          // Appel à l'API Jikan (gratuite, pas de clé nécessaire)
          const res = await fetch(
            `https://api.jikan.moe/v4/anime?q=${query}&limit=5&sfw`
          );
          const data = await res.json();
          setResults(data.data || []);
          setShowResults(true);
        } catch (error) {
          console.error("Erreur API Jikan:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="w-full max-w-xl lg:max-w-2xl xl:max-w-3xl relative group" ref={searchRef}>
      {/* Input Container with enhanced styling */}
      <div className="relative">
        {/* Gradient border effect on focus */}
        <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary/50 via-purple-500/50 to-primary/50 rounded-3xl blur opacity-0 transition-opacity duration-500 ${isFocused ? 'opacity-30' : ''}`}></div>

        <div className="relative">
          {/* Search Icon */}
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none z-10">
            {isLoading ? (
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            ) : (
              <Search className={`h-6 w-6 transition-all duration-300 ${isFocused ? 'text-primary scale-110' : 'text-gray-400'}`} />
            )}
          </div>

          {/* Input Field */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`w-full py-5 lg:py-6 pl-16 lg:pl-20 pr-14 lg:pr-20 text-lg lg:text-xl rounded-3xl border-2 bg-white shadow-lg focus:outline-none transition-all duration-300 placeholder:text-gray-400 text-black ${
              isFocused
                ? 'border-primary/40 shadow-2xl shadow-primary/20 scale-[1.02]'
                : 'border-gray-100 hover:border-gray-200'
            }`}
            placeholder="Chercher un anime (ex: One Piece)"
          />

          {/* Clear Button with counter */}
          <div className="absolute inset-y-0 right-4 flex items-center gap-2">
            {query.length > 0 && (
              <>
                {/* Results counter */}
                {!isLoading && results.length > 0 && (
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                    {results.length}
                  </span>
                )}

                {/* Clear button */}
                <button
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setShowResults(false);
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors group/clear"
                  aria-label="Clear search"
                >
                  <X className="h-5 w-5 text-gray-400 group-hover/clear:text-gray-700 transition-colors" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Liste des Résultats - Redesigned */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-2xl shadow-2xl shadow-slate-200/60 overflow-hidden z-50 border border-slate-100 animate-in slide-in-from-top-2 fade-in duration-300">
          <ul className="divide-y divide-slate-50">
            {results.map((anime, index) => {
              const slug = generateSlug(anime.title);
              return (
                <li key={anime.mal_id}>
                  <Link
                    href={`/anime/${slug}`}
                    className="group flex items-center gap-3 p-3 hover:bg-slate-50 transition-all duration-150 cursor-pointer"
                    onClick={() => setShowResults(false)}
                  >
                    {/* Anime thumbnail - Compact */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={anime.images.jpg.small_image_url}
                        alt={anime.title}
                        className="w-10 h-14 object-cover rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
                      />
                    </div>

                    {/* Anime info - Clean layout */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
                        {anime.title}
                      </h3>
                      {anime.year && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {anime.year}
                        </p>
                      )}
                    </div>

                    {/* Simple arrow */}
                    <svg
                      className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* No results message */}
      {showResults && results.length === 0 && query.length > 2 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl shadow-xl p-8 z-50 border border-gray-100 text-center animate-in fade-in duration-300">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="font-bold text-slate-800 mb-2">Aucun résultat trouvé</h3>
          <p className="text-sm text-slate-500">
            Essayez avec un autre titre ou vérifiez l'orthographe
          </p>
        </div>
      )}
    </div>
  );
}