-- Remove duplicate/redundant RLS policies and hardcoded UUID admin policy.

-- user_bracket_picks duplicates
DROP POLICY IF EXISTS "Users can view all bracket picks" ON public.user_bracket_picks;
DROP POLICY IF EXISTS "Users can manage their tournament picks" ON public.user_bracket_picks;

-- user_regular_picks duplicates
DROP POLICY IF EXISTS "Users can view all predictions" ON public.user_regular_picks;
DROP POLICY IF EXISTS "Users can view all regular picks" ON public.user_regular_picks;
DROP POLICY IF EXISTS "Users manage their own predictions" ON public.user_regular_picks;
DROP POLICY IF EXISTS "Users can update their own regular picks" ON public.user_regular_picks;
DROP POLICY IF EXISTS "Users can insert their own regular picks" ON public.user_regular_picks;

-- official_playoff_results: drop hardcoded UUID policy; email-based policy covers the same person
DROP POLICY IF EXISTS "Only Super Admin Can Edit" ON public.official_playoff_results;
