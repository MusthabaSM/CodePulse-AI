import json

def main():
    report_path = 'knowledge_loss_report.json'
    with open(report_path, 'r') as f:
        data = json.load(f)

    components = []
    
    for repo, repo_data in data.items():
        if "components" not in repo_data: continue
        for comp_name, comp_data in repo_data["components"].items():
            comp_data['repository'] = repo
            comp_data['component'] = comp_name
            components.append(comp_data)

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
            
    fp_rate = (fp_count / len(top_100)) * 100 if top_100 else 0

    # Active Maintenance Audit
    inactive_count = 0
    critical_list = [c for c in components if c.get('risk') == 'Critical']
    
    for c in critical_list:
        c90 = c.get('commits_90d', 0)
        if c90 == 0:
            inactive_count += 1

    inactive_rate = (inactive_count / len(critical_list)) * 100 if critical_list else 0
    
    out = {
        "before": {
            "false_positive_rate": 25.75,
            "inactive_component_rate": 80.0
        },
        "after": {
            "false_positive_rate": fp_rate,
            "inactive_component_rate": inactive_rate
        },
        "success_criteria_met": fp_rate < 10 and inactive_rate < 25,
        "final_classification": "A) Production Ready" if (fp_rate < 10 and inactive_rate < 25) else "B) Minor Tuning Needed"
    }

    with open('knowledge_loss_refinement_report.json', 'w') as f:
        json.dump(out, f, indent=2)

if __name__ == "__main__":
    main()
