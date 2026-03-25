import requests
import os
import datetime
import time
import sys
from supabase import create_client, Client

# --- Native fallback to load .env.local without external libraries ---
def load_local_env():
	try:
		with open('.env.local', 'r') as f:
			for line in f:
				line = line.strip()
				if line and not line.startswith('#') and '=' in line:
					key, val = line.split('=', 1)
					os.environ[key.strip()] = val.strip()
	except FileNotFoundError:
		pass # It's perfectly fine if the file doesn't exist (like in GitHub Actions)

# Execute the local env loader
load_local_env()

# Fetch credentials (supports both GitHub Actions and local Vite setups)
URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

if not URL or not KEY:
	print("❌ CRITICAL ERROR: Supabase credentials are missing! Check GitHub Secrets or .env.local.")
	sys.exit(1)

supabase: Client = create_client(URL, KEY)

ESPN_API_URL = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings'

TEAM_MAPPING = {
	'WSH': 'WAS', 'UTAH': 'UTA', 'NO': 'NOP', 'NY': 'NYK',
	'GS': 'GSW', 'SA': 'SAS', 'BKN': 'BKN', 'BRK': 'BKN',
	'PHX': 'PHX', 'PHO': 'PHX', 'CHA': 'CHA', 'CHO': 'CHA'
}

def update_standings():
	print("Fetching data from ESPN...")
	try:
		headers = {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
			'Cache-Control': 'no-cache',
			'Pragma': 'no-cache'
		}
		params = {'_': int(time.time() * 1000)}
		
		response = requests.get(ESPN_API_URL, headers=headers, params=params, timeout=15)
		response.raise_for_status()
		data = response.json()
		print("✅ Successfully fetched data from ESPN")
	except Exception as e:
		print(f"❌ CRITICAL ERROR fetching from ESPN: {e}")
		sys.exit(1)

	# Fetch existing ranks to preserve trend history before deleting
	print("Fetching existing ranks from DB...")
	try:
		existing_data = supabase.table("actual_standings").select("team_id, actual_rank").execute()
		old_ranks = {item['team_id']: int(item['actual_rank']) for item in existing_data.data if item.get('actual_rank') is not None}
	except Exception as e:
		print(f"⚠️ Warning: Could not fetch old ranks. Proceeding without trends. ({e})")
		old_ranks = {}

	db_rows = []
	current_time = datetime.datetime.now().isoformat()

	for conference in data.get('children', []):
		conf_name = 'East' if 'East' in conference.get('name', '') else 'West'
		
		for index, entry in enumerate(conference.get('standings', {}).get('entries', [])):
			team_code_espn = entry['team']['abbreviation']
			team_code_nba = TEAM_MAPPING.get(team_code_espn, team_code_espn)
			
			rank = index + 1 
			wins = 0
			losses = 0
			
			for stat in entry.get('stats', []):
				stat_name = stat.get('name')
				if stat_name == 'playoffSeed':
					rank = int(stat.get('value', rank))
				elif stat_name == 'wins':
					wins = int(stat.get('value', 0))
				elif stat_name == 'losses':
					losses = int(stat.get('value', 0))
			
			# Assign previous rank based on DB snapshot
			prev_rank = old_ranks.get(team_code_nba, rank)
			
			db_rows.append({
				"team_id": team_code_nba,
				"conference": conf_name,
				"actual_rank": rank,
				"previous_rank": prev_rank,
				"wins": wins,
				"losses": losses,
				"last_updated": current_time
			})

	if len(db_rows) == 0:
		print("❌ No data parsed. Exiting.")
		sys.exit(1)

	try:
		print("Wiping old standings from database...")
		supabase.table('actual_standings').delete().in_('conference', ['East', 'West']).execute()
		
		print("Inserting fresh data (now with trends)...")
		supabase.table('actual_standings').insert(db_rows).execute()
		
		print("✅ Update finished successfully!")
	except Exception as e:
		print(f"❌ CRITICAL ERROR updating DB: {e}")
		sys.exit(1)

if __name__ == "__main__":
	update_standings()