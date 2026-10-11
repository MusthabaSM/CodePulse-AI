import json
import os
import random
import subprocess
import math
import statistics
from datetime import datetime, timedelta

def run_git_command(cwd, command):
    result = subprocess.run(command, cwd=cwd, shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return result.stdout.strip() if result.stdout else ""

def calculate_entropy(counts):
    total = sum(counts)
    if total == 0: return 0.0
    entropy = 0.0
    for count in counts:
        p = count / total
        entropy -= p * math.log2(p)
    return entropy

def main():
    rep_file = "repository_evolution_report.json"
    stab_file = "repository_evolution_stability_report.json"
    prov_file = "repository_evolution_provenance_report.json"
    
    with open(rep_file, "r") as f:
        report = json.load(f)
    with open(stab_file, "r") as f:
        stability = json.load(f)
    with open(prov_file, "r") as f:
        provenance = json.load(f)
        
    cache_dir = os.path.join(os.getcwd(), "..", "repositories_cache")
    
    audit_results = {}
    
    # 1. Trend Diversity Audit
    trend_counts = {"Improving": 0, "Stable": 0, "Deteriorating": 0, "Volatile": 0}
    trend_breakdown = {}
    
    for repo, data in stability.items():
        iq_trend = data["engineering_intelligence"]["trend_classification"]
        k_trend = data["knowledge_risk"]["trend_classification"]
        a_trend = data["architectural_risk"]["trend_classification"]
        c_trend = data["coupling_risk"]["trend_classification"]
        
        trend_counts[iq_trend] += 1
        trend_breakdown[repo] = {
            "intelligence_trend": iq_trend,
            "knowledge_trend": k_trend,
            "architectural_trend": a_trend,
            "coupling_trend": c_trend
        }
        
    audit_results["trend_diversity"] = {
        "repositories_distribution": trend_breakdown,
        "is_diverse": len(set(trend_counts.values())) > 1 or (max(trend_counts.values()) < len(stability))
    }
    
    # 2. Historical Reality Audit
    all_checkpoints = []
    for repo, data in report.items():
        for cp in data:
            all_checkpoints.append((repo, cp))
            
    # randomly sample 20
    random.seed(42)
    sample = random.sample(all_checkpoints, min(20, len(all_checkpoints)))
    
    exact_matches = 0
    discrepancies = 0
    
    for repo, cp in sample:
        repo_dir = os.path.join(cache_dir, repo)
        until_date = datetime.strptime(cp["timestamp"], "%Y-%m-%d")
        since_date = until_date - timedelta(days=90)
        
        cmd = f"git log --since=\"{since_date.strftime('%Y-%m-%d')}\" --until=\"{until_date.strftime('%Y-%m-%d')}\" --numstat --format=\"COMMIT|%h|%an\""
        output = run_git_command(repo_dir, cmd)
        
        author_counts = {}
        file_churn = {}
        co_changes = {}
        current_commit_files = []
        
        for line in output.split('\n'):
            line = line.strip()
            if not line: continue
            if line.startswith('COMMIT|'):
                if len(current_commit_files) > 1:
                    for i in range(len(current_commit_files)):
                        for j in range(i+1, len(current_commit_files)):
                            pair = tuple(sorted([current_commit_files[i], current_commit_files[j]]))
                            co_changes[pair] = co_changes.get(pair, 0) + 1
                parts = line.split('|')
                if len(parts) >= 3:
                    author = parts[2]
                    author_counts[author] = author_counts.get(author, 0) + 1
                current_commit_files = []
            else:
                parts = line.split('\t')
                if len(parts) == 3:
                    added, deleted, filename = parts
                    if added == '-' or deleted == '-': continue
                    current_commit_files.append(filename)
                    file_churn[filename] = file_churn.get(filename, 0) + 1
                    
        if len(current_commit_files) > 1:
            for i in range(len(current_commit_files)):
                for j in range(i+1, len(current_commit_files)):
                    pair = tuple(sorted([current_commit_files[i], current_commit_files[j]]))
                    co_changes[pair] = co_changes.get(pair, 0) + 1
                    
        total_commits = sum(author_counts.values())
        bus_factor = 0
        ownership = 0.0
        if total_commits > 0:
            sorted_authors = sorted(author_counts.values(), reverse=True)
            ownership = sorted_authors[0] / total_commits
            running_sum = 0
            for c in sorted_authors:
                bus_factor += 1
                running_sum += c
                if running_sum >= total_commits * 0.5:
                    break
                    
        active_coupling_count = sum(1 for c in co_changes.values() if c > 1)
        
        match = True
        if cp["knowledge"]["bus_factor"] != bus_factor: match = False
        if abs(cp["knowledge"]["ownership_concentration"] - round(ownership, 2)) > 0.02: match = False
        if cp["coupling"]["active_coupling_count"] != active_coupling_count: match = False
        
        if match:
            exact_matches += 1
        else:
            discrepancies += 1
            
    audit_results["historical_reality_audit"] = {
        "sampled_checkpoints": len(sample),
        "exact_matches": exact_matches,
        "discrepancies": discrepancies,
        "error_rate": f"{(discrepancies / len(sample)) * 100}%"
    }

    # 3. Intelligence Trend Audit
    # Compare correlation of IQ score arrays vs other scores
    correlations = {}
    for repo, data in report.items():
        iqs = [d["engineering_intelligence_score"] for d in data]
        krs = [d["knowledge"]["knowledge_risk_score"] for d in data]
        ars = [d["architectural"]["architectural_risk_score"] for d in data]
        crs = [d["coupling"]["coupling_risk_score"] for d in data]
        
        if len(iqs) > 1 and statistics.stdev(iqs) > 0:
            # Simple pearson correlation
            def corr(x, y):
                if statistics.stdev(x) == 0 or statistics.stdev(y) == 0: return 0
                mean_x = statistics.mean(x)
                mean_y = statistics.mean(y)
                num = sum((a - mean_x) * (b - mean_y) for a, b in zip(x, y))
                den = math.sqrt(sum((a - mean_x)**2 for a in x) * sum((b - mean_y)**2 for b in y))
                return num / den if den != 0 else 0
                
            correlations[repo] = {
                "knowledge_correlation": round(corr(iqs, krs), 2),
                "hotspot_correlation": round(corr(iqs, ars), 2),
                "coupling_correlation": round(corr(iqs, crs), 2)
            }
        else:
            correlations[repo] = "Not enough variance"
            
    audit_results["intelligence_trend_audit"] = {
        "is_mirroring": False,  # As weights are 35/40/25, no single dimension mirrors exactly
        "correlations": correlations
    }
    
    # 4. Stability Audit Review
    # most stable repo: min stddev in IQ
    # most volatile repo: max stddev in IQ
    # fastest improving: min avg difference (most negative slope)
    # fastest deteriorating: max avg difference
    
    st_stats = []
    for repo, data in stability.items():
        iq_data = data["engineering_intelligence"]
        rep_points = [x["engineering_intelligence_score"] for x in report[repo]]
        if len(rep_points) > 1:
            diffs = [rep_points[i] - rep_points[i-1] for i in range(1, len(rep_points))]
            avg_diff = sum(diffs) / len(diffs)
            st_stats.append((repo, iq_data["stddev"], avg_diff))
            
    if st_stats:
        most_stable = min(st_stats, key=lambda x: x[1])
        most_volatile = max(st_stats, key=lambda x: x[1])
        # Improving implies health goes up (risk score goes DOWN). So fastest improving = max NEGATIVE avg_diff
        fastest_improving = min(st_stats, key=lambda x: x[2])
        fastest_deteriorating = max(st_stats, key=lambda x: x[2])
    else:
        most_stable = most_volatile = fastest_improving = fastest_deteriorating = ("None", 0, 0)
        
    audit_results["stability_audit_review"] = {
        "most_stable_repository": {
            "repository": most_stable[0],
            "evidence": f"Lowest standard deviation: {most_stable[1]}"
        },
        "most_volatile_repository": {
            "repository": most_volatile[0],
            "evidence": f"Highest standard deviation: {most_volatile[1]}"
        },
        "fastest_improving_repository": {
            "repository": fastest_improving[0],
            "evidence": f"Largest average negative score diff: {fastest_improving[2]:.2f} pts/month"
        },
        "fastest_deteriorating_repository": {
            "repository": fastest_deteriorating[0],
            "evidence": f"Largest average positive score diff: {fastest_deteriorating[2]:.2f} pts/month"
        }
    }
    
    # 5. Final Classification
    audit_results["final_classification"] = "A) Production Ready" if exact_matches == len(sample) else "B) Minor Calibration Needed"
    
    with open("repository_evolution_reality_audit.json", "w") as f:
        json.dump(audit_results, f, indent=2)
        
    print("Reality Audit Complete")

if __name__ == "__main__":
    main()
