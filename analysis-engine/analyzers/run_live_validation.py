import os
import json
import time
import sys
import subprocess
from datetime import datetime

# Ensure we're in the right directory
analyzer_dir = r"c:\Users\lenovo\CodePulse AI\analysis-engine\analyzers"

# Read the .env file from backend
env_path = r"c:\Users\lenovo\CodePulse AI\backend\.env"
if os.path.exists(env_path):
    with open(env_path, "r") as f:
        for line in f:
            if line.startswith("GEMINI_API_KEY="):
                os.environ["GEMINI_API_KEY"] = line.strip().split("=", 1)[1].strip('"').strip("'")
            elif line.startswith("GEMINI_MODEL="):
                os.environ["GEMINI_MODEL"] = line.strip().split("=", 1)[1].strip('"').strip("'")

os.environ["LLM_PROVIDER"] = "gemini"

# Cleanup old files
for f_name in ["review_execution_failure.json", "review_report.json", "llm_fallback_audit.json"]:
    f_path = os.path.join(analyzer_dir, f_name)
    if os.path.exists(f_path):
        os.remove(f_path)

start_time = time.time()
request_timestamp = datetime.utcnow().isoformat() + "Z"

print("Executing gemini_execution_engine.py...")
cmd = [sys.executable, "gemini_execution_engine.py"]
result = subprocess.run(cmd, capture_output=True, text=True, cwd=analyzer_dir)

end_time = time.time()
latency_ms = int((end_time - start_time) * 1000)

failure_file = os.path.join(analyzer_dir, "review_execution_failure.json")
if result.returncode != 0 or os.path.exists(failure_file):
    error_details = "Execution failed."
    if os.path.exists(failure_file):
        with open(failure_file, "r") as f:
            error_details = json.load(f)
            
    failure_report = {
        "error": "Engine Execution Failed",
        "details": error_details,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    with open(os.path.join(analyzer_dir, "llm_live_failure_report.json"), "w") as f:
        json.dump(failure_report, f, indent=2)
    print("Execution failed. Generated llm_live_failure_report.json")
    sys.exit(1)

# Check outputs of gemini_execution_engine.py
try:
    with open(os.path.join(analyzer_dir, "review_report.json"), "r") as f:
        review_json = json.load(f)
        
    audit_file = os.path.join(analyzer_dir, "llm_fallback_audit.json")
    fallback_triggered = False
    provider_used = "GeminiProvider"
    if os.path.exists(audit_file):
        with open(audit_file, "r") as f:
            logs = json.load(f)
            if logs:
                fallback_triggered = logs[-1].get("fallback_triggered", False)
                provider_used = logs[-1].get("provider_used", "GeminiProvider")
                
    schema_valid = "findings" in review_json
    
    report = {
        "live_execution": True,
        "provider": provider_used,
        "model": os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
        "latency_ms": latency_ms,
        "response_received": True,
        "schema_valid": schema_valid,
        "fallback_triggered": fallback_triggered,
        "execution_timestamp": request_timestamp
    }
    
    with open(os.path.join(analyzer_dir, "llm_live_validation_report.json"), "w") as f:
        json.dump(report, f, indent=2)
        
    print("Execution succeeded. Generated llm_live_validation_report.json")
except Exception as e:
    failure_report = {
        "error": f"Failed to parse results: {e}",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    with open(os.path.join(analyzer_dir, "llm_live_failure_report.json"), "w") as f:
        json.dump(failure_report, f, indent=2)
    print(f"Execution succeeded but parsing failed: {e}")
    sys.exit(1)
