import os
import sys
import json
import time
import subprocess
from datetime import datetime, timezone

analyzer_dir = r"c:\Users\lenovo\CodePulse AI\analysis-engine\analyzers"
root_dir = r"c:\Users\lenovo\CodePulse AI\analysis-engine"
sys.path.append(root_dir)

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

    # Read Before Metrics
    before_report_path = os.path.join(root_dir, "evidence_validation_report.json")
    with open(before_report_path, "r") as f:
        before_report = json.load(f)
        
    supported_before = before_report.get("supported_findings", 0)
    unsupported_before = before_report.get("unsupported_findings", 0)

    os.chdir(analyzer_dir)
    
    # Run the engine
    print("Executing gemini_execution_engine.py...")
    cmd = [sys.executable, "gemini_execution_engine.py"]
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=analyzer_dir)

    if result.returncode != 0:
        print("Execution failed!")
        print(result.stderr)
        return
        
    # Read Validation Output
    with open("finding_validation_report.json", "r") as f:
        validation_report = json.load(f)
        
    with open("review_report.json", "r") as f:
        review_json = json.load(f)
        
    findings = review_json.get("findings", [])
    
    supported_after = sum(1 for r in validation_report if r.get("validation_status") == "validated")
    unsupported_after = sum(1 for r in validation_report if r.get("validation_status") in ("unsupported", "partial"))
    missing_citation_after = sum(1 for r in validation_report if r.get("validation_status") == "missing_citation")
            
    # Generate Remediation Report
    report = {
        "total_findings": len(findings),
        "supported_findings_before": supported_before,
        "supported_findings_after": supported_after,
        "unsupported_findings_before": unsupported_before,
        "unsupported_findings_after": unsupported_after,
        "missing_citation_before": 0,
        "missing_citation_after": missing_citation_after
    }
    
    if supported_after == len(findings) and unsupported_after == 0 and missing_citation_after == 0:
        report["classification"] = "A) Production Ready"
    elif missing_citation_after > 0:
        report["classification"] = "B) Remaining Citation Issues"
    else:
        report["classification"] = "C) Validation Defect"
        
    out_path = os.path.join(root_dir, "evidence_validation_remediation_report.json")
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2)
        
    print(f"Remediation Validation Complete. Classification: {report['classification']}")

if __name__ == "__main__":
    run()
