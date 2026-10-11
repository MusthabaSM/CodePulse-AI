import os
import sys
import json
import math
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

def run_lizard(repo_path, filepaths):
    # Runs lizard and returns dict mapping filepath to (nloc, ccn)
    results = {}
    try:
        # Chunk filepaths to avoid Windows max command length
        chunk_size = 100
        for i in range(0, len(filepaths), chunk_size):
            chunk = filepaths[i:i+chunk_size]
            cmd = [sys.executable, '-m', 'lizard', '--csv'] + chunk
            proc = subprocess.run(cmd, cwd=repo_path, capture_output=True, text=True, errors='replace')
            # CSV format: NLOC, CCN, token, PARAM, length, location, filename
            for line in proc.stdout.split('\n'):
                parts = line.split(',')
                if len(parts) >= 7:
                    try:
                        nloc = int(parts[0])
                        ccn = float(parts[1])
                        fname = parts[6].strip('"').replace('\\', '/')
                        results[fname] = (nloc, ccn)
                    except:
                        pass
        return results
    except Exception as e:
        print(f"Lizard failed: {e}")
        return {}

def calculate_entropy(author_counts):
    total = sum(author_counts.values())
    if total == 0: return 0.0
    entropy = 0.0
    for count in author_counts.values():
        p = count / total
        entropy -= p * math.log2(p)
    return entropy

def process_repository(repo_name, repo_path, exclusions_list, temporal_couplings):
    print(f"[{repo_name}] Scanning history...")
    cmd = ['git', 'log', '--format=COMMIT|%H|%aN|%aI', '--name-only']
    try:
        proc = subprocess.run(cmd, cwd=repo_path, capture_output=True, text=True, errors='replace')
    except Exception as e:
        return {}
        
    component_commits = defaultdict(list)
    component_authors = defaultdict(lambda: defaultdict(int))
    component_file_commits = defaultdict(list) # For temporal coupling
    commit_files = defaultdict(set)
    
    current_hash = None
    current_author = None
    current_date_str = None
    
    now = datetime.now(timezone.utc)
    first_commit_date = now
    
    for line in proc.stdout.split('\n'):
        line = line.strip()
        if not line: continue
        
        if line.startswith('COMMIT|'):
            parts = line.split('|')
            if len(parts) >= 4:
                current_hash = parts[1]
                current_author = parts[2]
                current_date_str = parts[3]
                try:
                    dt = datetime.fromisoformat(current_date_str)
                    if dt < first_commit_date:
                        first_commit_date = dt
                except:
                    pass
        else:
            if current_author and current_date_str and current_hash:
                filepath = line.replace('\\', '/')
                if is_excluded(filepath):
                    exclusions_list.add(f"{repo_name}/{filepath}")
                    continue
                if not filepath.endswith(('.ts', '.js', '.py', '.java', '.go', '.tsx', '.jsx', '.cs', '.cpp')): continue
                
                comp = filepath.split('/')[0] if '/' in filepath else 'root'
                
                try:
                    dt = datetime.fromisoformat(current_date_str)
                    component_commits[comp].append(dt)
                    component_authors[comp][current_author] += 1
                    commit_files[current_hash].add(comp)
                except:
                    pass

    # Temporal Coupling Calculation (Component Level for simplicity to avoid massive matrices)
    comp_co_changes = defaultdict(lambda: defaultdict(int))
    comp_total_changes = defaultdict(int)
    for h, comps in commit_files.items():
        comps = list(comps)
        for c in comps:
            comp_total_changes[c] += 1
        for i in range(len(comps)):
            for j in range(i+1, len(comps)):
                c1, c2 = comps[i], comps[j]
                if c1 > c2: c1, c2 = c2, c1
                comp_co_changes[c1][c2] += 1
                
    for c1, connections in comp_co_changes.items():
        for c2, co_changes in connections.items():
            if co_changes < 5: continue
            score = co_changes / max(comp_total_changes[c1], comp_total_changes[c2])
            temporal_couplings.append({
                "repository": repo_name,
                "component_a": c1,
                "component_b": c2,
                "co_changes": co_changes,
                "score": round(score, 3)
            })

    # Complexity
    print(f"[{repo_name}] Running Lizard...")
    # Get all files currently in repo
    tracked_files = []
    try:
        proc2 = subprocess.run(['git', 'ls-files'], cwd=repo_path, capture_output=True, text=True)
        tracked_files = [f for f in proc2.stdout.split('\n') if f.endswith(('.ts', '.js', '.py', '.java', '.go', '.tsx', '.jsx', '.cs', '.cpp')) and not is_excluded(f)]
    except:
        pass
        
    lizard_res = run_lizard(repo_path, tracked_files)
    comp_complexity = defaultdict(lambda: {"nloc": 0, "ccn": 0.0, "files": 0})
    for f, (nloc, ccn) in lizard_res.items():
        comp = f.split('/')[0] if '/' in f else 'root'
        comp_complexity[comp]["nloc"] += nloc
        comp_complexity[comp]["ccn"] += ccn
        comp_complexity[comp]["files"] += 1

    repo_age_days = (now - first_commit_date).days
    if repo_age_days < 30: repo_age_days = 30
    
    hotspots = {}
    
    for comp, dates in component_commits.items():
        if len(dates) < 5: continue
        
        # Change Burst
        c30 = sum(1 for d in dates if (now - d).days <= 30)
        c180 = sum(1 for d in dates if (now - d).days <= 180)
        
        historical_avg_30 = (len(dates) / repo_age_days) * 30
        burst_ratio = (c30 / historical_avg_30) if historical_avg_30 > 0 else 0
        
        # Coupling max score
        max_coupling = 0
        for c1, conns in comp_co_changes.items():
            if c1 == comp:
                for c2, val in conns.items():
                    sc = val / max(comp_total_changes[c1], comp_total_changes[c2])
                    if sc > max_coupling: max_coupling = sc
            elif comp in conns:
                sc = conns[comp] / max(comp_total_changes[c1], comp_total_changes[comp])
                if sc > max_coupling: max_coupling = sc

        # Complexity
        nloc = comp_complexity[comp]["nloc"]
        ccn = comp_complexity[comp]["ccn"]
        
        # Ownership
        authors = component_authors[comp]
        entropy = calculate_entropy(authors)
        contributor_count = len(authors)
        
        # SCORING (Start at 0, add risk)
        complexity_score = 0
        change_score = 0
        ownership_score = 0
        coupling_score = 0
        reasons = []
        
        # A. Complexity
        if ccn > 500:
            complexity_score += 20
            reasons.append(f"Extreme complexity (CCN: {ccn})")
        elif ccn > 100:
            complexity_score += 10
            reasons.append(f"High complexity (CCN: {ccn})")
            
        if nloc > 10000:
            complexity_score += 10
            reasons.append(f"Large component (NLOC: {nloc})")
            
        # B. Change Pressure
        if burst_ratio > 3:
            change_score += 30
            reasons.append(f"High Burst Ratio ({burst_ratio:.1f}x normal)")
        elif burst_ratio > 1.5:
            change_score += 15
            reasons.append(f"Elevated Burst Ratio ({burst_ratio:.1f}x normal)")
            
        if c180 > 100:
            change_score += 15
            reasons.append(f"High churn ({c180} commits in 180d)")
            
        # C. Ownership
        if contributor_count > 10 and entropy > 2.0:
            ownership_score += 15
            reasons.append(f"High fragmentation ({contributor_count} contributors, Entropy: {entropy:.2f})")
            
        # D. Coupling
        if max_coupling > 0.5:
            coupling_score += 20
            reasons.append(f"Strong temporal coupling (Max: {max_coupling:.2f})")
        elif max_coupling > 0.2:
            coupling_score += 10
            reasons.append(f"Moderate temporal coupling (Max: {max_coupling:.2f})")
            
        hotspot_score = complexity_score + change_score + ownership_score + coupling_score
        
        # 4. Stability Protection
        if c180 == 0:
            # 0 commits in 180 days -> max score capped unless overridden.
            # We'll subtract heavily
            if hotspot_score < 50:
                hotspot_score = 10 # Force low
                reasons.append("Stable code (-80 penalty)")
            else:
                hotspot_score -= 50
                reasons.append("Stable code but high structural risk (-50 penalty)")
                
        if hotspot_score > 100: hotspot_score = 100
        if hotspot_score < 0: hotspot_score = 0
        
        risk = "Low"
        if hotspot_score >= 70: risk = "Critical"
        elif hotspot_score >= 50: risk = "High"
        elif hotspot_score >= 30: risk = "Medium"
        
        hotspots[comp] = {
            "repository": repo_name,
            "component": comp,
            "hotspot_score": round(hotspot_score, 1),
            "risk": risk,
            "complexity_score": complexity_score,
            "change_score": change_score,
            "ownership_score": ownership_score,
            "coupling_score": coupling_score,
            "reasons": reasons,
            "metrics": {
                "ccn": ccn,
                "nloc": nloc,
                "churn_180d": c180,
                "burst_ratio": round(burst_ratio, 2),
                "contributor_count": contributor_count,
                "entropy": round(entropy, 2),
                "max_coupling": round(max_coupling, 2)
            }
        }
        
    return hotspots

def generate_architectural_hotspots_report(repo_name, repo_path, output_dir):
    print(f"Generating architectural hotspots report for: {repo_name}")
    exclusions_list = set()
    temporal_couplings = [] # We don't use the TC generated here, but the function requires it
    h_risks = process_repository(repo_name, repo_path, exclusions_list, temporal_couplings)
    
    report = {repo_name: h_risks}
    
    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, 'architectural_hotspots.json'), 'w') as f:
        json.dump(report, f, indent=2)
        
    print("Architectural Hotspots Engine run complete.")

def main():
    pass

if __name__ == '__main__':
    main()
