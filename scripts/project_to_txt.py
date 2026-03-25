import os

# Configuration: What to include and what to ignore
OUTPUT_FILE = "nba_project_reference.txt"

# Skip these directories to keep the file size readable and relevant to code only
IGNORE_DIRS = {
	"node_modules", ".git", "dist", "build", ".gradle", 
	"android", "ios", "bin", "obj", ".next", "out",
	".idea", "assets", "icons", "public", "releases", "__pycache__"
}

# Specific files to ignore (like lock files which are huge and irrelevant for context)
IGNORE_FILES = {
	"package-lock.json",
	"organize_files.py",
	"map_files.py",
	OUTPUT_FILE
}

# Only grab these file types
ALLOWED_EXTENSIONS = {
	".ts", ".tsx", ".css", ".html", ".sql", ".json", ".env.example", ".py", ".md"
}

def generate_tree(dir_path=".", prefix=""):
	"""
	Recursively generates a visual tree structure of the project.
	Respects the IGNORE_DIRS and IGNORE_FILES filters.
	"""
	tree_str = ""
	try:
		# Sort items so directories and files appear in alphabetical order
		items = sorted(os.listdir(dir_path))
	except PermissionError:
		return ""

	# Filter directories and files based on our ignore lists
	dirs = [d for d in items if os.path.isdir(os.path.join(dir_path, d)) and d not in IGNORE_DIRS]
	files = [f for f in items if os.path.isfile(os.path.join(dir_path, f)) and f not in IGNORE_FILES and not f.endswith(".tsbuildinfo")]
	
	# Further filter files by allowed extensions
	files = [f for f in files if os.path.splitext(f)[1] in ALLOWED_EXTENSIONS or f.startswith('.env')]

	# Build the tree string for directories
	for i, d in enumerate(dirs):
		is_last_dir = (i == len(dirs) - 1) and len(files) == 0
		pointer = "└── " if is_last_dir else "├── "
		tree_str += f"{prefix}{pointer}📂 {d}/\n"
		
		extension = "    " if is_last_dir else "│   "
		tree_str += generate_tree(os.path.join(dir_path, d), prefix + extension)
		
	# Build the tree string for files
	for i, f in enumerate(files):
		is_last_file = (i == len(files) - 1)
		pointer = "└── " if is_last_file else "├── "
		tree_str += f"{prefix}{pointer}📄 {f}\n"
		
	return tree_str

def generate_reference():
	"""
	Scans the directory and writes the project map and file contents to a single txt file.
	"""
	with open(OUTPUT_FILE, "w", encoding="utf-8") as outfile:
		outfile.write("NBA PLAYOFF PREDICTOR - PROJECT REFERENCE\n")
		outfile.write("=" * 40 + "\n\n")

		# 1. Generate and write the visual map first
		outfile.write("PROJECT DIRECTORY MAP:\n")
		outfile.write("----------------------\n")
		outfile.write("📦 nba-predictor/\n")
		outfile.write(generate_tree())
		outfile.write("\n\n" + "=" * 40 + "\n\n")

		# 2. Now write the actual contents of the files
		for root, dirs, files in os.walk("."):
			# Filter out ignored directories (modifies the list in-place so os.walk skips them)
			dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

			for file in files:
				# Skip specific ignored files
				if file in IGNORE_FILES:
					continue
					
				# Skip specific extensions that are just cache/build info
				if file.endswith(".tsbuildinfo"):
					continue

				file_path = os.path.join(root, file)
				_, ext = os.path.splitext(file)

				if ext in ALLOWED_EXTENSIONS or file.startswith('.env'):
					# Use relative path for cleaner output
					rel_path = os.path.relpath(file_path, ".")
					
					outfile.write(f"\n{'#' * 60}\n")
					outfile.write(f"LOCATION: {rel_path}\n")
					outfile.write(f"{'#' * 60}\n\n")

					try:
						with open(file_path, "r", encoding="utf-8") as infile:
							content = infile.read()
							# Convert spaces to tabs to match your preference
							content = content.replace("    ", "\t")
							outfile.write(content)
							outfile.write("\n")
					except Exception as e:
						outfile.write(f"[ERROR READING FILE: {e}]\n")

	print(f"Success! Project reference created at: {OUTPUT_FILE}")

if __name__ == "__main__":
	generate_reference()