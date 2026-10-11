import os
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

def calculate_entropy(author_counts):
    total = sum(author_counts.values())
    if total == 0:
        return 0.0
    entropy = 0.0
    for count in author_counts.values():
        p = count / total
        entropy -= p * math.log2(p)
    return entropy

def calculate_bus_factor(author_counts):
    total = sum(author_counts.values())
    if total == 0: return 0
    sorted_authors = sorted(author_counts.items(), key=lambda x: x[1], reverse=True)
    cumulative = 0
    bus_factor = 0
    for author, count in sorted_authors:
        cumulative += count
        bus_factor += 1
        if cumulative >= total * 0.50:
            break
    return bus_factor

def determine_risk(bus_factor, ownership, last_active_days, commits_90d, commits_180d):
    score = 100
    reasons = []
    
    if bus_factor <= 1:
        score -= 40
        reasons.append(f"Bus Factor = {bus_factor}")
    elif bus_factor == 2:
        score -= 20
        reasons.append(f"Bus Factor = {bus_factor}")
        
    if ownership >= 0.80:
        score -= 30
        reasons.append(f"Ownership = {ownership*100:.0f}%")
    elif ownership >= 0.60:
        score -= 10
        reasons.append(f"Ownership = {ownership*100:.0f}%")
        
    # Activity multiplier logic
    activity_score = 0
    if commits_90d == 0 and commits_180d == 0:
        # Dormant code is stable, remove risk
        activity_score = +60 # Heavy bonus
        score += activity_score
        reasons.append(f"Dormant/Stable (+{activity_score} bonus)")
    elif commits_90d > 10:
        # High volatility
        activity_score = -20
        score += activity_score
        reasons.append(f"High Volatility ({commits_90d} commits in 90d)")
    
    # Cap score at 0 and 100
    if score < 0: score = 0
    if score > 100: score = 100
    
    risk = "Low"
    if score <= 40: risk = "Critical"
    elif score <= 60: risk = "High"
    elif score <= 80: risk = "Medium"
    
    return score, risk, activity_score, reasons

def is_excluded(filepath):
    lower = filepath.lower()
    for pat in EXCLUDE_PATTERNS:
        if pat in lower.split('/'):
            return True
        # also check if the exact string is in it just in case
        if pat in lower:
            return True
    return False

def process_repository(repo_name, repo_path, exclusions_list):
    print(f"[{repo_name}] Scanning history...")
    cmd = ['git', 'log', '--format=COMMIT|%aN|%aI', '--name-only']
    try:
        proc = subprocess.run(cmd, cwd=repo_path, capture_output=True, text=True, errors='replace')
    except Exception as e:
        print(f"Failed {repo_name}: {e}")
        return {}, {}, {}

    file_author_counts = defaultdict(lambda: defaultdict(int))
    file_last_active = defaultdict(lambda: defaultdict(str))
    
    # For Activity Multiplier
    file_commits_90d = defaultdict(int)
    file_commits_180d = defaultdict(int)
    
    current_author = None
    current_date_str = None
    
    now = datetime.now(timezone.utc)
    
    for line in proc.stdout.split('\n'):
        line = line.strip()
        if not line: continue
        
        if line.startswith('COMMIT|'):
            parts = line.split('|')
            if len(parts) >= 3:
                current_author = parts[1]
                current_date_str = parts[2]
        else:
            if current_author and current_date_str:
                filepath = line.replace('\\', '/')
                
                if is_excluded(filepath):
                    exclusions_list.add(f"{repo_name}/{filepath}")
                    continue

                file_author_counts[filepath][current_author] += 1
                
                # Keep most recent
                existing = file_last_active[filepath].get(current_author, "")
                if current_date_str > existing:
                    file_last_active[filepath][current_author] = current_date_str
                    
                # Time tracking
                try:
                    dt = datetime.fromisoformat(current_date_str)
                    days = (now - dt).days
                    if days <= 90: file_commits_90d[filepath] += 1
                    if days <= 180: file_commits_180d[filepath] += 1
                except:
                    pass

    file_risks = {}
    component_author_counts = defaultdict(lambda: defaultdict(int))
    component_last_active = defaultdict(lambda: defaultdict(str))
    component_commits_90d = defaultdict(int)
    component_commits_180d = defaultdict(int)
    
    for filepath, authors in file_author_counts.items():
        if not filepath.endswith(('.ts', '.js', '.py', '.java', '.go', '.tsx', '.jsx', '.cs', '.cpp')): continue
        
        total = sum(authors.values())
        if total < 5: continue # Ignore trivial files
        
        top_author = max(authors.items(), key=lambda x: x[1])[0]
        ownership = authors[top_author] / total
        bus_factor = calculate_bus_factor(authors)
        entropy = calculate_entropy(authors)
        
        last_date_str = file_last_active[filepath][top_author]
        try:
            last_date = datetime.fromisoformat(last_date_str)
            last_active_days = (now - last_date).days
        except:
            last_active_days = 0
            
        c90 = file_commits_90d[filepath]
        c180 = file_commits_180d[filepath]
            
        score, risk, activity_score, reasons = determine_risk(bus_factor, ownership, last_active_days, c90, c180)
        reasons.append(f"Entropy = {entropy:.2f}")
        
        file_risks[filepath] = {
            "score": score,
            "risk": risk,
            "bus_factor": bus_factor,
            "ownership": round(ownership, 2),
            "entropy": round(entropy, 2),
            "activity_score": activity_score,
            "reasons": reasons,
            "last_active_days": last_active_days,
            "commits_90d": c90,
            "commits_180d": c180,
            "top_author": top_author,
            "total_commits": total
        }
        
        # Component aggregation
        component = filepath.split('/')[0] if '/' in filepath else 'root'
        
        component_commits_90d[component] += c90
        component_commits_180d[component] += c180
        
        for a, c in authors.items():
            component_author_counts[component][a] += c
            
            existing_c_date = component_last_active[component].get(a, "")
            file_date = file_last_active[filepath].get(a, "")
            if file_date > existing_c_date:
                component_last_active[component][a] = file_date

    component_risks = {}
    for comp, authors in component_author_counts.items():
        total = sum(authors.values())
        if total < 10: continue
        
        top_author = max(authors.items(), key=lambda x: x[1])[0]
        ownership = authors[top_author] / total
        bus_factor = calculate_bus_factor(authors)
        entropy = calculate_entropy(authors)
        
        last_date_str = component_last_active[comp][top_author]
        try:
            last_date = datetime.fromisoformat(last_date_str)
            last_active_days = (now - last_date).days
        except:
            last_active_days = 0
            
        c90 = component_commits_90d[comp]
        c180 = component_commits_180d[comp]
            
        score, risk, activity_score, reasons = determine_risk(bus_factor, ownership, last_active_days, c90, c180)
        reasons.append(f"Entropy = {entropy:.2f}")
        
        component_risks[comp] = {
            "score": score,
            "risk": risk,
            "bus_factor": bus_factor,
            "ownership": round(ownership, 2),
            "entropy": round(entropy, 2),
            "activity_score": activity_score,
            "reasons": reasons,
            "last_active_days": last_active_days,
            "commits_90d": c90,
            "commits_180d": c180,
            "top_author": top_author,
            "total_commits": total
        }
        
    # Repo level risk
    repo_authors = defaultdict(int)
    for authors in component_author_counts.values():
        for a, c in authors.items():
            repo_authors[a] += c
            
    repo_total = sum(repo_authors.values())
    if repo_total > 0:
        top_author = max(repo_authors.items(), key=lambda x: x[1])[0]
        repo_ownership = repo_authors[top_author] / repo_total
        repo_bus = calculate_bus_factor(repo_authors)
        repo_entropy = calculate_entropy(repo_authors)
        repo_c90 = sum(component_commits_90d.values())
        repo_c180 = sum(component_commits_180d.values())
        
        repo_score, repo_risk, activity_score, repo_reasons = determine_risk(repo_bus, repo_ownership, 0, repo_c90, repo_c180)
        repo_risk_data = {
            "score": repo_score,
            "risk": repo_risk,
            "bus_factor": repo_bus,
            "ownership": round(repo_ownership, 2),
            "entropy": round(repo_entropy, 2),
            "activity_score": activity_score,
            "reasons": repo_reasons,
            "commits_90d": repo_c90,
            "commits_180d": repo_c180,
            "total_commits": repo_total
        }
    else:
        repo_risk_data = {}

    return file_risks, component_risks, repo_risk_data

def generate_knowledge_loss_report(repo_name, repo_path, output_dir):
    print(f"Generating knowledge loss report for: {repo_name}")
    exclusions_list = set()
    f_risks, c_risks, r_risk = process_repository(repo_name, repo_path, exclusions_list)
    
    report = {
        repo_name: {
            "repository_risk": r_risk,
            "components": c_risks,
            "files": f_risks
        }
    }
    
    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, 'knowledge_loss_report.json'), 'w') as f:
        json.dump(report, f, indent=2)
        
    print("Knowledge Loss Engine run complete.")

def main():
    pass

if __name__ == '__main__':
    main()
