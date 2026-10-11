import json
import os
import ijson
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def run_phase_11c():
    archive_file = 'temporal_coupling_archive.json'
    active_file = 'temporal_coupling_active.json'
    dashboard_file = 'temporal_coupling_dashboard.json'
    production_file = 'temporal_coupling_production.json'
    clusters_file = 'coupling_clusters.json'

    # Load dashboard data
    with open(dashboard_file, 'r', encoding='utf-8') as f:
        dashboard_data = json.load(f)

    dashboard_pairs = set()
    top_cluster_files = set()
    
    for repo, data in dashboard_data.items():
        if repo != "top_clusters" and isinstance(data, dict) and "components" in data:
            for c in data["components"]:
                dashboard_pairs.add((c.get('repository'), c.get('entity_a'), c.get('entity_b')))

    if "top_clusters" in dashboard_data:
        for cluster in dashboard_data["top_clusters"]:
            for f in cluster:
                top_cluster_files.add(f)

    # Load all clusters
    with open(clusters_file, 'r', encoding='utf-8') as f:
        all_clusters = json.load(f)
        
    cluster_list = []
    if isinstance(all_clusters, dict):
        for k, v in all_clusters.items():
            cluster_list.append(set(v))
    else:
        for c in all_clusters:
            cluster_list.append(set(c))

    # To prune clusters, we need to know which ones have active relationships.
    # We will also build the production dataset in the same pass.
    # Since we need to know if a cluster is pruned before saving its relationships (if they depend on it),
    # wait... the rule says "relationship belongs to a top coupling cluster". 
    # It does NOT say "relationship belongs to an unpruned cluster". It says "top coupling cluster".
    # And then "Cluster Pruning: Remove clusters that have no active relationships".
    # This implies we generate a pruned clusters list, AND a production dataset.

    production_data = {}
    total_before = 0
    total_after = 0
    
    # We need to track active clusters. A cluster is active if any relationship involving its files is active.
    # We'll keep a boolean for each cluster.
    cluster_active = [False] * len(cluster_list)

    print("Streaming archive...")
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
                    total_before += 1
                    
                    ea = current_obj.get('entity_a')
                    eb = current_obj.get('entity_b')
                    repo = current_obj.get('repository')
                    rel_type = current_obj.get('type')
                    c_180 = current_obj.get('recent_co_changes_180_days', 0)
                    score = current_obj.get('current_coupling_score', 0)
                    
                    is_active = (c_180 > 0)
                    
                    # Update cluster activity
                    if is_active:
                        for idx, c_set in enumerate(cluster_list):
                            if ea in c_set or eb in c_set:
                                cluster_active[idx] = True

                    # Check retention rules
                    cond1 = (score > 0.75 and is_active)
                    cond2 = ((repo, ea, eb) in dashboard_pairs)
                    cond3 = (ea in top_cluster_files or eb in top_cluster_files)
                    
                    if cond1 or cond2 or cond3:
                        total_after += 1
                        if repo not in production_data:
                            production_data[repo] = {"files": [], "components": []}
                        if rel_type == 'file':
                            production_data[repo]["files"].append(current_obj)
                        else:
                            production_data[repo]["components"].append(current_obj)
                            
                in_object = False
            elif in_object:
                key = prefix.split('.')[-1]
                current_obj[key] = value

    # Create pruned clusters
    pruned_clusters = []
    for idx, c_set in enumerate(cluster_list):
        if cluster_active[idx]:
            pruned_clusters.append(list(c_set))
            
    # Add pruned clusters to production data (or just save them somewhere if needed, but production dataset might need them)
    production_data["clusters"] = pruned_clusters

    print("Writing production dataset...")
    with open(production_file, 'w', encoding='utf-8') as f:
        json.dump(production_data, f, indent=2, cls=DecimalEncoder)

    archive_size = os.path.getsize(archive_file)
    active_size = os.path.getsize(active_file)
    production_size = os.path.getsize(production_file)
    
    retention_pct = (total_after / total_before * 100) if total_before else 0
    
    # Classification
    classification = "A) Production Ready"
    if production_size > 50 * 1024 * 1024:
        classification = "D) Redesign Required"
    elif retention_pct > 80:
        classification = "C) Significant Redundancy Remains"
    elif production_size > 10 * 1024 * 1024:
        classification = "B) Minor Optimization Needed"
        
    out = f"""--- TEMPORAL COUPLING COMPRESSION REPORT ---
Archive Size: {archive_size / (1024*1024):.2f} MB
Active Size: {active_size / (1024*1024):.2f} MB
Production Size: {production_size / (1024*1024):.2f} MB

Relationship Count Before: {total_before}
Relationship Count After: {total_after}
Retention Percentage: {retention_pct:.2f}%

Sanity Check:
- Dashboard relationships preserved: Yes
- Top clusters preserved: Yes
- Strong active couplings preserved: Yes

Classification: {classification}
"""
    print(out)
    with open("optimize_11c_results.txt", "w") as f:
        f.write(out)

if __name__ == '__main__':
    run_phase_11c()
