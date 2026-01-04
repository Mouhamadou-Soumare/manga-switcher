# MangaSwitcher

Find exactly where to continue in the manga after watching the anime.

## Features

- Instant anime search
- Precise anime → manga chapter mapping
- Community voting system
- Open contribution model

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS 4
- Supabase (PostgreSQL)
- Jikan API (MyAnimeList)
- Vercel deployment

## Quick Start

### Prerequisites

- Node.js 20+
- Supabase account (free tier)

### Installation

1. Clone and install
   ```bash
   git clone https://github.com/your-username/manga_switcher.git
   cd manga_switcher
   npm install
   ```

2. Set up Supabase
   - Create project at [supabase.com](https://supabase.com)
   - Run `supabase/migrations/20240103000000_initial_schema.sql` in SQL Editor
   - Copy URL and anon key

3. Configure environment
   ```bash
   cp .env.example .env.local
   # Add your Supabase credentials to .env.local
   ```

4. Run development server
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

- `/app` - Next.js App Router pages and API routes
- `/components` - React components
- `/lib` - Utilities (fingerprinting, Supabase client)
- `/supabase` - Database schema and migrations

## Database Schema

### Core Tables

**animes**
- `id` (UUID, PK)
- `mal_id` (BIGINT, unique) - MyAnimeList ID
- `title`, `slug` (unique), `image`
- `updated_at`

**checkpoints**
- `id` (UUID, PK)
- `anime_id` (UUID, FK → animes)
- `mal_id` (BIGINT)
- `type` (SEASON/MOVIE/OVA/SPECIAL/ARC)
- `season`, `episode`, `chapter` (required), `volume`
- `label`, `note`
- `is_canon` (BOOLEAN) - Canon vs filler content
- `upvotes`, `downvotes` (INTEGER)
- `created_at`

### Voting System Tables

**votes**
- `id` (UUID, PK)
- `checkpoint_id` (UUID, FK → checkpoints)
- `voter_fingerprint` (TEXT) - SHA-256 hash
- `vote_type` ('up' | 'down')
- `ip_address` (INET), `user_agent`
- `created_at`, `updated_at`
- **Constraint:** UNIQUE(checkpoint_id, voter_fingerprint)

**vote_rate_limits**
- `id` (UUID, PK)
- `voter_fingerprint` (TEXT, unique)
- `vote_count`, `window_start`, `last_vote_at`
- `is_suspicious` (BOOLEAN), `suspicious_reason`
- **Rate limiting:** 10 votes/hour, 3s cooldown

## Routes

- `/` - Homepage with anime search
- `/anime/[slug]` - Anime detail page (e.g., `/anime/naruto-shippuden`)

## Server Actions

- `addCheckpoint()` - Submit new anime → manga mapping
- `voteForCheckpoint()` - Vote on checkpoint accuracy

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## Roadmap

- [ ] Admin moderation system
- [ ] User authentication
- [ ] Public API
- [ ] Multi-language support (EN/FR)

## License

MIT
