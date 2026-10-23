-- 1. Leaderboard: only league members can read a league's rows, and anon cannot read it at all.
--    The view runs with owner rights (it needs auth.users for usernames), so RLS on the
--    underlying tables does not apply; the membership filter has to live in the view.
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  lm.league_id,
  lm.user_id,
  COALESCE(au.raw_user_meta_data ->> 'display_name', split_part(au.email::text, '@', 1)) AS username,
  COALESCE(sum(p.pts), 0::bigint) AS total_score,
  COALESCE(sum(p.pts) FILTER (WHERE os.conference = 'West'), 0::bigint) AS west_score,
  COALESCE(sum(p.pts) FILTER (WHERE os.conference = 'East'), 0::bigint) AS east_score
FROM public.league_members lm
JOIN public.leagues l ON l.id = lm.league_id
JOIN auth.users au ON au.id = lm.user_id
LEFT JOIN public.user_regular_picks ur ON ur.user_id = lm.user_id AND ur.league_id = lm.league_id
LEFT JOIN public.official_regular_standings os ON os.team_id::text = ur.team_id
LEFT JOIN LATERAL (
  SELECT COALESCE(
    (COALESCE(l.scoring_config -> 'regular', '[10,6,3,1]'::jsonb) ->> abs(ur.predicted_rank - os.actual_rank))::int,
    0
  ) AS pts
) p ON true
WHERE lm.league_id IN (SELECT m.league_id FROM public.league_members m WHERE m.user_id = auth.uid())
GROUP BY lm.league_id, lm.user_id, au.raw_user_meta_data, au.email;

REVOKE ALL ON public.leaderboard FROM anon, authenticated;
GRANT SELECT ON public.leaderboard TO authenticated;

-- 2. Picks cannot be written after the league's lock (regular picks: regular_season_lock_at,
--    bracket picks: playoff_lock_at). Applies to API users only (current_user authenticated/anon);
--    SQL editor, service role and SECURITY DEFINER functions are not restricted.
--    Deletes after the lock are still allowed when cascaded from another trigger
--    (league deletion, bracket wipe on rank change) or done by the league creator.
CREATE OR REPLACE FUNCTION public.enforce_pick_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  lock_col text := CASE TG_TABLE_NAME WHEN 'user_regular_picks' THEN 'regular_season_lock_at' ELSE 'playoff_lock_at' END;
  league uuid;
  lock_at timestamptz;
  creator uuid;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  FOREACH league IN ARRAY CASE TG_OP
    WHEN 'INSERT' THEN ARRAY[NEW.league_id]
    WHEN 'DELETE' THEN ARRAY[OLD.league_id]
    ELSE ARRAY[OLD.league_id, NEW.league_id]
  END LOOP
    EXECUTE format('SELECT %I, created_by FROM public.leagues WHERE id = $1', lock_col)
      INTO lock_at, creator USING league;

    IF lock_at IS NOT NULL AND now() >= lock_at THEN
      IF TG_OP = 'DELETE' AND (pg_trigger_depth() > 1 OR auth.uid() = creator) THEN
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'Picks are locked for this league' USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS enforce_pick_lock ON public.user_regular_picks;
CREATE TRIGGER enforce_pick_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_regular_picks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pick_lock();

DROP TRIGGER IF EXISTS enforce_pick_lock ON public.user_bracket_picks;
CREATE TRIGGER enforce_pick_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_bracket_picks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pick_lock();

-- 3. Atomic bracket save: replaces the caller's picks for a league in one transaction,
--    so a failed insert can no longer leave the user with an empty bracket.
CREATE OR REPLACE FUNCTION public.save_bracket_picks(p_league_id uuid, p_picks jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.user_bracket_picks WHERE user_id = auth.uid() AND league_id = p_league_id;

  INSERT INTO public.user_bracket_picks (user_id, league_id, stage_slug, team_id, predicted_games)
  SELECT auth.uid(), p_league_id, x.stage_slug, x.team_id, x.predicted_games
  FROM jsonb_to_recordset(COALESCE(p_picks, '[]'::jsonb)) AS x(stage_slug text, team_id text, predicted_games int);
END;
$$;

REVOKE ALL ON FUNCTION public.save_bracket_picks(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_bracket_picks(uuid, jsonb) TO authenticated;
