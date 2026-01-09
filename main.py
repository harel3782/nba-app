import requests
import os
from supabase import create_client, Client

# 1. הגדרות וחיבור ל-Supabase
URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(URL, KEY)

NBA_API_URL = 'https://cdn.nba.com/static/json/liveData/standings/v2/standings.json'

def update_standings():
    print("Fetching NBA data...")
    response = requests.get(NBA_API_URL)
    data = response.json()
    
    # שליפת רשימת הקבוצות מה-JSON
    teams_data = data['league']['standings']['totalTeams']
    
    db_rows = []
    for team in teams_data:
        db_rows.append({
            "team_id": team['teamTricode'],  # למשל 'LAL'
            "conference": team['conference'],
            "actual_rank": team['conferenceRank'],
            "wins": team['wins'],
            "losses": team['losses'],
            # לא צריך לשלוח last_updated, ה-DB יעשה את זה אוטומטית אם הגדרנו נכון, או שנוסיף כאן
        })

    # עדכון המסד (Upsert)
    print(f"Updating {len(db_rows)} teams...")
    data, count = supabase.table('actual_standings').upsert(db_rows).execute()
    print("Done!")

if __name__ == "__main__":
    update_standings()