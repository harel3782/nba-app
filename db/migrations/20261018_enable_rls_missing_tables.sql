-- Enable RLS on tables that were missing it.
-- All anon/authenticated grants already existed; these policies scope them properly.

ALTER TABLE public.official_regular_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

-- standings: public read-only (writes come from sync script via service_role key)
CREATE POLICY "standings_public_read"
  ON public.official_regular_standings FOR SELECT
  TO anon, authenticated
  USING (true);

-- teams: public read-only
CREATE POLICY "teams_public_read"
  ON public.teams FOR SELECT
  TO anon, authenticated
  USING (true);

-- league_members: authenticated users only; insert own rows; delete by league creator
CREATE POLICY "league_members_select"
  ON public.league_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "league_members_insert"
  ON public.league_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Note: "Enable delete for league creator" policy already existed and is now enforced.
