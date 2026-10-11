import json

def classify_component(comp_name):
    low = comp_name.lower()
    if any(x in low for x in ['test', 'e2e', 'cypress', 'spec', 'mock', 'fixtures']):
        return "Test/QA"
    if any(x in low for x in ['docs', 'documentation', 'assets', 'public', 'static']):
        return "Documentation/Static"
    if any(x in low for x in ['build', 'dist', 'out', 'coverage', 'bin', 'scripts']):
        return "Build Artifact/Scripts"
    if any(x in low for x in ['vendor', 'generated', 'node_modules']):
        return "Generated Code"
    if any(x in low for x in ['config', '.github', '.circleci', 'infra', 'dev-infra']):
        return "Infrastructure"
    return "Core Business Logic"

def main():
    with open('temporal_coupling_report.json', 'r') as f:
        data = json.load(f)
        
    with open('coupling_clusters.json', 'r') as f:
        clusters = json.load(f)

    all_file_rels = []
    all_comp_rels = []
    total_repos = len(data)
    
    for repo, repo_data in data.items():
        all_file_rels.extend(repo_data.get('files', []))
        all_comp_rels.extend(repo_data.get('components', []))

    all_pairs = all_file_rels + all_comp_rels
    
    active_count = sum(1 for p in all_pairs if p['recent_co_changes_180_days'] > 0)
    active_rate = (active_count / len(all_pairs)) * 100 if all_pairs else 0
    
    bl_count = 0
    fp_keywords = ['dist', 'build', 'out', 'vendor', 'node_modules', 'test', 'tests', 'fixtures', 'docs', 'assets', 'e2e', 'spec', 'mocks', 'cypress', 'static', 'public', 'scripts']
    
    fp_count = 0
    strong = 0
    very_strong = 0
    
    for p in all_pairs:
        ea, eb = p['entity_a'], p['entity_b']
        ca, cb = classify_component(ea), classify_component(eb)
        if ca == "Core Business Logic" and cb == "Core Business Logic":
            bl_count += 1
            
        if any(kw in ea.lower() for kw in fp_keywords) or any(kw in eb.lower() for kw in fp_keywords):
            fp_count += 1
            
        if p['warning_level'] == 'Strong': strong += 1
        elif p['warning_level'] == 'Very Strong': very_strong += 1

    bl_rate = (bl_count / len(all_pairs)) * 100 if all_pairs else 0
    
    # Check that tests/build are 100% excluded (fp_count should be 0)
    # Actually wait, fp_count based on keywords checks things.
    
    all_pairs.sort(key=lambda x: max(x['current_coupling_score'], x['historical_coupling_score']), reverse=True)
    
    report = {
        "runtime_verification": {
            "repositories_analyzed": total_repos,
            "components_analyzed": len(set([p['entity_a'] for p in all_comp_rels] + [p['entity_b'] for p in all_comp_rels])),
            "file_relationships_analyzed": len(all_file_rels),
            "component_relationships_analyzed": len(all_comp_rels),
            "strongest_coupling_pairs": all_pairs[:10],
            "strongest_coupling_clusters": clusters[:5]
        },
        "quality_audit": {
            "active_relationship_percentage": active_rate,
            "business_logic_percentage": bl_rate,
            "strong_coupling_count": strong,
            "very_strong_coupling_count": very_strong,
            "tests_excluded": fp_count == 0,
            "build_artifacts_excluded": fp_count == 0,
            "generated_code_excluded": fp_count == 0
        },
        "final_classification": "A) Production Ready" if fp_count == 0 else "C) Significant False Positives"
    }

    with open('temporal_coupling_validation_report.json', 'w') as f:
        json.dump(report, f, indent=2)

if __name__ == "__main__":
    main()
