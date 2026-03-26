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

# Fetch Supabase credentials with fallbacks for standard and Vite prefixes
URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

# Prevent obscure crashes by validating credentials early
if not URL or not KEY:
	print("CRITICAL ERROR: Supabase credentials are missing!")
	print("Check your GitHub Actions Secrets or .env.local file.")
	sys.exit(1)

supabase: Client = create_client(URL, KEY)

ESPN_API_URL = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings'

TEAM_MAPPING = {
	'WSH': 'WAS', 'UTAH': 'UTA', 'NO': 'NOP', 'NY': 'NYK',
	'GS': 'GSW', 'SA': 'SAS', 'BKN': 'BKN', 'BRK': 'BKN',
	'PHX': 'PHX', 'PHO': 'PHX', 'CHA': 'CHA', 'CHO': 'CHA'
}

def should_run():
	# Define the end date for the script execution
	end_date_str = os.environ.get("END_DATE", "2026-04-15")
	try:
		end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
	except ValueError:
		end_date = date(2026, 4, 15)

	if date.today() > end_date:
		print(f"Project period ended on {end_date_str}. Skipping.")
		return False

	# Define active hours in UTC to save GitHub Actions minutes
	current_hour = datetime.now(timezone.utc).hour
	start_h = int(os.environ.get("START_HOUR_UTC", 0))
	end_h = int(os.environ.get("END_HOUR_UTC", 23))
	
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

	db_rows = []
	# Use timezone-aware datetime to prevent subtraction errors
	current_time = datetime.now(timezone.utc)
	
	for conference in data.get('children', []):
		conf_name = 'East' if 'East' in conference.get('name', '') else 'West'
		for index, entry in enumerate(conference.get('standings', {}).get('entries', [])):
			team_code_espn = entry['team']['abbreviation']
			team_code_nba = TEAM_MAPPING.get(team_code_espn, team_code_espn)
			
			rank = index + 1
			wins = next((int(s['value']) for s in entry['stats'] if s['name'] == 'wins'), 0)
			losses = next((int(s['value']) for s in entry['stats'] if s['name'] == 'losses'), 0)
			
			old_row = db_map.get(team_code_nba)
			if old_row:
				# Ensure timezone awareness for the database timestamp
				last_update_str = old_row['last_updated'].replace('Z', '+00:00')
				last_update = datetime.fromisoformat(last_update_str)
				
				# Force the datetime to be timezone-aware (UTC) if it parsed as naive
				if last_update.tzinfo is None:
					last_update = last_update.replace(tzinfo=timezone.utc)
				
				# Update previous_rank only if more than 12 hours (43200 seconds) have passed
				if (current_time - last_update).total_seconds() > 43200:
					prev_rank = old_row['actual_rank']
				else:
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

	print("Upserting data to official_regular_standings...")
	supabase.table('official_regular_standings').upsert(db_rows).execute()
	
	print("Standings updated successfully!")

if __name__ == "__main__":
	# Respect schedule window in GitHub Actions, but run immediately if local
	if os.environ.get("GITHUB_ACTIONS") == "true":
		if should_run():
			update_standings()
	else:
		update_standings()