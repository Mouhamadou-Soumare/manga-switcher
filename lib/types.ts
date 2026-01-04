export type Anime = {
  id: string;
  mal_id: number;
  title: string;
  image: string | null;
  slug: string;
  updated_at: string;
};

// Checkpoint content types
export type CheckpointType = 'SEASON' | 'MOVIE' | 'ARC' | 'OVA' | 'SPECIAL';

export type Checkpoint = {
  id: string;
  anime_id: string;
  mal_id: number | null;
  type: CheckpointType;       // Now actively used! (SEASON, MOVIE, ARC, OVA, SPECIAL)
  is_canon: boolean;           // NEW: Canon vs non-canon content
  arc_name: string | null;     // NEW: For continuous series (e.g., "Marineford", "Wano")
  season: number | null;
  episode: number | null;
  chapter: number;
  volume: number | null;
  label: string;
  note: string | null;
  upvotes: number;
  downvotes: number;
  created_at: string;
};

export type AnimeWithCheckpoints = Anime & {
  checkpoints: Checkpoint[];
};
