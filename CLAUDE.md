# NBA Playoff Predictor — CLAUDE.md

## Project overview

Full-stack React + TypeScript + Supabase app where friends compete by predicting NBA regular-season standings and the full playoff bracket. Also ships as a native Android APK via Capacitor. A GitHub Actions cron job syncs live standings from ESPN every 15 minutes.

Live: https://nba-app-five.vercel.app  
GitHub: https://github.com/harel3782/nba-app

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS v3 (dark-mode aesthetic, NBA blue `#1D428A`) |
| Backend / DB | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password) |
| Mobile | Capacitor 8 → Android (`com.harel.nbaapp`) |
| PWA | `vite-plugin-pwa` (auto-update) |
| Drag-and-drop | `@hello-pangea/dnd` |
| Icons | `lucide-react` |
| Standings sync | Python 3 + ESPN API → GitHub Actions cron (every 15 min) |
| Formatting | Prettier + ESLint |

---

## Commands

```bash
# Web dev server (http://localhost:5173)
npm run dev

# Type-check + production build → dist/
npm run build

# Preview the production build
npm run preview

# Lint
npm run lint

# Format (Prettier)
npx prettier --write .

# Sync built web assets into Android project
npx cap sync android

# Open Android Studio (then build / run APK)
npx cap open android

# Generate adaptive icons + splash screen
npx @capacitor/assets generate --android

# Run the standings sync script locally (reads .env.local)
python scripts/main.py
```

---

## Required environment variables

Create `.env.local` in the repo root (never commit):

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPER_ADMIN_EMAIL=your_admin_email@gmail.com
```

The Python script (`scripts/main.py`) reads these same vars from `.env.local` when run locally. In GitHub Actions they're stored as `SUPABASE_URL` and `SUPABASE_KEY` secrets.

---

## Database tables (actual names in Supabase)

> ⚠️ `db/schema.sql` is outdated. The live table names differ — use these:

| Table | Description |
|-------|-------------|
| `leagues` | League settings: `id, name, created_by, regular_season_lock_at, playoff_lock_at, scoring_type` |
| `league_members` | `league_id, user_id` — who belongs to which league |
| `user_regular_picks` | Regular-season predictions: `user_id, league_id, team_id, predicted_rank, conference` |
| `user_bracket_picks` | Bracket picks: `user_id, league_id, stage_slug, team_id, predicted_games` |
| `official_regular_standings` | Ground truth standings synced from ESPN: `team_id, conference, actual_rank, previous_rank, wins, losses, last_updated` |
| `official_playoff_results` | Admin-entered playoff results: `match_id, winning_team_id, actual_games` |
| `leaderboard` | View/materialized view: `league_id, user_id, username, total_score, west_score, east_score` |

Supabase RPC called after saving results: `refresh_all_leaderboards()`.

---

## Stage slug mapping (bracket)

The frontend uses uppercase slugs; the admin panel and `official_playoff_results` table use lowercase slugs. The `ID_MAPPING` object in [`src/components/CombinedLeaderboard.tsx`](src/components/CombinedLeaderboard.tsx) handles translation.

| Frontend slug | DB `match_id` |
|--------------|--------------|
| `W_PI_78` | `w_pi_7v8` |
| `W_PI_910` | `w_pi_9v10` |
| `W_PI_8TH` | `w_pi_8th` |
| `W_R1_1` | `w_r1_1vs8` |
| `W_R1_2` | `w_r1_4vs5` |
| `W_R1_3` | `w_r1_3vs6` |
| `W_R1_4` | `w_r1_2vs7` |
| `W_R2_1` | `w_semi_1` |
| `W_R2_2` | `w_semi_2` |
| `W_CF` | `w_conf_final` |
| *(mirror for E_*)* | *(mirror for e_*)* |
| `FINALS` | `nba_finals` |

---

## Scoring system

### Regular season (Golf scoring — lower is better)
Calculated in the `leaderboard` view. Each prediction incurs a penalty based on how far off the predicted rank is from the actual rank.

### Playoffs (higher is better)
Calculated client-side in `CombinedLeaderboard.tsx`:

| Round | Correct pick | Correct games bonus |
|-------|-------------|---------------------|
| Play-In | +5 pts | — (single game) |
| Round 1 | +10 pts | +5 pts |
| Conference Semis | +20 pts | +10 pts |
| Conference Finals | +40 pts | +20 pts |
| NBA Finals | +80 pts | +40 pts |

Combined leaderboard = regular season score + playoff points.

---

## Key source files

```
src/
  App.tsx                        # Root: auth, league selection, tab routing
  lib/
    supabaseClient.ts            # Supabase singleton
    teams.ts                     # NBA_TEAMS array with id, name, conference, logo, color
  components/
    Auth.tsx                     # Email/password login & signup
    LeagueManager.tsx            # Create / join / switch leagues
    Header.tsx                   # Nav bar with profile + admin toggle
    LeagueHeader.tsx             # League name, lock status, settings button
    LeagueSettings(Modal).tsx    # Edit league name, lock dates, scoring type
    MainContent.tsx              # Tab router → BettingBoard / LeaderboardTable / Bracket
    BettingBoard.tsx             # Drag-and-drop standings prediction (East or West)
    LeaderboardTable.tsx         # Regular season leaderboard + per-team prediction grid
    FullPlayoffBracket.tsx       # Interactive bracket picker (Play-In → Finals)
    CombinedLeaderboard.tsx      # Playoff + regular combined rankings
    AdminPanel.tsx               # Super-admin wrapper
    AdminStandingsMonitor.tsx    # Read-only view of official_regular_standings
    AdminResultsControl.tsx      # Enter playoff results + call refresh_all_leaderboards RPC
    ProfileModal.tsx             # Change display name
    BracketMatch.tsx             # Single matchup box (used in FullPlayoffBracket)

scripts/
  main.py                        # ESPN → Supabase standings sync
  requirements.txt               # requests, supabase

.github/workflows/
  nba_scheduler.yml              # Cron every 15 min, window 00:00–10:00 UTC, season 2026-10-01 → 2027-06-30
```

---

## Architecture decisions

- **No Redux / Zustand** — state is co-located in components and lifted to `App.tsx` only when needed (`triggerSave`, `refreshTrigger` counters, `leagueDetails`).
- **Optimistic UX** — bracket picks update in state immediately; only actual DB write is deferred to "Save" button.
- **Cascade clearing** — when a matchup pick changes, all dependent downstream picks are cleared automatically (see `cascades` map in `FullPlayoffBracket.tsx`).
- **Dual slug system** — frontend slugs are compact (`W_R1_1`); DB match IDs are human-readable (`w_r1_1vs8`). Always go through `ID_MAPPING` when joining these.
- **Super admin gated by env var** — `VITE_SUPER_ADMIN_EMAIL` controls who sees the Admin Panel. Never hardcode.
- **localStorage persistence** — current league ID and active tab survive page refresh.
- **Android build** — `npm run build` → `npx cap sync android` → Android Studio. App ID: `com.harel.nbaapp`, status bar color: `#1D428A`.

---

## Common gotchas

1. **Table name drift** — `db/schema.sql` has `predictions` and `tournament_predictions`; the live DB uses `user_regular_picks` and `user_bracket_picks`. Don't trust the schema file.
2. **Slug case mismatch** — frontend slugs are UPPERCASE (`W_CF`); DB `match_id` values are lowercase (`w_conf_final`). Always use `ID_MAPPING`.
3. **`triggerSave` counter pattern** — global save increments an integer; child components watch it with `useEffect`. The East conference save is delayed 500 ms to avoid concurrent upserts.
4. **Bracket save: delete-then-insert** — `saveBracket()` does a full delete of the user's rows then re-inserts; no partial update.
5. **Standings script window** — `main.py` only runs between `START_HOUR_UTC` (0) and `END_HOUR_UTC` (10) UTC, and only until `END_DATE`. Update these in the workflow if needed for a new season.
6. **ESPN team abbreviation mapping** — ESPN uses `WSH`, `GS`, `NY`, etc. The `TEAM_MAPPING` dict in `scripts/main.py` normalises them to the IDs used in `teams.ts`.
