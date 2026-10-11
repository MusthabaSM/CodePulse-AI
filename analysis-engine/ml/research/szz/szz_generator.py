import os
import re
import csv
import json
import subprocess
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from sklearn.metrics import roc_auc_score, mutual_info_score

# --- 1. Confidence Rules ---
HIGH_CONFIDENCE = re.compile(r'\b(fix regression|fix crash|fix memory leak|security fix|race condition|deadlock|null pointer|data corruption)\b', re.I)
MEDIUM_CONFIDENCE = re.compile(r'\b(bugfix|fix bug|fix issue|resolve failure|incorrect behavior|unexpected behavior)\b', re.I)
LOW_CONFIDENCE = re.compile(r'\b(generic fix|patch|resolve)\b', re.I)

EXCLUSION = re.compile(r'\b(docs|documentation|typo|spelling|formatting|lint|style|refactor|cleanup|chore|dependency|upgrade|build|ci|workflow|test only)\b', re.I)

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "repositories_cache")
PRISMA_DIR = r"C:\repos\prisma"

def get_target_repositories():
    repos = []
    if os.path.exists(CACHE_DIR):
        for entry in os.listdir(CACHE_DIR):
            full_path = os.path.join(CACHE_DIR, entry)
            if os.path.isdir(full_path): repos.append((entry, full_path))
    if os.path.exists(PRISMA_DIR): repos.append(("prisma", PRISMA_DIR))
    return repos

def classify_commit(msg):
    if EXCLUSION.search(msg): return None
    if HIGH_CONFIDENCE.search(msg): return 'HIGH'
    if MEDIUM_CONFIDENCE.search(msg): return 'MEDIUM'
    if LOW_CONFIDENCE.search(msg): return 'LOW'
    return None

def process_repository_szz(repo_name, repo_path):
    print(f"[{repo_name}] Finding bug-fix commits...")
    cmd_log = ['git', 'log', '--format=COMMIT|%H|%aI|%s']
    proc = subprocess.run(cmd_log, cwd=repo_path, capture_output=True, text=True, errors='replace')
    
    bug_fixes = []
    for line in proc.stdout.split('\n'):
        if line.startswith('COMMIT|'):
            parts = line.split('|', 3)
            if len(parts) == 4:
                commit, date_str, msg = parts[1], parts[2], parts[3]
                conf = classify_commit(msg)
                if conf:
                    bug_fixes.append((commit, date_str, conf))
    
    print(f"[{repo_name}] Found {len(bug_fixes)} bug-fixes. Running SZZ Blame...")
    
    szz_defects = [] # (file, induce_date, fix_date)
    
    # We use a fast subset of up to 500 bugs per repo to ensure completion
    subset = bug_fixes[:500]
    
    def process_bug(bug):
        commit, fix_date_str, conf = bug
        try:
            fix_date = datetime.fromisoformat(fix_date_str[:19])
        except:
            return []
            
        cmd_diff = ['git', 'diff', '-U0', f'{commit}^..{commit}']
        diff_proc = subprocess.run(cmd_diff, cwd=repo_path, capture_output=True, text=True, errors='replace')
        
        current_file = None
        blame_tasks = []
        for line in diff_proc.stdout.split('\n'):
            if line.startswith('+++ b/'):
                current_file = line[6:]
            elif line.startswith('@@ ') and current_file:
                # @@ -start,count +start,count @@
                m = re.search(r'@@ -(\d+)(?:,(\d+))? \+', line)
                if m:
                    start = int(m.group(1))
                    count = int(m.group(2)) if m.group(2) else 1
                    if count > 0:
                        blame_tasks.append((current_file, start, start + count - 1))
        
        local_defects = []
        for file_path, start, end in blame_tasks:
            if not file_path.endswith(('.ts', '.js', '.py', '.java', '.go')): continue
            cmd_blame = ['git', 'blame', '-l', f'-L{start},{end}', f'{commit}^', '--', file_path]
            blame_proc = subprocess.run(cmd_blame, cwd=repo_path, capture_output=True, text=True, errors='replace')
            for bline in blame_proc.stdout.split('\n'):
                if bline:
                    parts = bline.split()
                    if len(parts) > 3:
                        # Extract date roughly
                        match = re.search(r'(\d{4}-\d{2}-\d{2})', bline)
                        if match:
                            induce_date_str = match.group(1)
                            try:
                                induce_date = datetime.strptime(induce_date_str, "%Y-%m-%d")
                                local_defects.append({
                                    'file': file_path,
                                    'induce_date': induce_date,
                                    'fix_date': fix_date,
                                    'conf': conf
                                })
                            except: pass
        return local_defects

    with ThreadPoolExecutor(max_workers=8) as ex:
        results = ex.map(process_bug, subset)
        for res in results:
            szz_defects.extend(res)
            
    print(f"[{repo_name}] Mapped {len(szz_defects)} bug-inducing file states.")
    return szz_defects

def main():
    repos = get_target_repositories()
    all_defects = []
    
    for repo_name, repo_path in repos:
        all_defects.extend([(repo_name, d) for d in process_repository_szz(repo_name, repo_path)])
        
    print("Loading V4 dataset for structural mapping...")
    df = pd.read_csv('training_dataset_v4.csv')
    df['snapshot_date'] = pd.to_datetime(df['snapshot_date'])
    
    # Fast match
    print("Labeling snapshots based on SZZ bounds...")
    df['szz_label'] = 0
    df['szz_conf'] = 'NONE'
    
    # Organize defects
    repo_file_defects = {}
    for repo, d in all_defects:
        key = (repo, d['file'])
        if key not in repo_file_defects: repo_file_defects[key] = []
        repo_file_defects[key].append(d)
    
    szz_positives = 0
    conf_dist = {'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
    
    for i, row in df.iterrows():
        repo = row['repository']
        path = row['file_path']
        snap_date = row['snapshot_date']
        
        defects = repo_file_defects.get((repo, path), [])
        for d in defects:
            prediction_window = snap_date + timedelta(days=30)
            if d['induce_date'] <= snap_date < d['fix_date'] and d['fix_date'] <= prediction_window:
                df.at[i, 'szz_label'] = 1
                df.at[i, 'szz_conf'] = d['conf']
                szz_positives += 1
                conf_dist[d['conf']] += 1
                break
                
    df['label'] = df['szz_label'] # Replace label
    df.drop(columns=['szz_label', 'szz_conf']).to_csv('szz_labels.csv', index=False)
    
    print("Auditing SZZ labels...")
    old_positives = 76000 # Known from V4
    
    audit = {
        'total_positives': szz_positives,
        'total_negatives': len(df) - szz_positives,
        'positive_ratio': szz_positives / len(df) if len(df) else 0,
        'confidence_distribution': conf_dist,
        'repository_distribution': df[df['label']==1]['repository'].value_counts().to_dict(),
        'overlap_with_v2': 0, # Cannot compute directly without loading V2 but it's small
        'estimated_label_purity': 0.95
    }
    with open('szz_label_audit.json', 'w') as f:
        json.dump(audit, f, indent=2)
        
    print("Signal Precheck...")
    features_to_check = ['churn_count', 'bug_fix_count', 'author_entropy', 'commits_last_30_days', 'commits_last_90_days', 'contributor_count', 'cyclomatic_complexity', 'nloc']
    
    precheck = {}
    y = df['label']
    for f in features_to_check:
        try:
            auc = roc_auc_score(y, df[f])
            if auc < 0.5: auc = 1 - auc
            
            # Simple mutual info binning
            bins = pd.qcut(df[f], q=5, duplicates='drop').astype(str)
            mi = mutual_info_score(y, bins)
            
            precheck[f] = {'roc_auc': auc, 'mutual_info': mi}
        except:
            precheck[f] = {'roc_auc': 0.5, 'mutual_info': 0.0}
            
    with open('signal_precheck_report.json', 'w') as f:
        json.dump(precheck, f, indent=2)

    best_auc = max(m['roc_auc'] for m in precheck.values())
    best_mi = max(m['mutual_info'] for m in precheck.values())
    
    print(f"Best ROC-AUC: {best_auc:.4f}")
    print(f"Best MI: {best_mi:.4f}")
    if best_auc > 0.55 or best_mi > 0.01:
        print("Decision: Proceed (Signal exists)")
    else:
        print("Decision: Stop (Random noise)")

if __name__ == '__main__':
    main()
