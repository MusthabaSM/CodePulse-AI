
import os
import shutil
import tempfile
import subprocess
import pandas as pd
import numpy as np
from collections import defaultdict
from pydriller import Repository

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from tech_debt_engine import TechnicalDebtEngine
from main import is_bug_fix, calculate_entropy

class VeryFastDataExtractor:
    def __init__(self, repositories):
        self.repositories = repositories
        self.tech_engine = TechnicalDebtEngine()

    def extract_data(self):
        all_data = []

        for repo_url in self.repositories:
            print(f'Extracting data from {repo_url}...')
            temp_dir = tempfile.mkdtemp()
            repo_path = os.path.join(temp_dir, 'repo')
            try:
                subprocess.run(['git', 'clone', '--depth', '50', repo_url, repo_path], check=True)
                
                commits = list(Repository(repo_path).traverse_commits())
                if not commits: continue
                    
                split_idx = int(len(commits) * 0.6)
                t_commit = commits[split_idx]
                
                file_metrics = defaultdict(lambda: {
                    'churn_count': 0, 'bug_fix_count': 0, 'authors': defaultdict(int)
                })

                for i in range(split_idx + 1):
                    commit = commits[i]
                    current_author = commit.author.email
                    is_bf = is_bug_fix(commit.msg)
                    for modified_file in commit.modified_files:
                        path = modified_file.new_path or modified_file.old_path
                        if path:
                            path = path.replace('\\\\', '/')
                            file_metrics[path]['churn_count'] += 1
                            file_metrics[path]['authors'][current_author] += 1
                            if is_bf: file_metrics[path]['bug_fix_count'] += 1

                future_bugs = defaultdict(int)
                for i in range(split_idx + 1, len(commits)):
                    commit = commits[i]
                    is_bf = is_bug_fix(commit.msg)
                    if is_bf:
                        for modified_file in commit.modified_files:
                            path = modified_file.new_path or modified_file.old_path
                            if path:
                                path = path.replace('\\\\', '/')
                                future_bugs[path] += 1

                subprocess.run(['git', 'checkout', t_commit.hash], cwd=repo_path, check=True, capture_output=True)

                for root, _, files in os.walk(repo_path):
                    if '.git' in root: continue
                    for file in files:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, repo_path).replace('\\\\', '/')
                        
                        if rel_path not in file_metrics: continue

                        try:
                            with open(full_path, 'r', encoding='utf-8') as f:
                                code_content = f.read()
                        except Exception: continue

                        vcs = file_metrics[rel_path]
                        entropy = calculate_entropy(vcs['authors'])
                        
                        metrics = self.tech_engine.lizard_adapter.analyze_file(rel_path, code_content)
                        cc = metrics.get('cyclomatic_complexity', 0)
                        nloc = metrics.get('nloc', 0)

                        future_bug = 1 if future_bugs[rel_path] > 0 else 0

                        if nloc > 0:
                            all_data.append({
                                'repository': repo_url.split('/')[-1],
                                'file_path': rel_path,
                                'churn_count': vcs['churn_count'],
                                'bug_fix_count': vcs['bug_fix_count'],
                                'author_entropy': entropy,
                                'cyclomatic_complexity': cc,
                                'nloc': nloc,
                                'future_bug': future_bug
                            })
            except Exception as e:
                print(f'Error processing {repo_url}: {e}')
            finally:
                shutil.rmtree(temp_dir, ignore_errors=True)

        df = pd.DataFrame(all_data)
        out_path = os.path.join(os.path.dirname(__file__), 'training_data.csv')
        df.to_csv(out_path, index=False)
        print(f'Saved {len(df)} samples to {out_path}')
        return df

if __name__ == '__main__':
    extractor = VeryFastDataExtractor([
        'https://github.com/expressjs/express',
        'https://github.com/tiangolo/fastapi',
        'https://github.com/nestjs/nest',
        'https://github.com/socketio/socket.io'
    ])
    extractor.extract_data()

