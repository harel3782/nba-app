import requests
import os
import datetime
import time
import sys
from supabase import create_client, Client

# --- Load Env ---
def load_local_env():
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
URL = os.environ.get("VITE_SUPABASE_URL")
KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(URL, KEY)

ESPN_API_URL = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings'

TEAM_MAPPING = {
	'WSH': 'WAS', 'UTAH': 'UTA', 'NO': 'NOP', 'NY': 'NYK',
	'GS': 'GSW', 'SA': 'SAS', 'BKN': 'BKN', 'BRK': 'BKN',
	'PHX': 'PHX', 'PHO': 'PHX', 'CHA': 'CHA', 'CHO': 'CHA'
}

def update_standings():
	print("Fetching data from ESPN...")
	response = requests.get(ESPN_API_URL)
	data = response.json()

	# 1. Fetch current data from DB to compare
	print("Fetching current DB state...")
	existing_data = supabase.table("official_regular_standings").select("*").execute()
	db_map = {item['team_id']: item for item in existing_data.data}

	db_rows = []
	current_time = datetime.datetime.now()
	
	for conference in data.get('children', []):
		conf_name = 'East' if 'East' in conference.get('name', '') else 'West'
		for index, entry in enumerate(conference.get('standings', {}).get('entries', [])):
			team_code_espn = entry['team']['abbreviation']
			team_code_nba = TEAM_MAPPING.get(team_code_espn, team_code_espn)
			
			rank = index + 1
			wins = next((int(s['value']) for s in entry['stats'] if s['name'] == 'wins'), 0)
			losses = next((int(s['value']) for s in entry['stats'] if s['name'] == 'losses'), 0)
			
			# --- Smart Trend Logic ---
			old_row = db_map.get(team_code_nba)
			
			if old_row:
				last_update = datetime.datetime.fromisoformat(old_row['last_updated'].replace('Z', '+00:00'))
				# אם עברו יותר מ-12 שעות מהעדכון האחרון, נעדכן את הטרנד
				if (current_time.astimezone() - last_update).total_seconds() > 43200:
					prev_rank = old_row['actual_rank']
				else:
					# אחרת, נשמור על ה-previous_rank הקיים ב-DB
					prev_rank = old_row.get('previous_rank', rank)
			else:
				prev_rank = rank

			db_rows.append({
				"team_id": team_code_nba,
				"conference": conf_name,
				"actual_rank": rank,
				"previous_rank": prev_rank,
				"wins": wins,
				"losses": losses,
				"last_updated": current_time.isoformat()
			})

	# 2. Upsert (מניעת דריסה של כל הטבלה)
	print("Upserting data to official_regular_standings...")
	# שימוש ב-upsert במקום delete+insert מונע "קפיצות" ב-UI
	supabase.table('official_regular_standings').upsert(db_rows, on_conflict='team_id').execute()
	
	# 3. Trigger Leaderboard Refresh
	supabase.rpc('refresh_all_leaderboards').execute()
	print("✅ Standings updated successfully!")

if __name__ == "__main__":
	update_standings()