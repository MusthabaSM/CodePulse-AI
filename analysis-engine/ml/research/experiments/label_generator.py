import os
import re
import csv
import json
import logging
import subprocess
from collections import defaultdict
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

BUG_KEYWORDS = [
    'fix', 'fixed', 'fixes', 'bug', 'defect', 'issue', 'issues', 
    'hotfix', 'patch', 'resolve', 'resolved', 'repair'
]
BUG_PATTERN = re.compile(r'\b(?:' + '|'.join(BUG_KEYWORDS) + r')\b', re.IGNORECASE)

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "repositories_cache")
PRISMA_DIR = r"C:\repos\prisma"

CSV_OUTPUT = os.path.join(os.path.dirname(__file__), "training_labels.csv")
JSON_OUTPUT = os.path.join(os.path.dirname(__file__), "label_report.json")

def is_bug_fix(msg: str) -> bool:
    if not msg:
        return False
    return bool(BUG_PATTERN.search(msg))

def get_target_repositories():
    repos = []
    if os.path.exists(CACHE_DIR):
        for entry in os.listdir(CACHE_DIR):
            full_path = os.path.join(CACHE_DIR, entry)
            if os.path.isdir(full_path):
                repos.append((entry, full_path))
    
    if os.path.exists(PRISMA_DIR):
        repos.append(("prisma", PRISMA_DIR))
        
    return repos

def process_repository_fast(repo_name, repo_path):
    # Use git log --name-only
    cmd = ['git', 'log', '--name-only', '--format=COMMIT|%aI|%s']
    try:
        output = subprocess.check_output(cmd, cwd=repo_path, encoding='utf-8', errors='replace')
    except Exception as e:
        logging.error(f"Failed to run git log in {repo_path}: {e}")
        return {}

    bug_fixes = defaultdict(list)
    file_modifications = []
    
    current_date = None
    is_bug = False
    
    count = 0
    lines = output.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if line.startswith('COMMIT|'):
            parts = line.split('|', 2)
            if len(parts) >= 3:
                date_str = parts[1]
                msg = parts[2]
                try:
                    # Parse ISO 8601 %aI format
                    current_date = datetime.fromisoformat(date_str)
                    # Convert to naive or handle timezone if needed, fromisoformat handles tz
                except ValueError:
                    current_date = None
                
                is_bug = is_bug_fix(msg)
                count += 1
        else:
            if current_date:
                path = line.replace('\\', '/')
                file_modifications.append((path, current_date))
                if is_bug:
                    bug_fixes[path].append(current_date)

    logging.info(f"[{repo_name}] Scanned {count} commits using native git.")
    
    repo_samples = {}
    repo_duplicates = 0
    processed = 0

    for path, c_date in file_modifications:
        processed += 1
            
        snapshot_date_str = c_date.strftime('%Y-%m-%d')
        sample_key = (repo_name, path, snapshot_date_str)
        
        if sample_key in repo_samples:
            repo_duplicates += 1
            continue
            
        label = 0
        future_limit = c_date + timedelta(days=30)
        
        for bug_date in bug_fixes.get(path, []):
            if bug_date <= c_date:
                pass
            elif c_date < bug_date <= future_limit:
                label = 1
                break
        
        repo_samples[sample_key] = label
        
    logging.info(f"[{repo_name}] Found {repo_duplicates} duplicates.")
    return repo_samples, repo_duplicates

def generate_labels():
    logging.info("Starting Phase 2: Historical Bug Label Generator")
    repos = get_target_repositories()
    
    all_samples = []
    total_duplicates = 0
    repo_stats = {}
    
    for repo_name, repo_path in repos:
        logging.info(f"========================================")
        logging.info(f"Processing repository: {repo_name} at {repo_path}")
        
        repo_samples, repo_duplicates = process_repository_fast(repo_name, repo_path)
        
        positives = sum(1 for v in repo_samples.values() if v == 1)
        negatives = len(repo_samples) - positives
        
        repo_stats[repo_name] = {
            "samples": len(repo_samples),
            "positives": positives,
            "negatives": negatives
        }
        
        total_duplicates += repo_duplicates
        
        for (r_name, path, date_str), lbl in repo_samples.items():
            all_samples.append([r_name, path, date_str, lbl])

    logging.info("Writing training_labels.csv...")
    with open(CSV_OUTPUT, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["repository", "file_path", "snapshot_date", "label"])
        writer.writerows(all_samples)
        
    logging.info("Generating label_report.json...")
    
    total_samples = len(all_samples)
    total_positives = sum(1 for s in all_samples if s[3] == 1)
    total_negatives = total_samples - total_positives
    
    top_repos = sorted(repo_stats.items(), key=lambda x: x[1]['positives'], reverse=True)
    
    report = {
        "total_samples": total_samples,
        "positive_labels": total_positives,
        "negative_labels": total_negatives,
        "positive_percentage": round((total_positives / total_samples * 100) if total_samples > 0 else 0, 2),
        "negative_percentage": round((total_negatives / total_samples * 100) if total_samples > 0 else 0, 2),
        "duplicate_samples_detected_and_removed": total_duplicates,
        "label_leakage_preventions": "Verified: strict strictly-greater-than time checks implemented.",
        "repository_breakdown": repo_stats,
        "top_repositories_by_positive_labels": [
            {"repository": k, "positives": v["positives"]} for k, v in top_repos
        ]
    }
    
    with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=4)
        
    print("\nLabel Generation Complete")
    print(f"Total Samples: {total_samples}")
    print(f"Positive Labels: {total_positives} ({report['positive_percentage']}%)")
    print(f"Negative Labels: {total_negatives} ({report['negative_percentage']}%)")
    print(f"Duplicates Removed: {total_duplicates}")

if __name__ == "__main__":
    generate_labels()
