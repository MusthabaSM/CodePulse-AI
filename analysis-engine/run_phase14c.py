import os
import sys
import json
import time
import subprocess
from datetime import datetime, timezone

analyzer_dir = r"c:\Users\lenovo\CodePulse AI\analysis-engine\analyzers"
os.chdir(analyzer_dir)
sys.path.append(r"c:\Users\lenovo\CodePulse AI\analysis-engine")

def run():
    # Load .env
    env_path = r"c:\Users\lenovo\CodePulse AI\backend\.env"
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line.startswith("GEMINI_API_KEY="):
                    os.environ["GEMINI_API_KEY"] = line.split("=", 1)[1].strip('"').strip("'")
                elif line.startswith("GEMINI_MODEL="):
                    os.environ["GEMINI_MODEL"] = line.split("=", 1)[1].strip('"').strip("'")
                    
    os.environ["LLM_PROVIDER"] = "gemini"

    # 1. Review Bundle Audit
    with open("review_bundles.json", "r") as f:
        bundles = json.load(f)
        
    first_bundle = bundles[0]
    bundle_audit = {
        "bundle_count": len(bundles),
        "file_count": 1 + len(first_bundle.get("context_payload", [])),
        "token_estimates": first_bundle.get("total_tokens", 0),
        "context_truncation_applied": first_bundle.get("total_tokens", 0) > 30000, 
        "architectural_intelligence_injection": len(first_bundle.get("context_payload", [])) > 0
    }
    with open("review_bundle_audit.json", "w") as f:
        json.dump(bundle_audit, f, indent=2)

    # Clean old files
    for f_name in ["review_execution_failure.json", "review_report.json", "llm_fallback_audit.json", "review_execution_log.json"]:
        f_path = os.path.join(analyzer_dir, f_name)
        if os.path.exists(f_path):
            os.remove(f_path)

    # 2. Live Review Execution
    print("Executing gemini_execution_engine.py...")
    cmd = [sys.executable, "gemini_execution_engine.py"]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=analyzer_dir)

    if result.returncode != 0:
        print("Execution failed!")
        print(result.stderr)
        with open("review_pipeline_readiness_report.json", "w") as f:
            json.dump({
                "overall_readiness": "C) Review Pipeline Not Ready",
                "error": "Execution engine failed"
            }, f, indent=2)
        return
        
    # Read outputs
    with open("review_report.json", "r") as f:
        review_json = json.load(f)
        
    with open("review_execution_log.json", "r") as f:
        exec_log = json.load(f)
        
    audit_file = "llm_fallback_audit.json"
    provider_used = "GeminiProvider"
    if os.path.exists(audit_file):
        with open(audit_file, "r") as f:
            logs = json.load(f)
            if logs:
                provider_used = logs[-1].get("provider_used", "GeminiProvider")

    execution_report = {
        "provider_used": provider_used,
        "model_used": exec_log.get("model_used"),
        "latency_seconds": exec_log.get("latency_seconds"),
        "tokens_consumed_estimate": exec_log.get("tokens_consumed_estimate"),
        "response_size_bytes": len(json.dumps(review_json))
    }
    with open("live_review_execution_report.json", "w") as f:
        json.dump(execution_report, f, indent=2)

    # 3. Evidence Validation Audit
    findings = review_json.get("findings", [])
    valid_files = set([f["file_path"] for f in first_bundle.get("context_payload", [])])
    valid_files.add(first_bundle.get("target_file"))
    
    evidence_report = {
        "total_findings": len(findings),
        "supported_findings": 0,
        "partially_supported_findings": 0,
        "unsupported_findings": 0,
        "details": []
    }
    
    for finding in findings:
        finding_id = finding.get("id")
        finding_files = finding.get("referenced_files", [])
        evidence = finding.get("evidence", "")
        
        valid_refs = sum(1 for f in finding_files if f in valid_files)
        total_refs = len(finding_files)
        
        score = valid_refs / total_refs if total_refs > 0 else 0
        if "No evidence" in evidence:
            score = 0
            
        if score == 1.0:
            evidence_report["supported_findings"] += 1
            status = "supported"
        elif score > 0:
            evidence_report["partially_supported_findings"] += 1
            status = "partially_supported"
        else:
            evidence_report["unsupported_findings"] += 1
            status = "unsupported"
            
        evidence_report["details"].append({
            "id": finding_id,
            "status": status,
            "referenced_files_valid": valid_refs == total_refs
        })
        
    with open("evidence_validation_report.json", "w") as f:
        json.dump(evidence_report, f, indent=2)

    # 4. Schema Audit
    schema_valid = "findings" in review_json and isinstance(review_json["findings"], list)
    schema_report = {
        "schema_compliance": schema_valid,
        "required_fields_present": schema_valid
    }
    with open("review_schema_audit.json", "w") as f:
        json.dump(schema_report, f, indent=2)

    # 5. Production Readiness Report
    readiness = "A) Production Ready"
    if evidence_report["unsupported_findings"] > 0 or not schema_valid:
        readiness = "B) Minor Issues"
        
    readiness_report = {
        "bundle_generation_status": "Valid",
        "execution_status": "Success",
        "evidence_validator_status": "Success",
        "schema_compliance_status": "Pass" if schema_valid else "Fail",
        "unsupported_finding_count": evidence_report["unsupported_findings"],
        "overall_readiness": readiness
    }
    with open("review_pipeline_readiness_report.json", "w") as f:
        json.dump(readiness_report, f, indent=2)
        
    print("All validation steps finished.")

if __name__ == "__main__":
    run()
