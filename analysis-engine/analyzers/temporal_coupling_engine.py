import os
import json
import subprocess
from collections import defaultdict
from datetime import datetime, timezone

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "repositories_cache")
PRISMA_DIR = r"C:\repos\prisma"

EXCLUDE_PATTERNS = ['dist', 'build', 'coverage', 'docs', 'documentation', 'cypress', 'fixtures', 'examples', 'vendor', 'generated', 'node_modules', 'out', 'assets', 'static', 'public', '.circleci', '.github', 'test', 'tests', 'e2e', 'spec', 'mocks', 'scripts', 'test-dts']

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

def is_excluded(filepath):
    lower = filepath.lower()
    for pat in EXCLUDE_PATTERNS:
        if pat in lower.split('/'):
            return True
        if pat in lower:
            return True
    return False

def build_clusters(pairs):
    # A simple connected components algorithm for clustering strongly coupled items
    # Filter pairs with score > 0.75
    edges = [(p['entity_a'], p['entity_b']) for p in pairs if p['current_coupling_score'] > 0.75 or p['historical_coupling_score'] > 0.75]
    graph = defaultdict(set)
    for u, v in edges:
        graph[u].add(v)
        graph[v].add(u)
        
    visited = set()
    clusters = []
    
    for node in graph:
        if node not in visited:
            cluster = set()
            queue = [node]
            while queue:
                curr = queue.pop(0)
                if curr not in visited:
                    visited.add(curr)
                    cluster.add(curr)
                    for neighbor in graph[curr]:
                        if neighbor not in visited:
                            queue.append(neighbor)
            if len(cluster) > 1:
                clusters.append(list(cluster))
    return clusters

def process_repository(repo_name, repo_path, max_commits=1000, since="6 months ago"):
    print(f"[{repo_name}] Scanning history for temporal coupling...")
    cmd = ['git', 'log', '--format=COMMIT|%H|%aI', '--name-only']
    if max_commits:
        cmd.extend(['-n', str(max_commits)])
    if since:
        cmd.append(f'--since={since}')
    
    now = datetime.now(timezone.utc)
    
    # Track overall changes
    file_changes = defaultdict(int)
    file_changes_90d = defaultdict(int)
    file_changes_180d = defaultdict(int)
    
    comp_changes = defaultdict(int)
    comp_changes_90d = defaultdict(int)
    comp_changes_180d = defaultdict(int)
    
    # Track co-changes
    file_co_changes = defaultdict(lambda: defaultdict(int))
    file_co_changes_90d = defaultdict(lambda: defaultdict(int))
    file_co_changes_180d = defaultdict(lambda: defaultdict(int))
    file_first_observed = defaultdict(lambda: defaultdict(lambda: now))
    file_last_observed = defaultdict(lambda: defaultdict(lambda: datetime.min.replace(tzinfo=timezone.utc)))
    
    comp_co_changes = defaultdict(lambda: defaultdict(int))
    comp_co_changes_90d = defaultdict(lambda: defaultdict(int))
    comp_co_changes_180d = defaultdict(lambda: defaultdict(int))
    comp_first_observed = defaultdict(lambda: defaultdict(lambda: now))
    comp_last_observed = defaultdict(lambda: defaultdict(lambda: datetime.min.replace(tzinfo=timezone.utc)))
    
    current_date = None
    days_ago = 0
    commit_files = set()
    
    def process_commit(files, c_date, days):
        files = list(files)
        comps = list(set(f.split('/')[0] if '/' in f else 'root' for f in files))
        
        for f in files:
            file_changes[f] += 1
            if days <= 90: file_changes_90d[f] += 1
            if days <= 180: file_changes_180d[f] += 1
            
        for c in comps:
            comp_changes[c] += 1
            if days <= 90: comp_changes_90d[c] += 1
            if days <= 180: comp_changes_180d[c] += 1
            
        # File co-changes
        for i in range(len(files)):
            for j in range(i+1, len(files)):
                f1, f2 = files[i], files[j]
                if f1 > f2: f1, f2 = f2, f1
                file_co_changes[f1][f2] += 1
                if days <= 90: file_co_changes_90d[f1][f2] += 1
                if days <= 180: file_co_changes_180d[f1][f2] += 1
                if c_date < file_first_observed[f1][f2]: file_first_observed[f1][f2] = c_date
                if c_date > file_last_observed[f1][f2]: file_last_observed[f1][f2] = c_date
                
        # Comp co-changes
        for i in range(len(comps)):
            for j in range(i+1, len(comps)):
                c1, c2 = comps[i], comps[j]
                if c1 > c2: c1, c2 = c2, c1
                comp_co_changes[c1][c2] += 1
                if days <= 90: comp_co_changes_90d[c1][c2] += 1
                if days <= 180: comp_co_changes_180d[c1][c2] += 1
                if c_date < comp_first_observed[c1][c2]: comp_first_observed[c1][c2] = c_date
                if c_date > comp_last_observed[c1][c2]: comp_last_observed[c1][c2] = c_date

    try:
        proc = subprocess.Popen(cmd, cwd=repo_path, stdout=subprocess.PIPE, text=True, errors='replace')
        for line in proc.stdout:
            line = line.strip()
            if not line: continue
            
            if line.startswith('COMMIT|'):
                if current_date and commit_files:
                    process_commit(commit_files, current_date, days_ago)
                
                commit_files = set()
                parts = line.split('|')
                if len(parts) >= 3:
                    date_str = parts[2]
                    try:
                        current_date = datetime.fromisoformat(date_str)
                        days_ago = (now - current_date).days
                    except:
                        current_date = None
            else:
                if current_date:
                    filepath = line.replace('\\', '/')
                    if is_excluded(filepath): continue
                    if not filepath.endswith(('.ts', '.js', '.py', '.java', '.go', '.tsx', '.jsx', '.cs', '.cpp')): continue
                    commit_files.add(filepath)
        
        proc.wait()
    except Exception as e:
        print(f"Error processing {repo_path}: {e}")
        return [], []
        
    if current_date and commit_files:
        process_commit(commit_files, current_date, days_ago)

    file_relationships = []
    comp_relationships = []

    def calculate_score(co, t1, t2):
        return co / max(t1, t2) if max(t1, t2) > 0 else 0

    # Build File Relationships
    for f1, connections in file_co_changes.items():
        for f2, co_changes in connections.items():
            threshold = max(5, 0.05 * min(file_changes[f1], file_changes[f2]))
            if co_changes < threshold: continue
            
            hist_score = calculate_score(co_changes, file_changes[f1], file_changes[f2])
            curr_score = calculate_score(file_co_changes_180d[f1][f2], file_changes_180d[f1], file_changes_180d[f2])
            
            if hist_score < 0.2 and curr_score < 0.2: continue
            
            warning = "Low"
            if curr_score > 0.9 or hist_score > 0.9: warning = "Very Strong"
            elif curr_score > 0.75 or hist_score > 0.75: warning = "Strong"
            elif curr_score > 0.5 or hist_score > 0.5: warning = "Moderate"

            file_relationships.append({
                "repository": repo_name,
                "type": "file",
                "entity_a": f1,
                "entity_b": f2,
                "total_changes_a": file_changes[f1],
                "total_changes_b": file_changes[f2],
                "co_changes": co_changes,
                "recent_co_changes_90_days": file_co_changes_90d[f1][f2],
                "recent_co_changes_180_days": file_co_changes_180d[f1][f2],
                "historical_coupling_score": round(hist_score, 2),
                "current_coupling_score": round(curr_score, 2),
                "first_observed_date": file_first_observed[f1][f2].isoformat(),
                "last_observed_date": file_last_observed[f1][f2].isoformat(),
                "warning_level": warning
            })

    # Build Component Relationships
    for c1, connections in comp_co_changes.items():
        for c2, co_changes in connections.items():
            threshold = max(5, 0.05 * min(comp_changes[c1], comp_changes[c2]))
            if co_changes < threshold: continue
            
            hist_score = calculate_score(co_changes, comp_changes[c1], comp_changes[c2])
            curr_score = calculate_score(comp_co_changes_180d[c1][c2], comp_changes_180d[c1], comp_changes_180d[c2])
            
            if hist_score < 0.2 and curr_score < 0.2: continue
            
            warning = "Low"
            if curr_score > 0.9 or hist_score > 0.9: warning = "Very Strong"
            elif curr_score > 0.75 or hist_score > 0.75: warning = "Strong"
            elif curr_score > 0.5 or hist_score > 0.5: warning = "Moderate"

            comp_relationships.append({
                "repository": repo_name,
                "type": "component",
                "entity_a": c1,
                "entity_b": c2,
                "total_changes_a": comp_changes[c1],
                "total_changes_b": comp_changes[c2],
                "co_changes": co_changes,
                "recent_co_changes_90_days": comp_co_changes_90d[c1][c2],
                "recent_co_changes_180_days": comp_co_changes_180d[c1][c2],
                "historical_coupling_score": round(hist_score, 2),
                "current_coupling_score": round(curr_score, 2),
                "first_observed_date": comp_first_observed[c1][c2].isoformat(),
                "last_observed_date": comp_last_observed[c1][c2].isoformat(),
                "warning_level": warning
            })

    return file_relationships, comp_relationships

def generate_temporal_coupling_report(repo_name, repo_path, output_dir, max_commits=1000, since="6 months ago"):
    f_rels, c_rels = process_repository(repo_name, repo_path, max_commits=max_commits, since=since)
    report = {
        repo_name: {
            "files": sorted(f_rels, key=lambda x: max(x['current_coupling_score'], x['historical_coupling_score']), reverse=True),
            "components": sorted(c_rels, key=lambda x: max(x['current_coupling_score'], x['historical_coupling_score']), reverse=True)
        }
    }
    
    all_pairs = f_rels + c_rels
    clusters = build_clusters(all_pairs)
    
    # engineering_intelligence_engine needs a specific format including clusters:
    report_for_intelligence = {
        repo_name: report[repo_name],
        "clusters": clusters
    }
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Save the report for engineering_intelligence_engine
    with open(os.path.join(output_dir, 'temporal_coupling_report.json'), 'w') as f:
        json.dump(report_for_intelligence, f, indent=2)
        
    # Backend expects these exact files
    with open(os.path.join(output_dir, 'temporal_coupling_dashboard.json'), 'w') as f:
        json.dump(report, f, indent=2)
        
    with open(os.path.join(output_dir, 'temporal_coupling_active.json'), 'w') as f:
        json.dump(report, f, indent=2)
        
    with open(os.path.join(output_dir, 'temporal_coupling_production.json'), 'w') as f:
        json.dump(report, f, indent=2)

def main():
    pass

if __name__ == '__main__':
    main()
