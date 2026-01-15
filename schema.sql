-- 1. Leagues Table
create table public.leagues (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  created_by uuid references auth.users not null,
  lock_at timestamp with time zone,
  scoring_type text default 'linear'::text
);

-- 2. League Members (Connecting users to leagues)
create table public.league_members (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  league_id uuid references public.leagues not null,
  user_id uuid references auth.users not null,
  unique(league_id, user_id)
);

-- 3. Regular Season Predictions
create table public.predictions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users not null,
  league_id uuid references public.leagues not null,
  team_id text not null,
  predicted_rank integer not null,
  conference text not null,
  unique(user_id, league_id, team_id)
);

-- 4. Playoff Bracket Predictions
create table public.tournament_predictions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users not null,
  league_id uuid references public.leagues not null,
  stage_slug text not null, -- e.g., 'w_r1_1', 'nba_finals'
  team_id text not null,
  unique(user_id, league_id, stage_slug)
);

-- 5. Official Results (Managed by Admin)
create table public.official_playoff_results (
  match_id text primary key, -- e.g., 'w_r1_1'
  winning_team_id text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Leaderboard (View for easy querying)
-- This assumes you calculate scores in the frontend or have a function. 
-- Simple view example:
create view public.leaderboard as
  select 
    lm.league_id,
    lm.user_id,
    -- (Add scoring logic here if done in SQL)
    au.email
  from public.league_members lm
  join auth.users au on lm.user_id = au.id;

-- --- SECURITY POLICIES (RLS) ---

-- Enable RLS on all tables
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.predictions enable row level security;
alter table public.tournament_predictions enable row level security;
alter table public.official_playoff_results enable row level security;

-- Policies for Leagues
create policy "Public leagues are viewable by everyone" 
on public.leagues for select using (true);

create policy "Users can create leagues" 
on public.leagues for insert with check (auth.uid() = created_by);

create policy "Admins can update their leagues" 
on public.leagues for update using (auth.uid() = created_by);

-- Policies for Predictions
create policy "Users can view all predictions in their league" 
on public.predictions for select using (true);

create policy "Users can insert their own predictions" 
on public.predictions for insert with check (auth.uid() = user_id);

create policy "Users can update their own predictions" 
on public.predictions for update using (auth.uid() = user_id);

-- Policies for Tournament Predictions
create policy "Users can view all bracket picks" 
on public.tournament_predictions for select using (true);

create policy "Users can manage their bracket" 
on public.tournament_predictions for all using (auth.uid() = user_id);

-- Policies for Official Results
create policy "Everyone can view results" 
on public.official_playoff_results for select using (true);

-- (Only Super Admin should be able to insert/update results - set via Dashboard or SQL)
-- Example:
-- create policy "Super Admin Update" on public.official_playoff_results
-- for all using (auth.jwt() ->> 'email' = 'your_admin_email@gmail.com');
