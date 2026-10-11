import json
import os
from collections import defaultdict
import subprocess
from datetime import datetime, timezone

def determine_risk_modified(bus_factor, ownership, last_active_days, bf_mod=1.0, own_mod=1.0):
    score = 100
    if bus_factor <= 1: score -= (40 * bf_mod)
    elif bus_factor == 2: score -= (20 * bf_mod)
        
    if ownership >= 0.80: score -= (30 * own_mod)
    elif ownership >= 0.60: score -= (10 * own_mod)
        
    if last_active_days > 90: score -= 20
    elif last_active_days > 30: score -= 10
        
    if score < 0: score = 0
    return score

def main():
    report_path = 'knowledge_loss_report.json'
    with open(report_path, 'r') as f:
        data = json.load(f)

    components = []
    distribution = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}

    for repo, repo_data in data.items():
        if "components" not in repo_data: continue
        for comp_name, comp_data in repo_data["components"].items():
            comp_data['repository'] = repo
            comp_data['component'] = comp_name
            components.append(comp_data)
            distribution[comp_data['risk']] += 1

    components.sort(key=lambda x: x['score'])
    top_100 = components[:100]

    # False Positive Audit
    fp_keywords = ['dist', 'build', 'out', 'vendor', 'node_modules', 'test', 'tests', 'fixtures', 'docs', 'assets', 'e2e', 'spec', 'mocks', 'cypress', 'static', 'public', 'scripts']
    fp_count = 0
    fp_list = []
    
    for c in top_100:
        c_lower = c['component'].lower()
        if any(kw in c_lower for kw in fp_keywords):
            fp_count += 1
            fp_list.append(f"{c['repository']}/{c['component']}")

    # Sensitivity Analysis
    ranking_stability_issues = 0
    
    for c in components:
        base_score = c['score']
        # +20%
        score_plus = determine_risk_modified(c['bus_factor'], c['ownership'], c['last_active_days'], 1.2, 1.2)
        # -20%
        score_minus = determine_risk_modified(c['bus_factor'], c['ownership'], c['last_active_days'], 0.8, 0.8)
        
        c['score_plus'] = score_plus
        c['score_minus'] = score_minus

    components_plus = sorted(components, key=lambda x: x['score_plus'])
    components_minus = sorted(components, key=lambda x: x['score_minus'])
    
    top_100_plus = {f"{x['repository']}/{x['component']}" for x in components_plus[:100]}
    top_100_minus = {f"{x['repository']}/{x['component']}" for x in components_minus[:100]}
    base_100_set = {f"{x['repository']}/{x['component']}" for x in top_100}
    
    overlap_plus = len(base_100_set.intersection(top_100_plus))
    overlap_minus = len(base_100_set.intersection(top_100_minus))

    # Active Maintenance
    CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "repositories_cache")
    PRISMA_DIR = r"C:\repos\prisma"

    repos_map = {}
    if os.path.exists(CACHE_DIR):
        for entry in os.listdir(CACHE_DIR):
            repos_map[entry] = os.path.join(CACHE_DIR, entry)
    if os.path.exists(PRISMA_DIR):
        repos_map['prisma'] = PRISMA_DIR

    active_maintenance = []
    inactive_count = 0

    now = datetime.now(timezone.utc)

    for c in top_100[:20]: # Sample top 20 for time
        repo_path = repos_map.get(c['repository'])
        if repo_path and os.path.exists(repo_path):
            try:
                cmd = ['git', 'log', '--format=%aI', '--', c['component']]
                proc = subprocess.run(cmd, cwd=repo_path, capture_output=True, text=True, errors='replace')
                dates = [line.strip() for line in proc.stdout.split('\n') if line.strip()]
                
                c90 = 0
                c180 = 0
                for d_str in dates:
                    try:
                        dt = datetime.fromisoformat(d_str)
                        days = (now - dt).days
                        if days <= 90: c90 += 1
                        if days <= 180: c180 += 1
                    except: pass
                
                is_inactive = c90 == 0
                if is_inactive: inactive_count += 1
                
                active_maintenance.append({
                    "target": f"{c['repository']}/{c['component']}",
                    "commits_90d": c90,
                    "commits_180d": c180,
                    "last_active": c['last_active_days'],
                    "inactive": is_inactive
                })
            except:
                pass

    out = {
        "check_1_top_critical": [
            {"repository": c['repository'], "component": c['component'], "score": c['score'], "bus_factor": c['bus_factor'], "ownership": c['ownership']} for c in top_100[:10]
        ],
        "check_2_false_positives": {
            "percentage": (fp_count / len(top_100)) * 100,
            "examples": fp_list[:10]
        },
        "check_3_active_maintenance_sample": active_maintenance,
        "inactive_ratio_in_sample": inactive_count / len(active_maintenance) if active_maintenance else 0,
        "check_4_score_distribution": distribution,
        "check_5_sensitivity": {
            "overlap_plus_20": f"{overlap_plus}%",
            "overlap_minus_20": f"{overlap_minus}%"
        }
    }

    with open('audit_9a_results.json', 'w') as f:
        json.dump(out, f, indent=2)

if __name__ == "__main__":
    main()
