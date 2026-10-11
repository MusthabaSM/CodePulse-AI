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
    with open('architectural_hotspots.json', 'r') as f:
        data = json.load(f)
        
    with open('architectural_hotspot_exclusions.json', 'r') as f:
        exclusions = json.load(f)

    all_components = []
    total_repos = len(data)
    total_comps = 0
    
    for repo, repo_data in data.items():
        total_comps += len(repo_data)
        for comp_name, comp_data in repo_data.items():
            all_components.append(comp_data)

    all_components.sort(key=lambda x: x['hotspot_score'], reverse=True)
    
    distribution = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for c in all_components:
        distribution[c['risk']] += 1

    top_20 = all_components[:20]
    
    fp_keywords = ['dist', 'build', 'out', 'vendor', 'node_modules', 'test', 'tests', 'fixtures', 'docs', 'assets', 'e2e', 'spec', 'mocks', 'cypress', 'static', 'public', 'scripts']
    fp_count = sum(1 for c in top_20 if any(kw in c['component'].lower() for kw in fp_keywords))
    fp_rate = (fp_count / len(top_20)) * 100 if top_20 else 0
    
    active_count = sum(1 for c in top_20 if c['metrics']['churn_180d'] > 0)
    active_rate = (active_count / len(top_20)) * 100 if top_20 else 0
    
    bl_count = sum(1 for c in top_20 if classify_component(c['component']) == "Core Business Logic")
    bl_rate = (bl_count / len(top_20)) * 100 if top_20 else 0
    
    passed = (fp_rate < 10) and (active_rate > 75) and (bl_rate > 90)
    
    report = {
        "runtime_verification": {
            "repositories_analyzed": total_repos,
            "components_analyzed": total_comps,
            "exclusions_applied": len(exclusions),
            "hotspot_score_distribution": distribution,
            "top_20_hotspots": [{"repository": c['repository'], "component": c['component'], "score": c['hotspot_score'], "risk": c['risk']} for c in top_20]
        },
        "quality_audit": {
            "false_positive_rate": fp_rate,
            "active_component_rate": active_rate,
            "business_logic_percentage": bl_rate
        },
        "final_classification": "A) Production Ready" if passed else "C) Significant False Positives Remaining"
    }

    with open('architectural_hotspots_validation_report.json', 'w') as f:
        json.dump(report, f, indent=2)

if __name__ == "__main__":
    main()
