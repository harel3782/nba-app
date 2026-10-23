-- Bracket picks were readable by anyone (including logged-out users) through this policy,
-- which made league_members_can_read_bracket_picks pointless. Own picks stay readable via
-- "Users can manage their bracket picks".
DROP POLICY IF EXISTS "Everyone can view tournament picks" ON public.user_bracket_picks;

-- No-op function declared RETURNS trigger, so it could not be called as an RPC and was
-- attached to no trigger.
DROP FUNCTION IF EXISTS public.refresh_all_leaderboards();

-- Replaced by scoring_config (20261023_league_scoring_config.sql); every row was 'standard'.
ALTER TABLE public.leagues DROP COLUMN IF EXISTS scoring_type;
