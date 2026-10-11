import os
import sys
import json
import subprocess

def run_git_cmd(cmd, cwd):
    try:
        res = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=True)
        return True, res.stdout.strip()
    except subprocess.CalledProcessError as e:
        return False, e.stderr.strip()

def check_repo(repo_path):
    is_shallow = False
    commit_count = 0
    
    success, out = run_git_cmd(["git", "rev-parse", "--is-shallow-repository"], repo_path)
    if success:
        is_shallow = (out == "true")
        
    success, out = run_git_cmd(["git", "rev-list", "--count", "HEAD"], repo_path)
    if success:
        commit_count = int(out)
        
    return is_shallow, commit_count

def repair_repositories():
    cache_dir = r"c:\Users\lenovo\CodePulse AI\analysis-engine\repositories_cache"
    repos = []
    
    if os.path.exists(cache_dir):
        for entry in os.listdir(cache_dir):
            full_path = os.path.join(cache_dir, entry)
            if os.path.isdir(full_path) and os.path.isdir(os.path.join(full_path, ".git")):
                repos.append({"name": entry, "path": full_path})
                
    prisma_path = r"C:\repos\prisma"
    if os.path.exists(prisma_path) and os.path.isdir(os.path.join(prisma_path, ".git")):
        repos.append({"name": "prisma", "path": prisma_path})
        
    audit_results = []
    all_repaired = True
    
    for repo in repos:
        name = repo["name"]
        path = repo["path"]
        
        shallow_before, commits_before = check_repo(path)
        
        shallow_after = shallow_before
        commits_after = commits_before
        error_msg = None
        
        if shallow_before:
            print(f"Repairing shallow repository: {name}...")
            # Try unshallow
            success, err = run_git_cmd(["git", "fetch", "--unshallow"], path)
            if not success:
                print(f"git fetch --unshallow failed for {name}: {err}. Trying --all --tags")
                success2, err2 = run_git_cmd(["git", "fetch", "--all", "--tags"], path)
                if not success2:
                    print(f"Repair failed completely for {name}: {err2}")
                    error_msg = err2
                    all_repaired = False
            
            shallow_after, commits_after = check_repo(path)
            if shallow_after:
                print(f"WARNING: {name} is STILL shallow!")
                all_repaired = False
                
        audit_results.append({
            "repository": name,
            "path": path,
            "shallow_before": shallow_before,
            "shallow_after": shallow_after,
            "commits_before": commits_before,
            "commits_after": commits_after,
            "error": error_msg
        })
        
    audit_path = os.path.join(r"c:\Users\lenovo\CodePulse AI\analysis-engine\ml", "repository_history_audit.json")
    with open(audit_path, "w") as f:
        json.dump(audit_results, f, indent=4)
        
    return all_repaired, audit_path

if __name__ == "__main__":
    repaired, audit_file = repair_repositories()
    if repaired:
        print("ALL REPAIRED")
    else:
        print("REPAIR FAILED")
        sys.exit(1)
