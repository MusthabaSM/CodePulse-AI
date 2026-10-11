import os
import sys
import json
import subprocess

root_dir = r"c:\Users\lenovo\CodePulse AI\analysis-engine"
analyzer_dir = os.path.join(root_dir, "analyzers")

def run():
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
    
    print("Executing real Gemini live review...")
    cmd = [sys.executable, "gemini_execution_engine.py"]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=analyzer_dir)
    
    if result.returncode != 0:
        print("Execution failed (likely quota error)!")
        
        # Read failure reason
        try:
            with open(os.path.join(analyzer_dir, "review_execution_failure.json"), "r") as f:
                failure = json.load(f)
                reason = failure.get("failure_reason", "Unknown")
        except:
            reason = "Unknown Execution Failure"
            
        report = {
            "total_findings": 0,
            "findings_with_target_file_citation": 0,
            "findings_with_empty_references": 0,
            "supported_findings": 0,
            "unsupported_findings": 0,
            "missing_citation_findings": 0,
            "classification": "B) Prompt Improvement Verified But Live Validation Pending",
            "failure_details": reason
        }
    else:
        print("Execution succeeded! Processing reports...")
        with open(os.path.join(analyzer_dir, "review_report.json"), "r") as f:
            review_json = json.load(f)
            
        with open(os.path.join(analyzer_dir, "finding_validation_report.json"), "r") as f:
            validation_report = json.load(f)
            
        with open(os.path.join(analyzer_dir, "review_bundles.json"), "r") as f:
            bundles = json.load(f)
        target_file = bundles[0].get("target_file")
            
        findings = review_json.get("findings", [])
        
        findings_with_target_file_citation = 0
        findings_with_empty_references = 0
        
        for f in findings:
            refs = f.get("referenced_files", [])
            if len(refs) == 0:
                findings_with_empty_references += 1
            elif target_file in refs:
                findings_with_target_file_citation += 1
                
        supported_findings = sum(1 for r in validation_report if r.get("validation_status") == "validated")
        unsupported_findings = sum(1 for r in validation_report if r.get("validation_status") in ("unsupported", "partial"))
        missing_citation_findings = sum(1 for r in validation_report if r.get("validation_status") == "missing_citation")
        
        report = {
            "total_findings": len(findings),
            "findings_with_target_file_citation": findings_with_target_file_citation,
            "findings_with_empty_references": findings_with_empty_references,
            "supported_findings": supported_findings,
            "unsupported_findings": unsupported_findings,
            "missing_citation_findings": missing_citation_findings
        }
        
        if findings_with_empty_references == 0 and missing_citation_findings == 0 and unsupported_findings == 0:
            report["classification"] = "A) Production Ready"
        else:
            report["classification"] = "C) Citation Issue Persists"
            
    out_path = os.path.join(root_dir, "live_citation_revalidation_report.json")
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2)
        
    print(f"Live Revalidation Complete. Classification: {report.get('classification')}")

if __name__ == "__main__":
    run()
