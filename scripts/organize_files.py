import os
import re
import shutil

def organize_src():
	src_dir = 'src'
	comp_dir = os.path.join(src_dir, 'components')
	lib_dir = os.path.join(src_dir, 'lib')
	
	# Define which files go where based on your project structure
	components = [
		'AdminResultsControl.tsx', 'AdminStandingsMonitor.tsx', 'Auth.tsx',
		'BettingBoard.tsx', 'BracketMatch.tsx', 'FullPlayoffBracket.tsx',
		'LeaderboardTable.tsx', 'LeagueManager.tsx', 'LeagueSettings.tsx',
		'LeagueSettingsModal.tsx', 'ProfileModal.tsx'
	]
	
	libs = ['supabaseClient.ts', 'teams.ts']
	
	# Create the target directories if they don't exist
	os.makedirs(comp_dir, exist_ok=True)
	os.makedirs(lib_dir, exist_ok=True)
	
	# Helper function to remove file extensions for import matching
	def get_mod(filename):
		return filename.rsplit('.', 1)[0]
		
	print("Scanning files and updating import paths...")
	
	# Step 1: Read all files in src and update their import statements BEFORE moving
	for filename in os.listdir(src_dir):
		file_path = os.path.join(src_dir, filename)
		
		# Skip directories and non-TypeScript files
		if not os.path.isfile(file_path) or not filename.endswith(('.tsx', '.ts')):
			continue
			
		with open(file_path, 'r', encoding='utf-8') as f:
			content = f.read()
			
		# Determine where this current file is going to end up
		if filename in components:
			category = 'components'
		elif filename in libs:
			category = 'lib'
		else:
			category = 'root'
			
		# Update imports pointing to component files
		for target_file in components:
			mod = get_mod(target_file)
			# Match exactly "from './ModuleName'"
			pattern = rf"from\s+['\"](\./){mod}['\"]"
			if category in ['root', 'lib']:
				# If file is in root/lib, it points to components folder
				content = re.sub(pattern, f"from './components/{mod}'", content)
			elif category == 'components':
				# If file is also in components, the relative path remains './'
				pass
				
		# Update imports pointing to lib files
		for target_file in libs:
			mod = get_mod(target_file)
			pattern = rf"from\s+['\"](\./){mod}['\"]"
			if category == 'root':
				# Root to lib
				content = re.sub(pattern, f"from './lib/{mod}'", content)
			elif category == 'components':
				# Component to lib (needs to go up one directory)
				content = re.sub(pattern, f"from '../lib/{mod}'", content)
			elif category == 'lib':
				# Lib to lib
				pass
				
		# Handle CSS imports if the file is moving into a subfolder
		if category in ['components', 'lib']:
			content = re.sub(r"import\s+['\"](\./)(.*?\.css)['\"]", r"import '../\2'", content)
			
		# Save the updated content
		with open(file_path, 'w', encoding='utf-8') as f:
			f.write(content)
			
	print("Moving files to their new folders...")
	
	# Step 2: Physically move the files to the new directories
	for filename in os.listdir(src_dir):
		file_path = os.path.join(src_dir, filename)
		if not os.path.isfile(file_path):
			continue
			
		if filename in components:
			shutil.move(file_path, os.path.join(comp_dir, filename))
			print(f"📦 Moved: {filename} -> src/components/")
		elif filename in libs:
			shutil.move(file_path, os.path.join(lib_dir, filename))
			print(f"🛠️ Moved: {filename} -> src/lib/")

	print("\n✅ Codebase organization complete! Run 'npm run dev' to verify everything works.")

if __name__ == '__main__':
	organize_src()