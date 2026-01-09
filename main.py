import requests
import os
import datetime
from supabase import create_client, Client

# 1. הגדרות וחיבור ל-Supabase
URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(URL, KEY)

# משתמשים ב-API של ESPN שהוא הרבה יותר ידידותי ולא נחסם
ESPN_API_URL = 'https://site.api.espn.com/apis/v2/sports/basketball/nba/standings'

# מילון המרה בין השמות של ESPN לשמות של ה-NBA (כדי שיתאים לטבלה שלך)
TEAM_MAPPING = {
    'WSH': 'WAS',
    'UTAH': 'UTA',
    'NO': 'NOP',
    'NY': 'NYK',
    'GS': 'GSW',
    'SA': 'SAS',
    'BKN': 'BKN', # לפעמים הם משנים, ליתר ביטחון
    'PHX': 'PHX'
}

def update_standings():
    print("Fetching data from ESPN...")
    response = requests.get(ESPN_API_URL)
    data = response.json()
    
    db_rows = []
    current_time = datetime.datetime.now().isoformat()

    # ESPN מחלקים את זה לפי "children" (מזרח ומערב)
    for conference in data['children']:
        conf_name = 'East' if 'East' in conference['name'] else 'West'
        
        # עוברים על הקבוצות בתוך הקונפרנס
        for entry in conference['standings']['entries']:
            team_code_espn = entry['team']['abbreviation']
            
            # המרה לקוד NBA תקין (אם אין במילון, נשאר אותו דבר)
            team_code_nba = TEAM_MAPPING.get(team_code_espn, team_code_espn)
            
            # שליפת נתונים
            rank = entry['stats'][8]['value'] # Seed / Rank
            wins = entry['stats'][0]['value']
            losses = entry['stats'][1]['value']
            
            # לפעמים המבנה ב-ESPN משתנה קצת, אז ליתר ביטחון נוודא שהנתונים הגיוניים
            # (בדרך כלל האינדקסים קבועים: 0=wins, 1=losses, 8=playoffSeed)
            # דרך בטוחה יותר לשלוף את הדירוג:
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
    
    # עדכון המסד
    try:
        response = supabase.table('actual_standings').upsert(db_rows).execute()
        print("Update finished successfully!")
    except Exception as e:
        print(f"Error updating DB: {e}")

if __name__ == "__main__":
    update_standings()
