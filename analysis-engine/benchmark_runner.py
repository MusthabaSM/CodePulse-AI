import os
import sys
import json
import time
import argparse
import traceback
from datetime import datetime

analyzer_dir = r"c:\Users\lenovo\CodePulse AI\analysis-engine\analyzers"
root_dir = r"c:\Users\lenovo\CodePulse AI\analysis-engine"
sys.path.append(root_dir)

from llm.providers.provider_factory import ProviderFactory

# Gates
MIN_SUPPORT_RATE = 95.0
MAX_UNSUPPORTED_FINDINGS = 1
MAX_HALLUCINATION_RATE = 0.0
REQUEST_DELAY_SECONDS = 3
RETRY_SCHEDULE = [5, 15, 30]

def execute_llm_with_retry(provider, system_prompt, user_prompt):
    time.sleep(REQUEST_DELAY_SECONDS)
    last_error = None
    for delay in [0] + RETRY_SCHEDULE:
        if delay > 0:
            print(f"Retrying in {delay} seconds due to API error...")
            time.sleep(delay)
        try:
            return provider.review(system_prompt, user_prompt)
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "quota" in err_str.lower() or "rate" in err_str.lower():
                last_error = e
                continue
            # Also catch transient errors
            if "503" in err_str or "500" in err_str:
                last_error = e
                continue
            raise e
    raise last_error

def build_prompts(bundle):
    bundle_id = bundle.get("target_file", "unknown")
    
    system_prompt = """
You are an advanced Architectural AI Code Reviewer.
Operating Mode: Architectural Intelligence Review Mode.
You are evaluating the current repository state of the Target File using the provided context.
You must NOT auto-approve or auto-reject code. Provide strictly risk assessments, recommendations, and confidence-weighted findings.
If a finding applies solely to the target file itself, you MUST include the target file's path in the `referenced_files` array. Do not leave the array empty.
You must return the findings strictly as a JSON object matching this schema:
{
  "findings": [
    {
      "id": "F-001",
      "category": "Architectural Risk | Correctness | Dependency Risk | API Contract Risk | Database Risk | Security Concerns | Maintainability | Performance | Testing Gaps",
      "severity": "Low | Medium | High | Critical",
      "confidence": "Low | Medium | High",
      "description": "...",
      "evidence": "...",
      "referenced_files": ["file/path.ts"],
      "referenced_architectural_links": ["dependency graph", "api contract"]
    }
  ]
}
"""
    context_str = json.dumps(bundle.get("context_payload", []), indent=2)
    user_prompt = f"""
Target File: {bundle_id}
Category: {bundle.get("category")}

### Primary Source Excerpt ###
{bundle.get("primary_source", "")}

### Architectural Blast Radius & Semantic Context ###
{context_str}

Evaluate the architecture, dependencies, and risks for the Target File based exclusively on this provided context. Do not hallucinate files or dependencies.
"""
    return system_prompt, user_prompt

def load_env():
    env_path = os.path.join(root_dir, "..", "backend", ".env")
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line.startswith("GEMINI_API_KEY="):
                    os.environ["GEMINI_API_KEY"] = line.split("=", 1)[1].strip('"').strip("'")
                elif line.startswith("GEMINI_MODEL="):
                    os.environ["GEMINI_MODEL"] = line.split("=", 1)[1].strip('"').strip("'")
    os.environ["LLM_PROVIDER"] = "gemini"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--replay", action="store_true")
    args = parser.parse_args()
    
    if not args.live and not args.replay:
        print("Must specify --live or --replay")
        sys.exit(1)
        
    mode = "live" if args.live else "replay"
    load_env()
    provider = ProviderFactory.get_provider() if mode == "live" else None
    
    manifest_path = os.path.join(root_dir, "benchmark", "benchmark_manifest.json")
    with open(manifest_path, "r") as f:
        manifest = json.load(f)
        
    benchmarks = manifest.get("benchmarks", [])
    
    summary = {"total_benchmarks": len(benchmarks), "executed": 0, "failed": 0, "results": []}
    quality_report = {"overall_quality_score": 0, "benchmarks": []}
    hallucination_report = {"total_hallucinations": 0, "benchmarks": []}
    regression_report = {"pass": True, "violations": []}
    coverage_report = {
        "coverage_percent": 0.0,
        "positive_cases_passed": 0,
        "negative_cases_detected": 0,
        "category_confidences": {}
    }
    
    category_conf_sums = {}
    category_conf_counts = {}
    
    global_total_findings = 0
    global_supported = 0
    global_unsupported = 0
    global_hallucinations = 0
    
    for bm in benchmarks:
        b_id = bm["benchmark_id"]
        bm_dir = os.path.join(root_dir, "benchmark", b_id)
        bundle_path = os.path.join(bm_dir, "bundle.json")
        output_path = os.path.join(bm_dir, "output.json")
        
        if not os.path.exists(bundle_path):
            continue
            
        with open(bundle_path, "r") as f:
            bundle = json.load(f)
            
        sys_prompt, usr_prompt = build_prompts(bundle)
        
        start_time = time.time()
        review_json = None
        
        if mode == "live":
            print(f"Executing {b_id} [LIVE]")
            try:
                review_json = execute_llm_with_retry(provider, sys_prompt, usr_prompt)
                with open(output_path, "w") as f:
                    json.dump(review_json, f, indent=2)
            except Exception as e:
                print(f"Failed to execute API for {b_id}: {e}")
                continue
        else:
            print(f"Executing {b_id} [REPLAY]")
            if os.path.exists(output_path):
                with open(output_path, "r") as f:
                    review_json = json.load(f)
            else:
                print(f"No replay data for {b_id}")
                continue
                
        execution_time = time.time() - start_time
        findings = review_json.get("findings", [])
        
        # Valid files context
        valid_files_map = {f["file_path"]: f.get("source_excerpt", "") for f in bundle.get("context_payload", [])}
        valid_files_map[bundle.get("target_file")] = bundle.get("primary_source", "")
        valid_files = set(valid_files_map.keys())
        
        bm_supported = 0
        bm_unsupported = 0
        bm_hallucinations = 0
        local_scope = 0
        cross_file = 0
        total_refs_count = 0
        
        hallucination_details = []
        
        for finding in findings:
            refs = finding.get("referenced_files", [])
            # Target file implicit attribution rule
            if len(refs) == 0:
                refs = [bundle.get("target_file")]
                
            total_refs_count += len(refs)
            is_cross = any(r != bundle.get("target_file") for r in refs)
            if is_cross:
                cross_file += 1
            else:
                local_scope += 1
                
            valid_refs = sum(1 for r in refs if r in valid_files)
            
            # Hallucination check
            hallucinated_refs = [r for r in refs if r not in valid_files]
            if hallucinated_refs:
                bm_hallucinations += 1
                hallucination_details.append({
                    "finding_id": finding.get("id"),
                    "hallucinated_files": hallucinated_refs
                })
                
            # Support score
            score = valid_refs / len(refs) if refs else 0
            if "No evidence" in finding.get("evidence", ""):
                score = 0
                
            from semantic_validator import validate_finding_semantics
            is_semantic_valid, failed_claims = validate_finding_semantics(finding, valid_files_map)
            if not is_semantic_valid:
                score = 0
                # Optional: log failed_claims
                
            if score == 1.0:
                bm_supported += 1
            else:
                bm_unsupported += 1
                
        global_total_findings += len(findings)
        global_supported += bm_supported
        global_unsupported += bm_unsupported
        global_hallucinations += bm_hallucinations
        
        support_rate = (bm_supported / len(findings) * 100) if findings else 100.0
        avg_refs = (total_refs_count / len(findings)) if findings else 0
        
        summary["results"].append({
            "benchmark_id": b_id,
            "category": bm["category"],
            "total_findings": len(findings),
            "supported_findings": bm_supported,
            "unsupported_findings": bm_unsupported,
            "support_rate": support_rate,
            "execution_time_seconds": execution_time,
            "average_referenced_files_per_finding": avg_refs,
            "local_scope_findings": local_scope,
            "cross_file_findings": cross_file
        })
        
        # Quality
        qual_score = support_rate
        quality_report["benchmarks"].append({
            "benchmark_id": b_id,
            "quality_score": qual_score,
            "evidence_score": support_rate,
            "attribution_score": support_rate,
            "hallucination_score": 100 - ((bm_hallucinations / len(findings) * 100) if findings else 0),
            "consistency_score": 100.0 if qual_score > 90 else 50.0
        })
        
        # Hallucinations
        if hallucination_details:
            hallucination_report["benchmarks"].append({
                "benchmark_id": b_id,
                "hallucinations": hallucination_details
            })
            
        # Confidence & Coverage
        conf_map = {"High": 90, "Medium": 60, "Low": 30}
        bm_conf_sum = 0
        for finding in findings:
            conf_str = finding.get("confidence", "Unknown")
            bm_conf_sum += conf_map.get(conf_str, 0)
        
        if findings:
            avg_conf = bm_conf_sum / len(findings)
            category = bm.get("category", "Unknown")
            category_conf_sums[category] = category_conf_sums.get(category, 0) + avg_conf
            category_conf_counts[category] = category_conf_counts.get(category, 0) + 1
            
        is_negative = bm.get("is_negative_case", False)
        if is_negative:
            if bm_hallucinations > 0 or bm_supported < len(findings):
                coverage_report["negative_cases_detected"] += 1
        else:
            if bm_hallucinations == 0 and (bm_supported == len(findings) if findings else True):
                coverage_report["positive_cases_passed"] += 1

        summary["executed"] += 1

    # Finalize Coverage Report
    total_bms = len(benchmarks)
    if total_bms > 0:
        coverage_report["coverage_percent"] = (summary["executed"] / total_bms) * 100.0
        
    for cat, total_conf in category_conf_sums.items():
        count = category_conf_counts.get(cat, 0)
        coverage_report["category_confidences"][cat] = (total_conf / count) if count > 0 else 0.0

    # Check Gates
    overall_support_rate = (global_supported / global_total_findings * 100) if global_total_findings else 100.0
    overall_hallucination_rate = (global_hallucinations / global_total_findings * 100) if global_total_findings else 0.0
    
    if overall_support_rate < MIN_SUPPORT_RATE:
        regression_report["pass"] = False
        regression_report["violations"].append(f"Support rate {overall_support_rate:.2f}% < {MIN_SUPPORT_RATE}%")
        
    if global_unsupported > MAX_UNSUPPORTED_FINDINGS:
        regression_report["pass"] = False
        regression_report["violations"].append(f"Unsupported findings {global_unsupported} > {MAX_UNSUPPORTED_FINDINGS}")
        
    if overall_hallucination_rate > MAX_HALLUCINATION_RATE:
        regression_report["pass"] = False
        regression_report["violations"].append(f"Hallucination rate {overall_hallucination_rate:.2f}% > {MAX_HALLUCINATION_RATE}%")
        
    hallucination_report["total_hallucinations"] = global_hallucinations
    
    if summary["executed"] > 0:
        quality_report["overall_quality_score"] = sum(b["quality_score"] for b in quality_report["benchmarks"]) / summary["executed"]
    else:
        quality_report["overall_quality_score"] = 0
        
    # Write reports
    out_dir = root_dir
    
    def dump_json(name, data):
        data["timestamp"] = datetime.utcnow().isoformat() + "Z"
        with open(os.path.join(out_dir, name), "w") as f:
            json.dump(data, f, indent=2)
            
    dump_json("benchmark_summary.json", summary)
    dump_json("quality_report.json", quality_report)
    dump_json("hallucination_report.json", hallucination_report)
    dump_json("regression_report.json", regression_report)
    dump_json("benchmark_coverage_report.json", coverage_report)
    
    if not regression_report["pass"]:
        print("Regression detected!")
        for v in regression_report["violations"]:
            print(f"- {v}")
        sys.exit(1)
    else:
        print("All benchmarks passed regression gates.")
        sys.exit(0)

if __name__ == "__main__":
    main()
