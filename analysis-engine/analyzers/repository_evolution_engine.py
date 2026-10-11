import os
import sys
import json
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

def determine_trend(data):
    if len(data) < 2: return "Stable"
    diffs = [data[i] - data[i-1] for i in range(1, len(data))]
    avg_diff = sum(diffs) / len(diffs)
    std_dev = statistics.stdev(data) if len(data) > 1 else 0
    
    if std_dev > (sum(data)/len(data) * 0.5) and len(data) > 3:
        return "Volatile"
    elif avg_diff > (sum(data)/len(data) * 0.05):
        return "Improving"
    elif avg_diff < -(sum(data)/len(data) * 0.05):
        return "Deteriorating"
    else:
        return "Stable"

def get_stats(data):
    if not data: return {"mean": 0, "median": 0, "stddev": 0, "max_mom": 0, "trend": "Stable"}
    mean = statistics.mean(data)
    median = statistics.median(data)
    stddev = statistics.stdev(data) if len(data) > 1 else 0
    
    diffs = [abs(data[i] - data[i-1]) for i in range(1, len(data))]
    max_mom = max(diffs) if diffs else 0
    
    return {
        "mean": round(mean, 2),
        "median": round(median, 2),
        "stddev": round(stddev, 2),
        "largest_month_over_month_change": round(max_mom, 2),
        "trend_classification": determine_trend(data)
    }

def generate_evolution_report(repo_name, repo_dir, output_dir):
    print(f"Processing repository evolution: {repo_name}")
    now = datetime.now()
    checkpoints = []
    for i in range(11, -1, -1):
        cp_date = now - timedelta(days=30 * i)
        start_date = cp_date - timedelta(days=90)
        checkpoints.append({
            "timestamp": cp_date.strftime("%Y-%m-%d"),
            "since": start_date.strftime("%Y-%m-%d"),
            "until": cp_date.strftime("%Y-%m-%d")
        })
        
    repo_data = []
    
    for cp in checkpoints:
        cmd = f"git log --since=\"{cp['since']}\" --until=\"{cp['until']}\" --numstat --format=\"COMMIT|%h|%an\""
        output = run_git_command(repo_dir, cmd)
        
        author_counts = {}
        file_churn = {}
        file_complexity = {}
        co_changes = {}
        
        current_commit_files = []
        
        for line in output.split('\n'):
            line = line.strip()
            if not line: continue
            if line.startswith('COMMIT|'):
                # End previous commit coupling
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
                    file_complexity[filename] = file_complexity.get(filename, 0) + int(added) + int(deleted)
        
        # process last commit
        if len(current_commit_files) > 1:
            for i in range(len(current_commit_files)):
                for j in range(i+1, len(current_commit_files)):
                    pair = tuple(sorted([current_commit_files[i], current_commit_files[j]]))
                    co_changes[pair] = co_changes.get(pair, 0) + 1
                    
        # Knowledge Metrics
        total_commits = sum(author_counts.values())
        bus_factor = 0
        ownership = 0.0
        entropy = 0.0
        if total_commits > 0:
            sorted_authors = sorted(author_counts.values(), reverse=True)
            ownership = sorted_authors[0] / total_commits
            entropy = calculate_entropy(sorted_authors)
            running_sum = 0
            for c in sorted_authors:
                bus_factor += 1
                running_sum += c
                if running_sum >= total_commits * 0.5:
                    break
                    
        # Arch Metrics
        hotspot_count = sum(1 for c in file_churn.values() if c > 5)
        avg_churn = sum(file_churn.values()) / len(file_churn) if file_churn else 0.0
        avg_complexity = sum(file_complexity.values()) / len(file_complexity) if file_complexity else 0.0
        
        # Coupling Metrics
        active_coupling_count = sum(1 for c in co_changes.values() if c > 1)
        strong_coupling_count = sum(1 for c in co_changes.values() if c > 5)
        
        # Cluster count (simple connected components where edge weight > 1)
        adj = {}
        for pair, count in co_changes.items():
            if count > 1:
                u, v = pair
                if u not in adj: adj[u] = []
                if v not in adj: adj[v] = []
                adj[u].append(v)
                adj[v].append(u)
        
        visited = set()
        clusters = 0
        for node in adj:
            if node not in visited:
                clusters += 1
                q = [node]
                visited.add(node)
                while q:
                    curr = q.pop(0)
                    for n in adj[curr]:
                        if n not in visited:
                            visited.add(n)
                            q.append(n)
                            
        kr = (max(0, 100 - bus_factor * 10) * 0.5) + (min(100, ownership * 100) * 0.25) + (min(100, entropy * 10) * 0.25)
        ar = min(100, (hotspot_count * 2) * 0.4 + (avg_complexity / 10) * 0.2 + (avg_churn * 5) * 0.4)
        cr = min(100, (strong_coupling_count * 5) * 0.4 + (active_coupling_count) * 0.4 + (clusters * 5) * 0.2)
        
        intelligence_score = (kr * 0.35) + (ar * 0.40) + (cr * 0.25)
        
        repo_data.append({
            "timestamp": cp["timestamp"],
            "knowledge": {
                "bus_factor": bus_factor,
                "ownership_concentration": round(ownership, 2),
                "author_entropy": round(entropy, 2),
                "knowledge_risk_score": round(kr, 2)
            },
            "architectural": {
                "hotspot_count": hotspot_count,
                "average_churn": round(avg_churn, 2),
                "average_complexity": round(avg_complexity, 2),
                "architectural_risk_score": round(ar, 2)
            },
            "coupling": {
                "active_coupling_count": active_coupling_count,
                "strong_coupling_count": strong_coupling_count,
                "cluster_count": clusters,
                "coupling_risk_score": round(cr, 2)
            },
            "engineering_intelligence_score": round(intelligence_score, 2)
        })
        
    # Calculate Deltas
    for i in range(1, len(repo_data)):
        repo_data[i]["knowledge"]["delta_score"] = round(repo_data[i]["knowledge"]["knowledge_risk_score"] - repo_data[i-1]["knowledge"]["knowledge_risk_score"], 2)
        repo_data[i]["architectural"]["delta_score"] = round(repo_data[i]["architectural"]["architectural_risk_score"] - repo_data[i-1]["architectural"]["architectural_risk_score"], 2)
        repo_data[i]["coupling"]["delta_score"] = round(repo_data[i]["coupling"]["coupling_risk_score"] - repo_data[i-1]["coupling"]["coupling_risk_score"], 2)
        repo_data[i]["delta_score"] = round(repo_data[i]["engineering_intelligence_score"] - repo_data[i-1]["engineering_intelligence_score"], 2)
        
    if len(repo_data) > 0:
        repo_data[0]["knowledge"]["delta_score"] = 0
        repo_data[0]["architectural"]["delta_score"] = 0
        repo_data[0]["coupling"]["delta_score"] = 0
        repo_data[0]["delta_score"] = 0
        
    report = {repo_name: repo_data}

    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, "repository_evolution_report.json"), "w") as f:
        json.dump(report, f, indent=2)
        
    print("Evolution Dashboard Generation Complete.")

def main():
    pass

if __name__ == "__main__":
    main()
