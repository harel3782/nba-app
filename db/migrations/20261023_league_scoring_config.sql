-- Per-league custom scoring rules. NULL scoring_config = standard rules.
-- Shape: { "regular": [10,6,3,1], "playoff": { "pi": 5, "r1": [10,5], "semis": [20,10], "cf": [40,20], "finals": [80,40] } }
-- regular[i] = points when a pick is off by i ranks; beyond the array = 0.
-- playoff round arrays = [correct winner, correct number of games bonus].

ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS scoring_config jsonb;

CREATE OR REPLACE FUNCTION public.is_valid_scoring_config(c jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  -- Missing keys yield NULL, which a CHECK would treat as passing; force them to false.
  SELECT c IS NULL OR COALESCE((
    jsonb_typeof(c -> 'regular') = 'array'
    AND jsonb_array_length(c -> 'regular') BETWEEN 1 AND 15
    AND jsonb_typeof(c -> 'playoff') = 'object'
    AND jsonb_typeof(c -> 'playoff' -> 'pi') = 'number'
    AND (
      SELECT bool_and((jsonb_typeof(c -> 'playoff' -> k) = 'array' AND jsonb_array_length(c -> 'playoff' -> k) = 2) IS TRUE)
      FROM unnest(ARRAY['r1', 'semis', 'cf', 'finals']) AS k
    )
    AND NOT EXISTS (
      SELECT 1
      FROM (
        SELECT jsonb_array_elements(c -> 'regular') AS v
        UNION ALL SELECT c -> 'playoff' -> 'pi'
        UNION ALL SELECT jsonb_array_elements(c -> 'playoff' -> k) FROM unnest(ARRAY['r1', 'semis', 'cf', 'finals']) AS k
      ) vals
      WHERE jsonb_typeof(v) <> 'number' OR v::numeric < 0 OR v::numeric > 1000 OR v::numeric <> trunc(v::numeric)
    )
  ), false)
$$;

ALTER TABLE public.leagues
  ADD CONSTRAINT leagues_scoring_config_valid CHECK (public.is_valid_scoring_config(scoring_config));

-- Rules are frozen once the regular season lock has passed.
CREATE OR REPLACE FUNCTION public.leagues_freeze_scoring_config()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.scoring_config IS DISTINCT FROM OLD.scoring_config
     AND OLD.regular_season_lock_at IS NOT NULL
     AND now() >= OLD.regular_season_lock_at THEN
    RAISE EXCEPTION 'Scoring rules are frozen after the regular season lock';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leagues_freeze_scoring_config ON public.leagues;
CREATE TRIGGER leagues_freeze_scoring_config
  BEFORE UPDATE ON public.leagues
  FOR EACH ROW EXECUTE FUNCTION public.leagues_freeze_scoring_config();

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
GROUP BY lm.league_id, lm.user_id, au.raw_user_meta_data, au.email;
