-- Database rule tests: pick locks, atomic bracket save, members-only leaderboard, leaving a league.
-- Paste into the Supabase SQL editor and run. It builds a throwaway league from two existing users,
-- acts as them through the `authenticated` role, and ALWAYS rolls back by ending with an error whose
-- message is the result: "ALL DB RULE TESTS PASSED" or "DB RULE TESTS FAILED: <which ones>".
DO $$
DECLARE
  admin_role text := current_user;
  creator uuid;
  member uuid;
  lg uuid;
  team text;
  n int;
  failures text := '';
BEGIN
  SELECT id INTO creator FROM auth.users ORDER BY created_at LIMIT 1;
  SELECT id INTO member FROM auth.users WHERE id <> creator ORDER BY created_at LIMIT 1;
  IF member IS NULL THEN
    RAISE EXCEPTION 'Need at least two users in auth.users to run these tests';
  END IF;
  SELECT id INTO team FROM public.teams ORDER BY id LIMIT 1;

  INSERT INTO public.leagues (name, created_by, regular_season_lock_at, playoff_lock_at)
  VALUES ('__db_rule_test__', creator, now() + interval '1 day', now() + interval '2 days')
  RETURNING id INTO lg;
  INSERT INTO public.league_members (league_id, user_id) VALUES (lg, creator), (lg, member);

  -- Act as the member.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', member, 'role', 'authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  -- 1. Before the locks, picks can be written.
  BEGIN
    INSERT INTO public.user_regular_picks (user_id, league_id, team_id, predicted_rank, conference)
    VALUES (member, lg, team, 1, 'West');
    PERFORM public.save_bracket_picks(lg, '[{"stage_slug":"FINALS","team_id":"OKC","predicted_games":5}]');
  EXCEPTION WHEN others THEN failures := failures || 'unlocked writes failed (' || sqlerrm || '); ';
  END;

  -- 2. Leaderboard: members see their league, anon sees nothing.
  SELECT count(*) INTO n FROM public.leaderboard WHERE league_id = lg;
  IF n <> 2 THEN failures := failures || 'member saw ' || n || ' leaderboard rows (expected 2); '; END IF;
  PERFORM set_config('role', 'anon', true);
  BEGIN
    PERFORM 1 FROM public.leaderboard LIMIT 1;
    failures := failures || 'anon could read leaderboard; ';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- 3. A failed bracket save keeps the previous bracket.
  PERFORM set_config('role', 'authenticated', true);
  BEGIN
    PERFORM public.save_bracket_picks(lg, '[{"stage_slug":"W_CF","team_id":"OKC","predicted_games":4},{"stage_slug":null,"team_id":"OKC","predicted_games":4}]');
    failures := failures || 'invalid bracket save succeeded; ';
  EXCEPTION WHEN others THEN NULL;
  END;
  PERFORM set_config('role', admin_role, true);
  SELECT count(*) INTO n FROM public.user_bracket_picks WHERE league_id = lg AND user_id = member AND stage_slug = 'FINALS';
  IF n <> 1 THEN failures := failures || 'failed bracket save lost the previous bracket; '; END IF;

  -- 4. After the regular season lock, regular picks are frozen for the member.
  UPDATE public.leagues SET regular_season_lock_at = now() - interval '1 minute' WHERE id = lg;
  PERFORM set_config('role', 'authenticated', true);
  BEGIN
    UPDATE public.user_regular_picks SET predicted_rank = 2 WHERE league_id = lg AND user_id = member;
    failures := failures || 'locked update allowed; ';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    DELETE FROM public.user_regular_picks WHERE league_id = lg AND user_id = member;
    failures := failures || 'locked delete allowed; ';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- 5. After the playoff lock, bracket saves are rejected and the bracket is kept.
  PERFORM set_config('role', admin_role, true);
  UPDATE public.leagues SET playoff_lock_at = now() - interval '1 minute' WHERE id = lg;
  PERFORM set_config('role', 'authenticated', true);
  BEGIN
    PERFORM public.save_bracket_picks(lg, '[]');
    failures := failures || 'locked bracket save allowed; ';
  EXCEPTION WHEN others THEN NULL;
  END;
  PERFORM set_config('role', admin_role, true);
  SELECT count(*) INTO n FROM public.user_bracket_picks WHERE league_id = lg AND user_id = member;
  IF n <> 1 THEN failures := failures || 'locked bracket save changed the bracket; '; END IF;

  -- 6. A member cannot remove someone else, but can leave themselves.
  PERFORM set_config('role', 'authenticated', true);
  DELETE FROM public.league_members WHERE league_id = lg AND user_id = creator;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN failures := failures || 'member removed another member; '; END IF;
  DELETE FROM public.league_members WHERE league_id = lg AND user_id = member;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN failures := failures || 'member could not leave; '; END IF;

  -- 7. The creator can still delete the league after the locks (cascades remove the picks).
  PERFORM set_config('request.jwt.claims', json_build_object('sub', creator, 'role', 'authenticated')::text, true);
  DELETE FROM public.leagues WHERE id = lg;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN failures := failures || 'creator could not delete the league after the lock; '; END IF;

  PERFORM set_config('role', admin_role, true);
  IF failures = '' THEN
    RAISE EXCEPTION 'ALL DB RULE TESTS PASSED (rolled back)';
  ELSE
    RAISE EXCEPTION 'DB RULE TESTS FAILED: %', failures;
  END IF;
END $$;
