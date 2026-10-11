import json

def test_score(bus_factor, ownership, c90, c180, bf_w=1.0, own_w=1.0):
    score = 100
    if bus_factor <= 1: score -= 40 * bf_w
    elif bus_factor == 2: score -= 20 * bf_w
    
    if ownership >= 0.8: score -= 30 * own_w
    elif ownership >= 0.6: score -= 10 * own_w
    
    activity_score = 0
    if c90 == 0 and c180 == 0:
        activity_score = 60
    elif c90 > 10:
        activity_score = -20
        
    score += activity_score
    if score < 0: score = 0
    if score > 100: score = 100
    return score

def classify_component(comp_name):
    low = comp_name.lower()
    if any(x in low for x in ['test', 'e2e', 'cypress', 'spec', 'mock', 'fixtures']):
        return "C) Test/QA"
    if any(x in low for x in ['docs', 'documentation', 'assets', 'public', 'static']):
        return "D) Documentation/Static"
    if any(x in low for x in ['build', 'dist', 'out', 'coverage', 'bin', 'scripts']):
        return "E) Build Artifact/Scripts"
    if any(x in low for x in ['vendor', 'generated', 'node_modules']):
        return "F) Generated Code"
    if any(x in low for x in ['config', '.github', '.circleci', 'infra', 'dev-infra']):
        return "B) Infrastructure"
    return "A) Core Business Logic"

def main():
    with open('knowledge_loss_report.json', 'r') as f:
        data = json.load(f)

    all_components = []
    for repo, repo_data in data.items():
        if "components" not in repo_data: continue
        for comp_name, comp_data in repo_data["components"].items():
            comp_data['repository'] = repo
            comp_data['component'] = comp_name
            all_components.append(comp_data)

    all_components.sort(key=lambda x: x['score'])
    
    criticals = [c for c in all_components if c['risk'] == 'Critical']
    highs = [c for c in all_components if c['risk'] == 'High']
    mediums = [c for c in all_components if c['risk'] == 'Medium']
    
    # 1. Exclusion Audit
    exclude_patterns = ['dist/', 'build/', 'docs/', 'documentation/', 'vendor/', 'generated/', 'fixtures/', 'tests/', 'test/', 'cypress/', 'examples/', 'coverage/']
    # Removing trailing slashes for simple substring matching
    exclude_patterns = [p.replace('/', '') for p in exclude_patterns]
    
    exclusion_violations = []
    for c in criticals + highs:
        low = c['component'].lower()
        for p in exclude_patterns:
            if p in low.split('/'):
                exclusion_violations.append({
                    "component": f"{c['repository']}/{c['component']}",
                    "risk": c['risk'],
                    "category": p
                })
                break
                
    # 2. Business Logic Audit
    def audit_bl(comp_list):
        dist = {"A) Core Business Logic": 0, "B) Infrastructure": 0, "C) Test/QA": 0, "D) Documentation/Static": 0, "E) Build Artifact/Scripts": 0, "F) Generated Code": 0}
        for c in comp_list:
            cls = classify_component(c['component'])
            dist[cls] += 1
        return {k: round((v/len(comp_list))*100, 1) if comp_list else 0 for k,v in dist.items()}

    bl_critical = audit_bl(criticals[:20])
    bl_high = audit_bl(highs[:20])
    bl_medium = audit_bl(mediums[:20])

    # 3. Active Maintenance Audit
    def audit_active(comp_list):
        dormant_count = sum(1 for c in comp_list if c.get('commits_180d', 0) == 0)
        total = len(comp_list)
        return {
            "active_percentage": round(((total - dormant_count) / total) * 100, 1) if total else 0,
            "dormant_percentage": round((dormant_count / total) * 100, 1) if total else 0
        }

    act_critical = audit_active(criticals[:20])
    act_high = audit_active(highs[:20])

    # 5. Ranking Stability Audit
    base_ranked = sorted(all_components, key=lambda x: test_score(x['bus_factor'], x['ownership'], x.get('commits_90d', 0), x.get('commits_180d', 0), 1.0, 1.0))
    bf_plus = sorted(all_components, key=lambda x: test_score(x['bus_factor'], x['ownership'], x.get('commits_90d', 0), x.get('commits_180d', 0), 1.1, 1.0))
    bf_minus = sorted(all_components, key=lambda x: test_score(x['bus_factor'], x['ownership'], x.get('commits_90d', 0), x.get('commits_180d', 0), 0.9, 1.0))
    own_plus = sorted(all_components, key=lambda x: test_score(x['bus_factor'], x['ownership'], x.get('commits_90d', 0), x.get('commits_180d', 0), 1.0, 1.1))
    own_minus = sorted(all_components, key=lambda x: test_score(x['bus_factor'], x['ownership'], x.get('commits_90d', 0), x.get('commits_180d', 0), 1.0, 0.9))

    def get_overlap(k, r1, r2):
        s1 = set(f"{x['repository']}/{x['component']}" for x in r1[:k])
        s2 = set(f"{x['repository']}/{x['component']}" for x in r2[:k])
        return round(len(s1.intersection(s2)) / k * 100, 1) if k > 0 else 100

    stability = {
        "BF_+10": {"Top 20": get_overlap(20, base_ranked, bf_plus), "Top 50": get_overlap(50, base_ranked, bf_plus), "Top 100": get_overlap(100, base_ranked, bf_plus)},
        "BF_-10": {"Top 20": get_overlap(20, base_ranked, bf_minus), "Top 50": get_overlap(50, base_ranked, bf_minus), "Top 100": get_overlap(100, base_ranked, bf_minus)},
        "OWN_+10": {"Top 20": get_overlap(20, base_ranked, own_plus), "Top 50": get_overlap(50, base_ranked, own_plus), "Top 100": get_overlap(100, base_ranked, own_plus)},
        "OWN_-10": {"Top 20": get_overlap(20, base_ranked, own_minus), "Top 50": get_overlap(50, base_ranked, own_minus), "Top 100": get_overlap(100, base_ranked, own_minus)}
    }

    # 6. Explainability Audit
    missing_fields = []
    required = ['score', 'risk', 'bus_factor', 'ownership', 'entropy', 'activity_score', 'reasons']
    for c in criticals:
        for r in required:
            if r not in c:
                missing_fields.append(f"{c['repository']}/{c['component']} missing {r}")

    out = {
        "1_exclusion_violations": len(exclusion_violations),
        "1_violations_list": exclusion_violations,
        "2_business_logic": {
            "Top 20 Critical": bl_critical,
            "Top 20 High": bl_high,
            "Top 20 Medium": bl_medium
        },
        "3_active_maintenance": {
            "Top 20 Critical": act_critical,
            "Top 20 High": act_high
        },
        "5_stability": stability,
        "6_explainability_missing": missing_fields
    }

    with open('adversarial_audit_9c.json', 'w') as f:
        json.dump(out, f, indent=2)

if __name__ == "__main__":
    main()
