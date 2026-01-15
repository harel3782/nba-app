import requests
import os
import datetime
from supabase import create_client, Client

# 1. Settings and connection to Supabase
URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(URL, KEY)

# Using ESPN API which is much more friendly and not blocked
ESPN_API_URL = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings'

# Conversion dictionary between ESPN names and NBA names (to match your table)
TEAM_MAPPING = {
    'WSH': 'WAS',
    'UTAH': 'UTA',
    'NO': 'NOP',
    'NY': 'NYK',
    'GS': 'GSW',
    'SA': 'SAS',
    'BKN': 'BKN', # Sometimes they change, for safety
    'PHX': 'PHX'
}

def update_standings():
    print("Fetching data from ESPN...")
    response = requests.get(ESPN_API_URL)
    data = response.json()
    
    db_rows = []
    current_time = datetime.datetime.now().isoformat()

    # ESPN divides this by "children" (East and West)
    for conference in data['children']:
        conf_name = 'East' if 'East' in conference['name'] else 'West'
        
        # Going through the teams within the conference
        for entry in conference['standings']['entries']:
            team_code_espn = entry['team']['abbreviation']
            
            # Conversion to correct NBA code (if not in dictionary, stays the same)
            team_code_nba = TEAM_MAPPING.get(team_code_espn, team_code_espn)
            
            # Fetching data
            rank = entry['stats'][8]['value'] # Seed / Rank
            wins = entry['stats'][0]['value']
            losses = entry['stats'][1]['value']
            
            # Sometimes the ESPN structure changes a bit, so for safety we'll make sure the data is reasonable
            # (Usually the indexes are fixed: 0=wins, 1=losses, 8=playoffSeed)
            # Safer way to fetch the ranking:
            for stat in entry['stats']:
                if stat['name'] == 'playoffSeed':
                    rank = int(stat['value'])
                if stat['name'] == 'wins':
                    wins = int(stat['value'])
                if stat['name'] == 'losses':
                    losses = int(stat['value'])

            db_rows.append({
                "team_id": team_code_nba,
                "conference": conf_name,
                "actual_rank": rank,
                "wins": wins,
                "losses": losses,
                "last_updated": current_time
            })

    print(f"Prepared {len(db_rows)} teams for update.")
    
    # Updating the database
    try:
        response = supabase.table('actual_standings').upsert(db_rows).execute()
        print("Update finished successfully!")
    except Exception as e:
        print(f"Error updating DB: {e}")

if __name__ == "__main__":
    update_standings()
