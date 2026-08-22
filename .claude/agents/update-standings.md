---
name: update-standings
description: Manually run the ESPN → Supabase standings sync script
tools: [Bash, PowerShell, Read]
---

Manually trigger the NBA standings sync (normally run by GitHub Actions every 15 minutes).

## What the script does

`scripts/main.py` fetches current standings from the ESPN API and upserts them into the `official_regular_standings` table in Supabase, including:
- `actual_rank` per conference (sorted by win %)
- `previous_rank` (snapshotted every 12 hours for trend arrows)
- `wins`, `losses`, `last_updated`

## Prerequisites

`.env.local` must exist with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Install Python dependencies (once):
```
pip install -r scripts/requirements.txt
```

## Run

```
python scripts/main.py
```

The script skips the time-window check when `GITHUB_ACTIONS` is not set, so it always runs fully when executed locally.

## If standings look wrong

1. Check the ESPN API response at:  
   `https://site.api.espn.com/apis/v2/sports/basketball/nba/standings`

2. Check `TEAM_MAPPING` in `scripts/main.py` — ESPN abbreviations like `WSH`, `GS`, `NY` must map to the IDs in `src/lib/teams.ts`.

3. Verify the `official_regular_standings` table in the Supabase dashboard; rows are upserted on `team_id`.

## GitHub Actions schedule

The workflow at `.github/workflows/nba_scheduler.yml` runs every 15 minutes between **00:00–10:00 UTC**.

**2026-27 season window:** `START_DATE=2026-10-01` → `END_DATE=2027-06-30`. The script exits silently outside this window, which lets Supabase auto-pause during the off-season (free-tier sleep feature).

To update for a new season, change both `START_DATE` and `END_DATE` in the workflow YAML and in the Python fallback values inside `should_run()` in `scripts/main.py`.
