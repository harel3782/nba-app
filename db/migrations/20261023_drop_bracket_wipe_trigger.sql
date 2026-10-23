-- The bracket is seeded from official_regular_standings (FullPlayoffBracket.tsx), not from a user's
-- predicted ranks, so changing regular-season picks has no effect on it. This trigger deleted the
-- user's whole bracket on every regular-season save (even unchanged ranks), which only lost data.
DROP TRIGGER IF EXISTS on_standing_update ON public.user_regular_picks;
DROP FUNCTION IF EXISTS public.wipe_bracket_on_rank_change();
