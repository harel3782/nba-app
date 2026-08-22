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
			
			wins, losses = 0, 0
			for stat in entry.get('stats', []):
				if stat.get('name') == 'wins': wins = int(stat.get('value', 0))
				elif stat.get('name') == 'losses': losses = int(stat.get('value', 0))
			
			total_games = wins + losses
			win_pct = (wins / total_games) if total_games > 0 else 0
			
			all_teams_data[conf_name].append({
				'team_id': team_code_nba, 'wins': wins, 'losses': losses, 'win_pct': win_pct
			})

	db_rows = []
	for conf_name, teams in all_teams_data.items():
		sorted_teams = sorted(teams, key=lambda x: (x['win_pct'], x['wins']), reverse=True)
		
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

if __name__ == "__main__":
	if os.environ.get("GITHUB_ACTIONS") == "true":
		if should_run():
			update_standings()
	else:
		update_standings()