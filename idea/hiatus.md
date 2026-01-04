# FEATURE REQUEST: "Hiatus Amnesia" (Search by Plot Event)

## CONTEXTE
Les utilisateurs oublient souvent le numéro de chapitre où ils se sont arrêtés, mais se souviennent d'un événement marquant (ex: "Gojo se fait sceller").
Nous voulons ajouter un mode de recherche secondaire : "Où en étais-je ?".

## OBJECTIF
Permettre à l'utilisateur de taper une description narrative et de trouver le chapitre correspondant.

## SPÉCIFICATIONS TECHNIQUES

### 1. Database (Supabase)
Créer une nouvelle table `story_events` (ou `plot_points`) liée à un anime/manga.
- `id`: uuid
- `manga_id`: foreign key
- `chapter_number`: integer (le chapitre où l'événement se produit)
- `description`: text (ex: "Naruto apprend le Rasengan")
- `tags`: text[] (keywords pour la recherche simple)
- `is_spoiler`: boolean (pour flouter le résultat si besoin, optionnel pour v1)

### 2. UI / UX
- Dans le composant `SearchAnime.tsx`, ajouter un **Toggle** ou un onglet :
  - Option A : "Chercher un Anime" (Défaut)
  - Option B : "Retrouver ma scène" (Nouveau)
- Si Option B est active :
  - Le placeholder change : "Ex: Luffy utilise le Gear 5..."
  - Les résultats affichent : "Événement trouvé au Chapitre X" avec un lien direct.

### 3. Logique de Recherche (MVP)
- Pour la V1, implémente une recherche textuelle simple (ilike sur `description`) via Supabase.
- Prépare le code pour que les contributeurs puissent ajouter des événements via le formulaire de contribution existant (ou un nouveau).

## ACTION REQUISE
1. Génère la migration SQL pour la nouvelle table.
2. Mets à jour les types TypeScript (`types.ts`).
3. Propose le code modifié pour `SearchAnime.tsx` pour inclure ce toggle.