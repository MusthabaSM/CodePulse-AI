import os
import csv
import json
import random
import re
import subprocess
from datetime import datetime, timedelta

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "repositories_cache")
PRISMA_DIR = r"C:\repos\prisma"
CSV_PATH = os.path.join(os.path.dirname(__file__), "training_labels.csv")
REPORT_PATH = os.path.join(os.path.dirname(__file__), "positive_label_quality_report.json")

BUG_KEYWORDS = [
    'fix', 'fixed', 'fixes', 'bug', 'defect', 'issue', 'issues', 
    'hotfix', 'patch', 'resolve', 'resolved', 'repair'
]
BUG_PATTERN = re.compile(r'\b(?:' + '|'.join(BUG_KEYWORDS) + r')\b', re.IGNORECASE)

DOC_PATTERN = re.compile(r'\b(docs?|readme|documentation|license|changelog)\b', re.IGNORECASE)
BUILD_PATTERN = re.compile(r'\b(build|ci|travis|github actions|workflow|jenkins|docker)\b', re.IGNORECASE)
DEP_PATTERN = re.compile(r'\b(deps?|dependencies|bump|package\.json|yarn\.lock|pnpm|npm)\b', re.IGNORECASE)
REFACTOR_PATTERN = re.compile(r'\b(refactor|cleanup|clean up|architect|restructure)\b', re.IGNORECASE)
STYLE_PATTERN = re.compile(r'\b(style|lint|format|prettier|eslint|tslint|whitespace|comments?|typings?)\b', re.IGNORECASE)

def get_repo_path(repo_name):
    if repo_name == 'prisma':
        return PRISMA_DIR
    return os.path.join(CACHE_DIR, repo_name)

def get_bug_commit_for_sample(repo_name, file_path, snapshot_date_str):
    repo_path = get_repo_path(repo_name)
    if not os.path.exists(repo_path):
        return None
        
    # Check 30 days ahead
    start_date = datetime.strptime(snapshot_date_str, '%Y-%m-%d')
    end_date = start_date + timedelta(days=32) # Buffer to catch boundary
    
    start_str = start_date.strftime('%Y-%m-%d')
    end_str = end_date.strftime('%Y-%m-%d')
    
    cmd = ['git', 'log', '--format=%s', f'--since={start_str}', f'--until={end_str}', '--', file_path]
    try:
        output = subprocess.check_output(cmd, cwd=repo_path, encoding='utf-8', errors='replace')
        lines = output.split('\n')
        for line in lines:
            line = line.strip()
            if line and BUG_PATTERN.search(line):
                return line
    except Exception:
        pass
    return None

def classify_commit(msg):
    if DOC_PATTERN.search(msg):
        return 'Documentation'
    if BUILD_PATTERN.search(msg):
        return 'Build/CI'
    if DEP_PATTERN.search(msg):
        return 'Dependency'
    if STYLE_PATTERN.search(msg):
        return 'Formatting/style'
    if REFACTOR_PATTERN.search(msg):
        return 'Refactor'
    return 'Real defect'

def main():
    positives = []
    print("Reading dataset...")
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if len(row) == 4 and row[3] == '1':
                positives.append(row)
                
    sample_size = min(500, len(positives))
    random.seed(42) # Reproducible sampling
    sampled = random.sample(positives, sample_size)
    
    categories = {
        'Real defect': 0,
        'Documentation': 0,
        'Build/CI': 0,
        'Refactor': 0,
        'Dependency': 0,
        'Formatting/style': 0,
        'Unknown': 0
    }
    
    print(f"Sampling {sample_size} commits...")
    processed = 0
    for row in sampled:
        repo_name, file_path, snapshot_date, _ = row
        msg = get_bug_commit_for_sample(repo_name, file_path, snapshot_date)
        if msg:
            cat = classify_commit(msg)
            categories[cat] += 1
        else:
            categories['Unknown'] += 1
            
        processed += 1
        if processed % 100 == 0:
            print(f"Processed {processed}/{sample_size} samples...")
            
    valid_samples = sample_size - categories['Unknown']
    if valid_samples == 0:
        valid_samples = 1
        
    def get_pct(cat):
        return round((categories[cat] / valid_samples) * 100, 2)
        
    other_pct = get_pct('Dependency') + get_pct('Formatting/style') + get_pct('Refactor')
    real_pct = get_pct('Real defect')
    false_positive_pct = round(100.0 - real_pct, 2)
    
    if false_positive_pct < 15:
        assessment = "Excellent"
    elif false_positive_pct < 30:
        assessment = "Good"
    elif false_positive_pct < 50:
        assessment = "Questionable"
    else:
        assessment = "Unusable"
        
    report = {
        "samples_audited": sample_size,
        "valid_commits_found": valid_samples,
        "categories_count": categories,
        "percentages": {
            "Real defect %": real_pct,
            "False positive %": false_positive_pct,
            "Documentation %": get_pct('Documentation'),
            "Build/CI %": get_pct('Build/CI'),
            "Refactor %": get_pct('Refactor'),
            "Other %": other_pct
        },
        "label_noise_estimate": f"{false_positive_pct}%",
        "final_assessment": assessment
    }
    
    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=4)
        
    print("Audit complete.")
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
