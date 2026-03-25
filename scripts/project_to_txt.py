import os

# Configuration: What to include and what to ignore
OUTPUT_FILE = "nba_project_reference.txt"
# Skip these directories to keep the file size readable
IGNORE_DIRS = {
	"node_modules", ".git", "dist", "build", ".gradle", 
	"android", "ios", "bin", "obj", ".next", "out"
}
# Only grab these file types
ALLOWED_EXTENSIONS = {
	".ts", ".tsx", ".css", ".html", ".sql", ".json", ".env.example"
}

def generate_reference():
	"""
	Scans the directory and writes file locations and content to a single txt file.
	"""
	with open(OUTPUT_FILE, "w", encoding="utf-8") as outfile:
		outfile.write("NBA PLAYOFF PREDICTOR - PROJECT REFERENCE\n")
		outfile.write("=" * 40 + "\n\n")

		for root, dirs, files in os.walk("."):
			# Filter out ignored directories
			dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

			for file in files:
				file_path = os.path.join(root, file)
				_, ext = os.path.splitext(file)

				if ext in ALLOWED_EXTENSIONS:
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