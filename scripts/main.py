import requests
import os
from datetime import datetime, date, timezone
import sys
from supabase import create_client, Client

def load_local_env():
	# Load environment variables from .env.local for local testing
	try:
		with open('.env.local', 'r') as f:
			for line in f:
				line = line.strip()
				if line and not line.startswith('#') and '=' in line:
					key, val = line.split('=', 1)
					os.environ[key.strip()] = val.strip()
	except FileNotFoundError:
		pass

load_local_env()

# Fetch Supabase credentials with fallbacks
URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

if not URL or not KEY:
	print("CRITICAL ERROR: Supabase credentials are missing!")
	sys.exit(1)

supabase: Client = create_client(URL, KEY)

ESPN_API_URL = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings'

TEAM_MAPPING = {
	'WSH': 'WAS', 'UTAH': 'UTA', 'NO': 'NOP', 'NY': 'NYK',
	'GS': 'GSW', 'SA': 'SAS', 'BKN': 'BKN', 'BRK': 'BKN',
	'PHX': 'PHX', 'PHO': 'PHX', 'CHA': 'CHA', 'CHO': 'CHA'
}

def should_run():
	# --- Season window ---
	start_date_str = os.environ.get("START_DATE", "2026-10-01")
	end_date_str   = os.environ.get("END_DATE",   "2027-06-30")

	try:
		start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
	except ValueError:
		start_date = date(2026, 10, 1)

	try:
		end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
	except ValueError:
		end_date = date(2027, 6, 30)

	today = date.today()
	if today < start_date:
		print(f"Off-season: 2026-27 season hasn't started yet ({start_date_str}). Sleeping.")
		return False
	if today > end_date:
		print(f"Off-season: season ended on {end_date_str}. Sleeping.")
		return False

	# --- Hour window ---
	current_hour = datetime.now(timezone.utc).hour
	start_h = int(os.environ.get("START_HOUR_UTC", 0))
	end_h   = int(os.environ.get("END_HOUR_UTC",   10))  # default matches workflow

	if not (start_h <= current_hour <= end_h):
		print(f"Outside of active hours ({current_hour} UTC). Skipping.")
		return False

	return True

def update_standings():
	print("Fetching data from ESPN...")
	response = requests.get(ESPN_API_URL)
	data = response.json()

	print("Fetching current DB state...")
	existing_data = supabase.table("official_regular_standings").select("*").execute()
	db_map = {item['team_id']: item for item in existing_data.data}

	current_time = datetime.now(timezone.utc)
	all_teams_data = {'East': [], 'West': []}
	
	for conference in data.get('children', []):
		conf_name = 'East' if 'East' in conference.get('name', '') else 'West'
		for entry in conference.get('standings', {}).get('entries', []):
			team_code_espn = entry['team']['abbreviation']
			team_code_nba = TEAM_MAPPING.get(team_code_espn, team_code_espn)
			
			wins, losses, playoff_seed = 0, 0, None
			for stat in entry.get('stats', []):
				if stat.get('name') == 'wins': wins = int(stat.get('value', 0))
				elif stat.get('name') == 'losses': losses = int(stat.get('value', 0))
				elif stat.get('name') == 'playoffSeed': playoff_seed = int(stat.get('value', 0))

			all_teams_data[conf_name].append({
				'team_id': team_code_nba, 'wins': wins, 'losses': losses, 'playoff_seed': playoff_seed
			})

	db_rows = []
	for conf_name, teams in all_teams_data.items():
		# Use ESPN's playoffSeed (already has proper NBA tiebreakers applied).
		# Fall back to list position if the stat is missing.
		has_seeds = all(t['playoff_seed'] is not None for t in teams)
		if has_seeds:
			sorted_teams = sorted(teams, key=lambda x: x['playoff_seed'])
		else:
			# Fallback: sort by win% then wins (pre-season / no seed available)
			sorted_teams = sorted(teams, key=lambda x: (x['wins'] / (x['wins'] + x['losses']) if (x['wins'] + x['losses']) > 0 else 0, x['wins']), reverse=True)

		for index, team_data in enumerate(sorted_teams):
			rank = index + 1
			team_id = team_data['team_id']
			old_row = db_map.get(team_id)
			
			prev_rank = rank
			if old_row:
				try:
					# Flexible parsing for ISO strings to avoid ValueError
					last_update_str = old_row['last_updated'].replace(' ', 'T')
					if not any(z in last_update_str for z in ['Z', '+']):
						last_update_str += '+00:00'
					last_update = datetime.fromisoformat(last_update_str)
					
					if (current_time - last_update).total_seconds() > 43200:
						prev_rank = old_row['actual_rank']
					else:
						prev_rank = old_row.get('previous_rank', rank)
				except Exception:
					prev_rank = old_row.get('actual_rank', rank)

			db_rows.append({
				"team_id": team_id,
				"conference": conf_name,
				"actual_rank": rank,
				"previous_rank": prev_rank,
				"wins": team_data['wins'],
				"losses": team_data['losses'],
				"last_updated": current_time.isoformat()
			})

	print("Upserting mathematically sorted data to official_regular_standings...")
	supabase.table('official_regular_standings').upsert(db_rows).execute()
	print("✅ Standings updated successfully!")

# --- Playoff results -------------------------------------------------------

ESPN_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard'

# ESPN play-in game labels look like "NBA Play-In - East - 7th Place vs 8th Place".
PLAY_IN_SLOTS = {
	'7th Place vs 8th Place': 'pi_7v8',
	'9th Place vs 10th Place': 'pi_9v10',
	'8th Seed Game': 'pi_8th',
}
R1_SLOT_BY_TOP_SEED = {1: 'r1_1vs8', 2: 'r1_2vs7', 3: 'r1_3vs6', 4: 'r1_4vs5'}
SEMI_1_FEEDERS = {'r1_1vs8', 'r1_4vs5'}

def normalize_team(abbreviation):
	return TEAM_MAPPING.get(abbreviation, abbreviation)

def fetch_playoff_seeds(season=None):
	params = {'season': season} if season else {}
	data = requests.get(ESPN_API_URL, params=params, timeout=30).json()
	seeds = {}
	for conference in data.get('children', []):
		for entry in conference.get('standings', {}).get('entries', []):
			for stat in entry.get('stats', []):
				if stat.get('name') == 'playoffSeed':
					seeds[normalize_team(entry['team']['abbreviation'])] = int(stat.get('value', 0))
	return seeds

def fetch_postseason_events(year, months):
	events = []
	for month in months:
		response = requests.get(ESPN_SCOREBOARD_URL, params={'dates': f'{year}{month:02d}', 'limit': 1000}, timeout=30)
		response.raise_for_status()
		events += response.json().get('events', [])
	# Regular-season games also carry a (head-to-head) "series", so filter by season type: 3 = playoffs, 5 = play-in.
	return [e for e in events if e.get('season', {}).get('type') in (3, 5)]

def compute_playoff_results(events, seeds):
	"""Returns {match_id: (winning_team_id, games)} for every finished play-in game and completed series."""
	results = {}
	r1_slot_by_team = {}
	completed_series = []

	for event in events:
		comp = event['competitions'][0]
		note = (comp.get('notes') or [{}])[0].get('headline', '')
		team_by_espn_id = {c['team']['id']: normalize_team(c['team']['abbreviation']) for c in comp['competitors']}

		if event['season']['type'] == 5:
			parts = note.split(' - ')
			slot = PLAY_IN_SLOTS.get(parts[2]) if len(parts) == 3 else None
			winner = next((team_by_espn_id[c['team']['id']] for c in comp['competitors'] if c.get('winner')), None)
			if slot and parts[1] in ('East', 'West') and comp['status']['type'].get('completed') and winner:
				results[f"{parts[1][0].lower()}_{slot}"] = (winner, 1)
			continue

		label = note.split(' - Game')[0]
		if label.endswith('1st Round'):
			teams = list(team_by_espn_id.values())
			top_seed = min(seeds.get(t, 99) for t in teams)
			if top_seed in R1_SLOT_BY_TOP_SEED:
				for t in teams:
					r1_slot_by_team[t] = R1_SLOT_BY_TOP_SEED[top_seed]
			else:
				print(f"⚠️ Could not seed first-round series {teams} (seeds {[seeds.get(t) for t in teams]})")

		series = comp.get('series') or {}
		if series.get('type') == 'playoff' and series.get('completed'):
			wins = {team_by_espn_id[c['id']]: c['wins'] for c in series['competitors']}
			completed_series.append((label, wins))

	for label, wins in completed_series:
		winner = max(wins, key=wins.get)
		games = sum(wins.values())
		if label == 'NBA Finals':
			results['nba_finals'] = (winner, games)
			continue
		conf, _, round_name = label.partition(' ')
		if conf not in ('East', 'West'):
			print(f"⚠️ Unrecognised series label: {label!r}")
			continue
		prefix = f"{conf[0].lower()}_"
		if round_name == '1st Round':
			slot = r1_slot_by_team.get(winner)
		elif round_name == 'Semifinals':
			feeders = {r1_slot_by_team.get(t) for t in wins}
			slot = 'semi_1' if feeders & SEMI_1_FEEDERS else 'semi_2' if None not in feeders else None
		elif round_name == 'Finals':
			slot = 'conf_final'
		else:
			slot = None
		if slot:
			results[prefix + slot] = (winner, games)
		else:
			print(f"⚠️ Could not place series {label!r} {wins}")

	return results

def update_playoff_results(today=None):
	today = today or date.today()
	if not 4 <= today.month <= 6:
		print("Not playoff season (April–June). Skipping playoff results.")
		return

	print("Fetching playoff results from ESPN...")
	computed = compute_playoff_results(fetch_postseason_events(today.year, range(4, today.month + 1)), fetch_playoff_seeds())
	existing = {r['match_id']: r for r in supabase.table('official_playoff_results').select('*').execute().data}

	new_rows = []
	for match_id, (winner, games) in sorted(computed.items()):
		current = existing.get(match_id)
		if current is None:
			new_rows.append({'match_id': match_id, 'winning_team_id': winner, 'actual_games': games})
		elif current['winning_team_id'] != winner or current.get('actual_games') != games:
			# Results entered in the admin panel always win; just flag the difference.
			print(f"⚠️ {match_id}: DB has {current['winning_team_id']} in {current.get('actual_games')}, ESPN says {winner} in {games}. Keeping DB value.")

	if new_rows:
		supabase.table('official_playoff_results').upsert(new_rows, on_conflict='match_id').execute()
		print(f"✅ Added {len(new_rows)} playoff result(s): {', '.join(r['match_id'] for r in new_rows)}")
	else:
		print("No new playoff results.")

def preview_playoff_results(year):
	"""Prints what would be written for a past postseason, without touching the database."""
	results = compute_playoff_results(fetch_postseason_events(year, range(4, 7)), fetch_playoff_seeds(season=year))
	for match_id, (winner, games) in sorted(results.items()):
		print(f"{match_id:<14} {winner:<4} {games}")
	print(f"{len(results)} results")

if __name__ == "__main__":
	if len(sys.argv) == 3 and sys.argv[1] == '--preview-playoffs':
		preview_playoff_results(int(sys.argv[2]))
	elif os.environ.get("GITHUB_ACTIONS") == "true":
		if should_run():
			update_standings()
			update_playoff_results()
	else:
		update_standings()
		update_playoff_results()