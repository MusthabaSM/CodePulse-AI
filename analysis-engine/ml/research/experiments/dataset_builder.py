import os
import subprocess
import time
import json
import urllib.request
import urllib.error
import logging
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

REPOSITORIES = [
    "expressjs/express",
    "nestjs/nest",
    "vercel/next.js",
    "facebook/react",
    "vuejs/core",
    "angular/angular",
    "prisma/prisma",
    "fastify/fastify",
    "socketio/socket.io",
    "supabase/supabase"
]

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "repositories_cache")
METADATA_FILE = os.path.join(os.path.dirname(__file__), "dataset_inventory.json")

def get_github_metadata(repo_name: str) -> Dict[str, Any]:
    url = f"https://api.github.com/repos/{repo_name}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return {
                "stars": data.get("stargazers_count", 0),
                "language": data.get("language", "Unknown")
            }
    except urllib.error.URLError as e:
        logging.warning(f"Failed to fetch metadata for {repo_name}: {e}")
        return {"stars": 0, "language": "Unknown"}

def run_git_command(command: List[str], cwd: str = None, retries: int = 3) -> str:
    for attempt in range(retries):
        try:
            result = subprocess.run(
                command,
                cwd=cwd,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            logging.warning(f"Git command failed: {' '.join(command)}. Attempt {attempt + 1}/{retries}. Error: {e.stderr.strip()}")
            if attempt == retries - 1:
                raise e
            time.sleep(2 ** attempt)  # Exponential backoff
    return ""

def process_repository(repo_name: str) -> Dict[str, Any]:
    start_time = time.time()
    repo_url = f"https://github.com/{repo_name}.git"
    target_dir = os.path.join(CACHE_DIR, repo_name.split("/")[-1])
    
    os.makedirs(CACHE_DIR, exist_ok=True)
    
    # 1. Clone or Pull
    if os.path.exists(target_dir):
        logging.info(f"[{repo_name}] Directory exists. Pulling latest changes...")
        run_git_command(["git", "fetch", "--all"], cwd=target_dir)
        run_git_command(["git", "reset", "--hard", "origin/HEAD"], cwd=target_dir)
    else:
        logging.info(f"[{repo_name}] Cloning repository...")
        run_git_command(["git", "clone", repo_url, target_dir])
        
    # 2. Get GitHub Metadata (Stars, Language)
    github_meta = get_github_metadata(repo_name)
    
    # 3. Calculate Commits
    logging.info(f"[{repo_name}] Counting commits...")
    commits_out = run_git_command(["git", "rev-list", "--count", "HEAD"], cwd=target_dir)
    total_commits = int(commits_out) if commits_out.isdigit() else 0
    
    # 4. Calculate Files
    logging.info(f"[{repo_name}] Counting files...")
    files_out = run_git_command(["git", "ls-files"], cwd=target_dir)
    total_files = len(files_out.splitlines()) if files_out else 0
    
    duration = time.time() - start_time
    logging.info(f"[{repo_name}] Processed successfully in {duration:.2f} seconds.")
    
    return {
        "repository_name": repo_name,
        "stars": github_meta["stars"],
        "language": github_meta["language"],
        "total_commits": total_commits,
        "total_files": total_files,
        "extraction_duration_seconds": round(duration, 2)
    }

def build_dataset():
    print("Starting Dataset Builder...")
    start_time = time.time()
    inventory = []
    
    total_commits_all = 0
    total_files_all = 0
    
    # We will process sequentially or concurrently. To be safe with disk/git, let's do concurrent max 3.
    with ThreadPoolExecutor(max_workers=3) as executor:
        future_to_repo = {executor.submit(process_repository, repo): repo for repo in REPOSITORIES}
        for future in as_completed(future_to_repo):
            repo = future_to_repo[future]
            try:
                repo_data = future.result()
                inventory.append(repo_data)
                total_commits_all += repo_data["total_commits"]
                total_files_all += repo_data["total_files"]
            except Exception as exc:
                logging.error(f"[{repo}] generated an exception: {exc}")

    total_duration = time.time() - start_time
    
    report = {
        "repositories_processed": len(inventory),
        "total_commits_across_dataset": total_commits_all,
        "total_files_across_dataset": total_files_all,
        "total_extraction_duration_seconds": round(total_duration, 2),
        "repositories": inventory
    }
    
    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=4)
        
    print("\nDataset Build Complete")
    print(f"Repositories Processed: {len(inventory)}")
    print(f"Total Commits: {total_commits_all}")
    print(f"Total Files: {total_files_all}")

if __name__ == "__main__":
    build_dataset()
