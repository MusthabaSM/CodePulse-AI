import json
import os
import shutil
import ijson
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def optimize():
    report_file = 'temporal_coupling_report.json'
    archive_file = 'temporal_coupling_archive.json'
    active_file = 'temporal_coupling_active.json'
    dashboard_file = 'temporal_coupling_dashboard.json'
    clusters_file = 'coupling_clusters.json'
    
    # 1. Archive Dataset
    if os.path.exists(report_file) and not os.path.exists(archive_file):
        shutil.move(report_file, archive_file)
        
    if not os.path.exists(archive_file):
        print(f"Error: {archive_file} not found.")
        return

    archive_size = os.path.getsize(archive_file)
    
    # Load clusters
    with open(clusters_file, 'r', encoding='utf-8') as f:
        clusters_data = json.load(f)
        
    cluster_files = set()
    if isinstance(clusters_data, dict):
        for k, v in clusters_data.items():
            for f in v: cluster_files.add(f)
    elif isinstance(clusters_data, list):
        for c in clusters_data:
            for f in c: cluster_files.add(f)

    active_data = {}
    dashboard_data = {}
    
    total_archived = 0
    total_active = 0
    
    top_dashboard_pairs = []

    print("Parsing archive and filtering...")
    with open(archive_file, 'rb') as f:
        parser = ijson.parse(f)
        current_obj = {}
        in_object = False
        
        for prefix, event, value in parser:
            if event == 'start_map':
                if prefix.endswith('.item') or prefix.endswith(']'):
                    current_obj = {}
                    in_object = True
            elif event == 'end_map' and in_object:
                if 'repository' in current_obj and 'entity_a' in current_obj:
                    total_archived += 1
                    
                    c_180 = current_obj.get('recent_co_changes_180_days', 0)
                    score = current_obj.get('current_coupling_score', 0)
                    ea = current_obj.get('entity_a')
                    eb = current_obj.get('entity_b')
                    repo = current_obj.get('repository')
                    rel_type = current_obj.get('type')
                    
                    is_in_cluster = (ea in cluster_files) or (eb in cluster_files)
                    is_active = (c_180 > 0)
                    is_strong = (score > 0.75)
                    
                    # displayed in dashboard implicitly if it's strong/active
                    if is_active or is_strong or is_in_cluster:
                        total_active += 1
                        
                        if repo not in active_data:
                            active_data[repo] = {"files": [], "components": []}
                        if rel_type == 'file':
                            active_data[repo]["files"].append(current_obj)
                        else:
                            active_data[repo]["components"].append(current_obj)
                            
                        if is_active:
                            top_dashboard_pairs.append(current_obj)
                            
                in_object = False
            elif in_object:
                key = prefix.split('.')[-1]
                current_obj[key] = value

    # 3. Dashboard Dataset
    top_dashboard_pairs.sort(key=lambda x: (x.get('current_coupling_score', 0), x.get('co_changes', 0)), reverse=True)
    top_100 = top_dashboard_pairs[:100]
    
    for obj in top_100:
        repo = obj.get('repository')
        if repo not in dashboard_data:
            dashboard_data[repo] = {"components": []}
        dashboard_data[repo]["components"].append(obj)

    dashboard_data["top_clusters"] = clusters_data[:10] if isinstance(clusters_data, list) else list(clusters_data.values())[:10]

    with open(active_file, 'w', encoding='utf-8') as f:
        json.dump(active_data, f, indent=2, cls=DecimalEncoder)
        
    with open(dashboard_file, 'w', encoding='utf-8') as f:
        json.dump(dashboard_data, f, indent=2, cls=DecimalEncoder)
        
    active_size = os.path.getsize(active_file)
    dashboard_size = os.path.getsize(dashboard_file)
    
    retention_percent = (total_active / total_archived * 100) if total_archived else 0
    active_reduction = ((archive_size - active_size) / archive_size * 100) if archive_size else 0
    dashboard_reduction = ((archive_size - dashboard_size) / archive_size * 100) if archive_size else 0

    classification = "A) Production Ready"
    if dashboard_size > 10 * 1024 * 1024:
        classification = "D) Redesign Required"
    elif retention_percent > 80:
        classification = "C) Significant Redundancy Remains"
    elif active_reduction < 50:
        classification = "B) Minor Optimization Needed"

    out = f"""--- TEMPORAL COUPLING VALIDATION REPORT ---
Archive Size: {archive_size / (1024*1024):.2f} MB
Active Dataset Size: {active_size / (1024*1024):.2f} MB
Dashboard Dataset Size: {dashboard_size / (1024*1024):.2f} MB
Percentage Reduction (Active): {active_reduction:.2f}%
Percentage Reduction (Dashboard): {dashboard_reduction:.2f}%
Relationship Retention: {total_active} / {total_archived} ({retention_percent:.2f}%)
Classification: {classification}
"""
    print(out)
    with open("optimize_11b_results.txt", "w") as f:
        f.write(out)

if __name__ == '__main__':
    optimize()
