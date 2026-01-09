import requests
import os
import datetime # הוספנו את הספרייה הזו
from supabase import create_client, Client

# 1. הגדרות וחיבור ל-Supabase
URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(URL, KEY)

NBA_API_URL = 'https://cdn.nba.com/static/json/liveData/standings/v2/standings.json'

def update_standings():
    print("Fetching NBA data...")
    response = requests.get(NBA_API_URL)
    
    if response.status_code != 200:
        print(f"Error fetching data: {response.status_code}")
        return

    data = response.json()
    
    # שליפת רשימת הקבוצות מה-JSON
    teams_data = data['league']['standings']['totalTeams']
    
    db_rows = []
    current_time = datetime.datetime.now().isoformat() # שומרים את הזמן העכשווי

    for team in teams_data:
        db_rows.append({
            "team_id": team['teamTricode'],  
            "conference": team['conference'],
            "actual_rank": team['conferenceRank'],
            "wins": team['wins'],
            "losses": team['losses'],
            "last_updated": current_time # התיקון: מעדכנים את הזמן במפורש
        })

    # עדכון המסד (Upsert)
    print(f"Updating {len(db_rows)} teams...")
    
    # ביצוע העדכון
    response = supabase.table('actual_standings').upsert(db_rows).execute()
    
    # בדיקה שהעדכון הצליח (הספרייה החדשה מחזירה אובייקט עם data)
    print("Update finished successfully!")

if __name__ == "__main__":
    update_standings()
