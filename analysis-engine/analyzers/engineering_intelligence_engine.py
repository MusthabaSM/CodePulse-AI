import json
import os
import sys

def normalize_scores(score_dict):
    if not score_dict:
        return {}
    
    values = list(score_dict.values())
    min_val = min(values)
    max_val = max(values)
    
    normalized = {}
    if max_val == min_val:
        for k, v in score_dict.items():
            normalized[k] = 0.0 if max_val == 0 else 100.0
    else:
        for k, v in score_dict.items():
            normalized[k] = ((v - min_val) / (max_val - min_val)) * 100.0
    return normalized

def get_risk_level(score):
    if score <= 25: return "Healthy"
    if score <= 50: return "Watch"
    if score <= 75: return "Elevated"
    return "Critical"

def generate_engineering_intelligence_report(repo_name, output_dir):
    knowledge_file = os.path.join(output_dir, "knowledge_loss_report.json")
    hotspots_file = os.path.join(output_dir, "architectural_hotspots.json") # Might not exist dynamically yet
    coupling_file = os.path.join(output_dir, "temporal_coupling_report.json")
    
    kl_data = {}
    if os.path.exists(knowledge_file):
        with open(knowledge_file, "r", encoding="utf-8") as f:
            kl_data = json.load(f)
            
    ah_data = {}
    if os.path.exists(hotspots_file):
        with open(hotspots_file, "r", encoding="utf-8") as f:
            ah_data = json.load(f)
            
    tc_data = {}
    if os.path.exists(coupling_file):
        with open(coupling_file, "r", encoding="utf-8") as f:
            tc_data = json.load(f)
            
    # We will build a unified component map: repo -> component -> raw_scores
    components = {}
    
    # 1. Process Knowledge Loss
    for repo, rdata in kl_data.items():
        if repo not in components: components[repo] = {}
        if "components" in rdata:
            for comp, cdata in rdata["components"].items():
                if comp not in components[repo]: components[repo][comp] = {"knowledge": 0, "hotspots": 0, "coupling": 0, "knowledge_explanations": [], "hotspots_explanations": [], "coupling_explanations": []}
                
                # Raw knowledge risk logic (bus_factor, ownership, entropy)
                bf = cdata.get("bus_factor", 10)
                own = cdata.get("ownership", 0.0)
                ent = cdata.get("entropy", 0.0)
                
                bf_risk = max(0, 100 - (bf * 10))
                own_risk = min(100, own * 100)
                ent_risk = min(100, ent * 10)
                
                raw_score = (bf_risk * 0.5) + (own_risk * 0.25) + (ent_risk * 0.25)
                components[repo][comp]["knowledge"] = raw_score
                
                exps = []
                if bf <= 2: exps.append(f"Critical bus factor ({bf})")
                elif bf <= 5: exps.append(f"Low bus factor ({bf})")
                if own > 0.5: exps.append(f"High ownership concentration ({own:.2f})")
                if ent > 4.0: exps.append(f"High author entropy ({ent:.2f})")
                if not exps: exps.append("Healthy knowledge distribution")
                components[repo][comp]["knowledge_explanations"] = exps

    # 2. Process Architectural Hotspots
    for repo, rdata in ah_data.items():
        if repo not in components: components[repo] = {}
        for comp, cdata in rdata.items():
            if comp not in components[repo]: components[repo][comp] = {"knowledge": 0, "hotspots": 0, "coupling": 0, "knowledge_explanations": ["No knowledge data"], "hotspots_explanations": [], "coupling_explanations": []}
            
            hs = cdata.get("hotspot_score", 0)
            cs = cdata.get("complexity_score", 0)
            chgs = cdata.get("change_score", 0)
            owns = cdata.get("ownership_score", 0)
            
            raw_score = (hs * 0.4) + (cs * 0.2) + (chgs * 0.2) + (owns * 0.2)
            components[repo][comp]["hotspots"] = raw_score
            
            exps = []
            if hs > 50: exps.append("High hotspot score")
            if cs > 50: exps.append("High complexity pressure")
            if chgs > 50: exps.append("High change pressure")
            if not exps: exps.append("Healthy architecture metrics")
            components[repo][comp]["hotspots_explanations"] = exps

    # 3. Process Temporal Coupling
    tc_clusters = tc_data.get("clusters", [])
    
    for repo, rdata in tc_data.items():
        if repo == "clusters" or repo == "top_clusters": continue
        if repo not in components: components[repo] = {}
        
        # Build component to file counts
        comp_couplings = {}
        for rel in rdata.get("files", []):
            ea = rel.get("entity_a", "")
            eb = rel.get("entity_b", "")
            sc = rel.get("current_coupling_score", 0)
            
            ca = ea.split('/')[0] if '/' in ea else ea
            cb = eb.split('/')[0] if '/' in eb else eb
            
            if ca:
                if ca not in comp_couplings: comp_couplings[ca] = {"count": 0, "max_score": 0, "clusters": set(), "density": 0}
                comp_couplings[ca]["count"] += 1
                comp_couplings[ca]["max_score"] = max(comp_couplings[ca]["max_score"], sc)
            if cb and cb != ca:
                if cb not in comp_couplings: comp_couplings[cb] = {"count": 0, "max_score": 0, "clusters": set(), "density": 0}
                comp_couplings[cb]["count"] += 1
                comp_couplings[cb]["max_score"] = max(comp_couplings[cb]["max_score"], sc)
                
        for comp, stats in comp_couplings.items():
            if comp not in components[repo]: components[repo][comp] = {"knowledge": 0, "hotspots": 0, "coupling": 0, "knowledge_explanations": ["No knowledge data"], "hotspots_explanations": ["No architecture data"], "coupling_explanations": []}
            
            # calculate cluster participation
            cluster_part = 0
            for cluster in tc_clusters:
                # check if any file in cluster starts with component
                if any(f.startswith(comp + '/') for f in cluster):
                    cluster_part += 1
                    
            stats["density"] = min(100, (stats["count"] / 20) * 100) # proxy for density
            cluster_risk = min(100, cluster_part * 20)
            count_risk = min(100, (stats["count"] / 50) * 100)
            strong_risk = stats["max_score"] * 100
            
            raw_score = (strong_risk * 0.4) + (count_risk * 0.2) + (cluster_risk * 0.2) + (stats["density"] * 0.2)
            components[repo][comp]["coupling"] = raw_score
            
            exps = []
            if stats["max_score"] > 0.8: exps.append(f"Very strong couplings ({stats['max_score']:.2f})")
            if stats["count"] > 20: exps.append(f"High number of couplings ({stats['count']})")
            if cluster_part > 0: exps.append(f"Participates in {cluster_part} top clusters")
            if not exps: exps.append("Healthy coupling metrics")
            components[repo][comp]["coupling_explanations"] = exps

    # Generate Report
    report = {}
    
    top_kl_components = []
    top_hs_components = []
    top_cp_components = []
    all_components = []
    
    for repo, comps in components.items():
        if not comps: continue
        
        # Normalize per repo
        kl_scores = {c: data["knowledge"] for c, data in comps.items()}
        hs_scores = {c: data["hotspots"] for c, data in comps.items()}
        cp_scores = {c: data["coupling"] for c, data in comps.items()}
        
        kl_norm = normalize_scores(kl_scores)
        hs_norm = normalize_scores(hs_scores)
        cp_norm = normalize_scores(cp_scores)
        
        report[repo] = {}
        for c, data in comps.items():
            kn = kl_norm[c]
            hn = hs_norm[c]
            cn = cp_norm[c]
            
            score = (kn * 0.35) + (hn * 0.40) + (cn * 0.25)
            
            # Use raw scores for top components just to identify subsystem tops (or normalized, doesn't matter much within a repo, but globally normalized is better)
            top_kl_components.append((kn, repo, c))
            top_hs_components.append((hn, repo, c))
            top_cp_components.append((cn, repo, c))
            all_components.append((score, repo, c))
            
            exps = data.get("knowledge_explanations", []) + data.get("hotspots_explanations", []) + data.get("coupling_explanations", [])
            if "No coupling data" not in exps and not data.get("coupling_explanations"):
                exps.append("No active couplings")
            
            report[repo][c] = {
                "repository": repo,
                "component": c,
                "knowledge_risk_score": round(kn, 2),
                "architectural_risk_score": round(hn, 2),
                "coupling_risk_score": round(cn, 2),
                "engineering_intelligence_score": round(score, 2),
                "risk_level": get_risk_level(score),
                "knowledge_contribution": round(kn * 0.35, 2),
                "architecture_contribution": round(hn * 0.40, 2),
                "coupling_contribution": round(cn * 0.25, 2),
                "explanations": exps
            }
            
    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, "engineering_intelligence_report.json"), "w") as f:
        json.dump(report, f, indent=2)

    print("Engineering Intelligence Score Generation Complete")

def main():
    pass

if __name__ == '__main__':
    main()
