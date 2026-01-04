-- =====================================================
-- Seed: Real Anime Checkpoints
-- =====================================================
-- Verified checkpoints for popular anime series
-- Sources: Official manga chapters, community wikis
-- =====================================================

-- ONE PIECE
-- MAL ID: 21 (One Piece)
INSERT INTO public.animes (mal_id, title, image, slug)
VALUES (
  21,
  'One Piece',
  'https://cdn.myanimelist.net/images/anime/6/73245l.jpg',
  'one-piece'
) ON CONFLICT (mal_id) DO UPDATE SET
  title = EXCLUDED.title,
  image = EXCLUDED.image,
  slug = EXCLUDED.slug;

-- Arc Alabasta (Episode 130)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, arc_name, episode, chapter, volume, label, note)
SELECT id, 21, 'ARC', true, 'Alabasta', 130, 217, 23, 'Fin Arc Alabasta (Ép. 130)', 'Arc du royaume d''Alabasta'
FROM public.animes WHERE mal_id = 21;

-- Arc Enies Lobby (Episode 312)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, arc_name, episode, chapter, volume, label, note)
SELECT id, 21, 'ARC', true, 'Enies Lobby', 312, 441, 46, 'Fin Arc Enies Lobby (Ép. 312)', 'Arc du CP9 et de l''île judiciaire'
FROM public.animes WHERE mal_id = 21;

-- Arc Marineford (Episode 489)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, arc_name, episode, chapter, volume, label, note)
SELECT id, 21, 'ARC', true, 'Marineford', 489, 590, 59, 'Fin Arc Marineford (Ép. 489)', 'Arc de la guerre au sommet'
FROM public.animes WHERE mal_id = 21;

-- Arc Dressrosa (Episode 746)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, arc_name, episode, chapter, volume, label, note)
SELECT id, 21, 'ARC', true, 'Dressrosa', 746, 801, 80, 'Fin Arc Dressrosa (Ép. 746)', 'Arc du royaume de Dressrosa'
FROM public.animes WHERE mal_id = 21;

-- Arc Whole Cake Island (Episode 877)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, arc_name, episode, chapter, volume, label, note)
SELECT id, 21, 'ARC', true, 'Whole Cake Island', 877, 902, 90, 'Fin Arc Whole Cake Island (Ép. 877)', 'Arc de l''île gâteau'
FROM public.animes WHERE mal_id = 21;

-- Arc Wano (Episode 1085)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, arc_name, episode, chapter, volume, label, note)
SELECT id, 21, 'ARC', true, 'Wano', 1085, 1057, 105, 'Fin Arc Wano (Ép. 1085)', 'Arc du pays de Wano'
FROM public.animes WHERE mal_id = 21;


-- NARUTO
-- MAL ID: 20 (Naruto)
INSERT INTO public.animes (mal_id, title, image, slug)
VALUES (
  20,
  'Naruto',
  'https://cdn.myanimelist.net/images/anime/13/17405l.jpg',
  'naruto'
) ON CONFLICT (mal_id) DO UPDATE SET
  title = EXCLUDED.title,
  image = EXCLUDED.image,
  slug = EXCLUDED.slug;

-- Fin de Naruto original (Episode 220)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 20, 'SEASON', true, 1, 220, 238, 27, 'Fin Saison 1 (Ép. 220)', 'Fin de la partie 1, reprendre au début de Naruto Shippuden au chapitre 245 environ'
FROM public.animes WHERE mal_id = 20;


-- NARUTO SHIPPUDEN
-- MAL ID: 1735 (Naruto Shippuden)
INSERT INTO public.animes (mal_id, title, image, slug)
VALUES (
  1735,
  'Naruto: Shippuuden',
  'https://cdn.myanimelist.net/images/anime/1565/111305l.jpg',
  'naruto-shippuuden'
) ON CONFLICT (mal_id) DO UPDATE SET
  title = EXCLUDED.title,
  image = EXCLUDED.image,
  slug = EXCLUDED.slug;

-- Arc Pain (Episode 175)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, arc_name, episode, chapter, volume, label, note)
SELECT id, 1735, 'ARC', true, 'Pain', 175, 449, 48, 'Fin Arc Pain (Ép. 175)', 'Arc de l''invasion de Konoha'
FROM public.animes WHERE mal_id = 1735;

-- Fin de la série (Episode 500)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 1735, 'SEASON', true, 1, 500, 700, 72, 'Fin Saison 1 (Ép. 500)', 'Fin de la 4ème guerre ninja'
FROM public.animes WHERE mal_id = 1735;


-- ATTACK ON TITAN
-- MAL ID: 16498 (Attack on Titan)
INSERT INTO public.animes (mal_id, title, image, slug)
VALUES (
  16498,
  'Shingeki no Kyojin',
  'https://cdn.myanimelist.net/images/anime/10/47347l.jpg',
  'shingeki-no-kyojin'
) ON CONFLICT (mal_id) DO UPDATE SET
  title = EXCLUDED.title,
  image = EXCLUDED.image,
  slug = EXCLUDED.slug;

-- Saison 1 (Episode 25)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 16498, 'SEASON', true, 1, 25, 33, 8, 'Fin Saison 1 (Ép. 25)', 'Arc de la Titan Féminin'
FROM public.animes WHERE mal_id = 16498;

-- Saison 2 (Episode 37 / Episode 12 de S2)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 16498, 'SEASON', true, 2, 37, 50, 12, 'Fin Saison 2 (Ép. 37)', 'Arc du Clash des Titans'
FROM public.animes WHERE mal_id = 16498;

-- Saison 3 Part 1 (Episode 49 / Episode 12 de S3)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 16498, 'SEASON', true, 3, 49, 70, 17, 'Fin Saison 3 Part 1 (Ép. 49)', 'Arc de l''Insurrection Royale'
FROM public.animes WHERE mal_id = 16498;

-- Saison 3 Part 2 (Episode 59 / Episode 10 de S3P2)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 16498, 'SEASON', true, 3, 59, 90, 22, 'Fin Saison 3 Part 2 (Ép. 59)', 'Arc du Retour à Shiganshina'
FROM public.animes WHERE mal_id = 16498;

-- Saison 4 Part 1 (The Final Season)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 16498, 'SEASON', true, 4, 75, 116, 29, 'Fin Saison 4 Part 1 (Ép. 75)', 'Arc de Mahr'
FROM public.animes WHERE mal_id = 16498;

-- Saison 4 Part 2
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 16498, 'SEASON', true, 4, 87, 139, 34, 'Fin Saison 4 Part 2 (Ép. 87)', 'Fin de l''histoire'
FROM public.animes WHERE mal_id = 16498;


-- DEMON SLAYER (KIMETSU NO YAIBA)
-- MAL ID: 38000 (Demon Slayer)
INSERT INTO public.animes (mal_id, title, image, slug)
VALUES (
  38000,
  'Kimetsu no Yaiba',
  'https://cdn.myanimelist.net/images/anime/1286/99889l.jpg',
  'kimetsu-no-yaiba'
) ON CONFLICT (mal_id) DO UPDATE SET
  title = EXCLUDED.title,
  image = EXCLUDED.image,
  slug = EXCLUDED.slug;

-- Saison 1 (Episode 26)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 38000, 'SEASON', true, 1, 26, 53, 6, 'Fin Saison 1 (Ép. 26)', 'Entraînement chez Shinobu'
FROM public.animes WHERE mal_id = 38000;

-- Film Mugen Train
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, episode, chapter, volume, label, note)
SELECT id, 38000, 'MOVIE', true, 7, 69, 8, 'Film', 'Le film Mugen Train est canon et couvre les chapitres 54 à 69 (arc du train de l''infini)'
FROM public.animes WHERE mal_id = 38000;

-- Saison 2 - Entertainment District Arc (Episode 18 / incluant episodes du film)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 38000, 'SEASON', true, 2, 18, 99, 11, 'Fin Saison 2 (Ép. 18)', 'Arc du quartier des plaisirs'
FROM public.animes WHERE mal_id = 38000;

-- Saison 3 - Swordsmith Village Arc
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 38000, 'SEASON', true, 3, 11, 127, 15, 'Fin Saison 3 (Ép. 11)', 'Arc du village des forgerons'
FROM public.animes WHERE mal_id = 38000;


-- MY HERO ACADEMIA (BOKU NO HERO ACADEMIA)
-- MAL ID: 31964 (My Hero Academia)
INSERT INTO public.animes (mal_id, title, image, slug)
VALUES (
  31964,
  'Boku no Hero Academia',
  'https://cdn.myanimelist.net/images/anime/10/78745l.jpg',
  'boku-no-hero-academia'
) ON CONFLICT (mal_id) DO UPDATE SET
  title = EXCLUDED.title,
  image = EXCLUDED.image,
  slug = EXCLUDED.slug;

-- Saison 1 (Episode 13)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 31964, 'SEASON', true, 1, 13, 21, 3, 'Fin Saison 1 (Ép. 13)', 'Sports Festival arc début'
FROM public.animes WHERE mal_id = 31964;

-- Saison 2 (Episode 38)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 31964, 'SEASON', true, 2, 38, 70, 8, 'Fin Saison 2 (Ép. 38)', 'Arc Sports Festival et Hero Killer'
FROM public.animes WHERE mal_id = 31964;

-- Saison 3 (Episode 63)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 31964, 'SEASON', true, 3, 63, 124, 14, 'Fin Saison 3 (Ép. 63)', 'Arc du Camp d''entraînement et Hideout Raid'
FROM public.animes WHERE mal_id = 31964;

-- Saison 4 (Episode 88)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 31964, 'SEASON', true, 4, 88, 190, 21, 'Fin Saison 4 (Ép. 88)', 'Arc Shie Hassaikai et Culture Festival'
FROM public.animes WHERE mal_id = 31964;

-- Saison 5 (Episode 113)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 31964, 'SEASON', true, 5, 113, 257, 26, 'Fin Saison 5 (Ép. 113)', 'Arc Joint Training et My Villain Academia'
FROM public.animes WHERE mal_id = 31964;

-- Saison 6 (Episode 138)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 31964, 'SEASON', true, 6, 138, 328, 33, 'Fin Saison 6 (Ép. 138)', 'Arc Paranormal Liberation War'
FROM public.animes WHERE mal_id = 31964;


-- JUJUTSU KAISEN
-- MAL ID: 40748 (Jujutsu Kaisen)
INSERT INTO public.animes (mal_id, title, image, slug)
VALUES (
  40748,
  'Jujutsu Kaisen',
  'https://cdn.myanimelist.net/images/anime/1171/109222l.jpg',
  'jujutsu-kaisen'
) ON CONFLICT (mal_id) DO UPDATE SET
  title = EXCLUDED.title,
  image = EXCLUDED.image,
  slug = EXCLUDED.slug;

-- Saison 1 (Episode 24)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 40748, 'SEASON', true, 1, 24, 64, 8, 'Fin Saison 1 (Ép. 24)', 'Fin de l''arc de l''échange avec Kyoto'
FROM public.animes WHERE mal_id = 40748;

-- Film JJK 0 (Prequel)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, chapter, label, note)
SELECT id, 40748, 'MOVIE', true, 1, 'Film', 'JJK 0 est un prequel qui se déroule avant la série. C''est le Volume 0 du manga (volume séparé) à lire avant ou après la série principale.'
FROM public.animes WHERE mal_id = 40748;

-- Saison 2 (Episode 47 / Episode 23 de S2)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 40748, 'SEASON', true, 2, 47, 136, 16, 'Fin Saison 2 (Ép. 47)', 'Arc Shibuya Incident'
FROM public.animes WHERE mal_id = 40748;


-- DEATH NOTE
-- MAL ID: 1535 (Death Note)
INSERT INTO public.animes (mal_id, title, image, slug)
VALUES (
  1535,
  'Death Note',
  'https://cdn.myanimelist.net/images/anime/9/9453l.jpg',
  'death-note'
) ON CONFLICT (mal_id) DO UPDATE SET
  title = EXCLUDED.title,
  image = EXCLUDED.image,
  slug = EXCLUDED.slug;

-- Saison 1 complète (Episode 37)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 1535, 'SEASON', true, 1, 37, 108, 12, 'Fin Saison 1 (Ép. 37)', 'L''anime couvre l''intégralité du manga'
FROM public.animes WHERE mal_id = 1535;


-- FULLMETAL ALCHEMIST: BROTHERHOOD
-- MAL ID: 5114 (Fullmetal Alchemist: Brotherhood)
INSERT INTO public.animes (mal_id, title, image, slug)
VALUES (
  5114,
  'Fullmetal Alchemist: Brotherhood',
  'https://cdn.myanimelist.net/images/anime/1223/96541l.jpg',
  'fullmetal-alchemist-brotherhood'
) ON CONFLICT (mal_id) DO UPDATE SET
  title = EXCLUDED.title,
  image = EXCLUDED.image,
  slug = EXCLUDED.slug;

-- Saison 1 complète (Episode 64)
INSERT INTO public.checkpoints (anime_id, mal_id, type, is_canon, season, episode, chapter, volume, label, note)
SELECT id, 5114, 'SEASON', true, 1, 64, 108, 27, 'Fin Saison 1 (Ép. 64)', 'L''anime couvre l''intégralité du manga fidèlement'
FROM public.animes WHERE mal_id = 5114;
