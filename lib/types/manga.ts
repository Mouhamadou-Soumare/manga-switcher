/**
 * MangaSwitch - Type Definitions
 *
 * Ces types définissent la structure de données pour les transitions anime-manga.
 * Ils sont alignés avec le schéma JSON et garantissent la cohérence des données.
 */

export type SourceMaterial = 'manga' | 'light_novel' | 'web_novel' | 'visual_novel';

export type SeriesStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled';

export type TransitionType = 'direct' | 'divergent' | 'original_ending' | 'complex';

export type MangaStatus = 'up_to_date' | 'behind_anime' | 'ahead_anime' | 'discontinued';

export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * Point de continuation pour un manga
 */
export interface MangaContinuationPoint {
  /** Numéro du chapitre où reprendre */
  chapter: number;
  /** Numéro du volume correspondant (optionnel) */
  volume?: number;
  /** Note contextuelle pour l'utilisateur */
  note?: string;
}

/**
 * Point de continuation pour un Light Novel
 */
export interface LightNovelContinuationPoint {
  /** Numéro du volume où reprendre */
  volume: number;
  /** Chapitre dans le volume (optionnel) */
  chapter?: number;
  /** Note contextuelle pour l'utilisateur */
  note?: string;
}

/**
 * Informations sur l'adaptation manga (pour les séries adaptées de LN)
 */
export interface MangaAdaptationInfo {
  /** Statut du manga par rapport à l'anime */
  status: MangaStatus;
  /** Dernier chapitre adapté (si applicable) */
  last_chapter?: number;
  /** Message d'avertissement si le manga est en retard */
  warning?: string;
}

/**
 * Liens d'affiliation pour acheter le manga/LN
 */
export interface AffiliateLinks {
  /** Lien Amazon France */
  amazon_fr?: string;
  /** Lien Fnac */
  fnac?: string;
  /** Lien Cultura */
  cultura?: string;
  /** Lien librairie manga spécialisée */
  manga_store?: string;
  /** Lien digital (Crunchyroll, Kindle, etc.) */
  digital?: string;
}

/**
 * Informations sur la dernière saison/partie d'anime
 */
export interface LastAnimeInfo {
  /** Description de l'événement final (ex: "Episode 24 - Fin de Saison 2") */
  event: string;
  /** Numéro de l'épisode */
  episode?: number;
  /** Saison */
  season?: number;
  /** Arc narratif couvert */
  arc?: string;
  /** Date de diffusion du dernier épisode (ISO 8601) */
  air_date?: string;
}

/**
 * Métadonnées SEO pour chaque série
 */
export interface SeriesSEO {
  /** Meta description */
  description: string;
  /** Keywords pour le SEO */
  keywords: string[];
  /** Titres alternatifs (pour la recherche) */
  alternate_titles?: string[];
}

/**
 * Série principale - Structure complète
 */
export interface MangaSeries {
  /** ID unique (slug format: "jujutsu-kaisen") */
  series_id: string;

  /** Titre anglais/rōmaji */
  title_en: string;

  /** Titre japonais original */
  title_jp: string;

  /** Titre français (si différent) */
  title_fr?: string;

  /** Type de matériel source */
  source_material: SourceMaterial;

  /** Priorité pour l'affichage (P0 = haute priorité) */
  priority: Priority;

  /** Informations sur le dernier anime */
  last_anime: LastAnimeInfo;

  /** Point de continuation pour le manga */
  manga_continuation?: MangaContinuationPoint;

  /** Point de continuation pour le light novel */
  light_novel_continuation?: LightNovelContinuationPoint;

  /** Informations sur l'adaptation manga (si source = light_novel) */
  manga_adaptation_info?: MangaAdaptationInfo;

  /** Statut de la série */
  status: SeriesStatus;

  /** Type de transition */
  transition_type: TransitionType;

  /** Flag d'avertissement (true si divergence majeure) */
  warning_flag: boolean;

  /** Message d'avertissement détaillé */
  warning_message?: string;

  /** Recommandation spéciale (ex: "Lire depuis le début") */
  recommendation?: string;

  /** Liens d'affiliation */
  affiliate_links?: AffiliateLinks;

  /** Métadonnées SEO */
  seo?: SeriesSEO;

  /** Tags pour filtrage (ex: ["shonen", "action", "supernatural"]) */
  tags?: string[];

  /** Popularité (score 1-10 basé sur MAL/AniList) */
  popularity_score?: number;

  /** Date de dernière mise à jour (ISO 8601) */
  last_updated?: string;
}

/**
 * Structure de la base de données complète
 */
export interface MangaDatabase {
  /** Version du schéma */
  schema_version: string;

  /** Date de dernière mise à jour de la base */
  last_updated: string;

  /** Nombre total de séries */
  total_series: number;

  /** Liste de toutes les séries */
  series: MangaSeries[];
}

/**
 * Résultat de recherche
 */
export interface SearchResult {
  series: MangaSeries;
  /** Score de pertinence (0-1) */
  relevance: number;
}
