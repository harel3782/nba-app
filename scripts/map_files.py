import os
from pathlib import Path

def generate_tree(dir_path: Path, prefix: str = '', exclude_dirs=None):
    # תיקיות שהסקריפט יתעלם מהן כדי לא להציף לך את המסך
    if exclude_dirs is None:
        exclude_dirs = {'.git', 'node_modules', '__pycache__', 'dist', 'build', '.vercel'}
        
    try:
        # שליפת כל הקבצים והתיקיות (מיון: קודם תיקיות ואז קבצים)
        paths = sorted(dir_path.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
        
        # סינון התיקיות שביקשנו להתעלם מהן
        paths = [p for p in paths if not (p.is_dir() and p.name in exclude_dirs)]
        
        for index, path in enumerate(paths):
            is_last = index == (len(paths) - 1)
            connector = '└── ' if is_last else '├── '
            
            if path.is_dir():
                print(f"{prefix}{connector}📂 {path.name}/")
                # קריאה רקורסיבית לתוך התיקייה
                extension = '    ' if is_last else '│   '
                generate_tree(path, prefix + extension, exclude_dirs)
            else:
                print(f"{prefix}{connector}📄 {path.name}")
                
    except PermissionError:
        print(f"{prefix}└── 🔒 [Access Denied]")

if __name__ == '__main__':
    # מריץ את הסקריפט על התיקייה הנוכחית
    current_dir = Path.cwd()
    print(f"\n📦 {current_dir.name}/")
    generate_tree(current_dir)
    print("\n✅ Mapping complete!\n")