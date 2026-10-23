-- Members can remove their own membership. The league creator cannot leave (they delete the league instead).
-- Picks are kept on purpose: they drop out of the leaderboards with the membership and come back if the user rejoins.
CREATE POLICY "Members can leave leagues"
  ON public.league_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.leagues l
      WHERE l.id = league_members.league_id AND l.created_by = auth.uid()
    )
  );
