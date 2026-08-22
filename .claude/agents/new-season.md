---
name: new-season
description: Checklist for resetting the app for a new NBA season
tools: [Read, Edit, Grep, PowerShell]
---

At the start of each new NBA season, work through this checklist to reset the app.

## 1. GitHub Actions schedule

In `.github/workflows/nba_scheduler.yml`, update both date vars:
```yaml
START_DATE: "YYYY-10-01"  # First day of the new season (typically early October)
END_DATE:   "YYYY-06-30"  # Last day of the playoffs (typically late June)
```
Also update the two Python fallback `date(...)` literals at the top of `should_run()` in `scripts/main.py` to match.

The script exits silently outside this window, which lets Supabase auto-pause during the off-season.

## 2. League lock dates

League admins set `regular_season_lock_at` and `playoff_lock_at` per league in the UI (League Settings modal → `LeagueSettingsModal.tsx`). Remind admins to update these for the new season — there's no app-wide reset.

## 3. Clear old playoff results (Supabase)

Run in the Supabase SQL Editor:
```sql
DELETE FROM official_playoff_results;
```
This wipes last season's bracket results. Do **not** delete `official_regular_standings` — the script will overwrite it.

## 4. Reset user picks (optional)

If you want a clean slate for all users:
```sql
-- Clear bracket picks
DELETE FROM user_bracket_picks;

-- Clear regular season picks
DELETE FROM user_regular_picks;
```
⚠️ This is irreversible — only do it if you want everyone to start fresh.

## 5. Refresh the leaderboard

After clearing results, call the RPC to rebuild the view:
```sql
SELECT refresh_all_leaderboards();
```

## 6. Team roster changes

If teams have changed (expansion, relocation, rebrand):
- Follow the `/add-team` skill to update `src/lib/teams.ts`
- Update `TEAM_MAPPING` in `scripts/main.py` if ESPN abbreviations changed

## 7. Scoring weights (if adjusting for the season)

Playoff scoring is hardcoded in `CombinedLeaderboard.tsx` in `getStagePoints()`. Regular-season golf scoring logic lives in the Supabase `leaderboard` view SQL. Update there if you want different weights.

## 8. Test end-to-end

1. Run `python scripts/main.py` — confirm standings populate.
2. Open the app (`npm run dev`) — confirm both conferences appear.
3. Make a test prediction, save it, check leaderboard.
4. In admin panel, enter a playoff result, save, confirm leaderboard updates.
