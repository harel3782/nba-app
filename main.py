import requests
import os
import datetime
from supabase import create_client, Client

# 1. הגדרות וחיבור ל-Supabase
URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(URL, KEY)

NBA_API_URL = 'https://cdn.nba.com/static/json/liveData/standings/v2/standings.json'

def update_standings():
    print("Fetching NBA data...")
    
    # --- התיקון: הוספת כותרות כדי להיראות כמו דפדפן אמיתי ---
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Referer": "https://www.nba.com/",
        "Accept-Language": "en-US,en;q=0.9"
    }
    
    response = requests.get(NBA_API_URL, headers=headers) # שליחת הכותרות
    
    if response.status_code != 200:
        print(f"Error fetching data: {response.status_code}")
        # הדפסת תוכן השגיאה כדי שנבין יותר אם זה ייכשל שוב
        print(response.text)
        return

    data = response.json()
    
    # שליפת רשימת הקבוצות מה-JSON
    teams_data = data['league']['standings']['totalTeams']
    
    db_rows = []
    current_time = datetime.datetime.now().isoformat()

    for team in teams_data:
        db_rows.append({
            "team_id": team['teamTricode'],  
            "conference": team['conference'],
            "actual_rank": team['conferenceRank'],
            "wins": team['wins'],
            "losses": team['losses'],
            "last_updated": current_time
        })

    # עדכון המסד (Upsert)
    print(f"Updating {len(db_rows)} teams...")
    
    # ביצוע העדכון
    response = supabase.table('actual_standings').upsert(db_rows).execute()
    
    print("Update finished successfully!")

if __name__ == "__main__":
    update_standings()
