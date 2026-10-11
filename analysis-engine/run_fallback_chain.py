import os
import sys
import json
import time
from datetime import datetime, timezone

# Load env but DO NOT load GEMINI_API_KEY
env_path = r"c:\Users\lenovo\CodePulse AI\backend\.env"
if os.path.exists(env_path):
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if line.startswith("OPENROUTER_API_KEY="):
                os.environ["OPENROUTER_API_KEY"] = line.split("=", 1)[1].strip('"').strip("'")
            elif line.startswith("OPENROUTER_MODEL="):
                os.environ["OPENROUTER_MODEL"] = "google/gemini-2.5-flash"
            elif line.startswith("GEMINI_MODEL="):
                os.environ["GEMINI_MODEL"] = line.split("=", 1)[1].strip('"').strip("'")

# Temporarily force GeminiProvider to fail by providing a bad API key
os.environ["GEMINI_API_KEY"] = "INVALID_KEY_TO_TRIGGER_FALLBACK"
os.environ["LLM_PROVIDER"] = "gemini" # Select gemini to trigger the fallback chain

# Change to analyzers directory to use existing audit log system seamlessly
analyzer_dir = r"c:\Users\lenovo\CodePulse AI\analysis-engine\analyzers"
os.chdir(analyzer_dir)
sys.path.append(r"c:\Users\lenovo\CodePulse AI\analysis-engine")

from llm.providers.provider_factory import ProviderFactory

def run():
    audit_file = "llm_fallback_audit.json"
    if os.path.exists(audit_file):
        os.remove(audit_file)

    report = {
        "gemini_failure_detected": False,
        "fallback_triggered": False,
        "fallback_provider": None,
        "model_used": None,
        "response_received": False,
        "schema_valid": False,
        "failure_reason": None
    }

    try:
        provider = ProviderFactory.get_provider()
    except Exception as e:
        print(f"Init failed: {e}")
        with open(r"c:\Users\lenovo\CodePulse AI\analysis-engine\fallback_chain_validation_report.json", "w") as f:
            json.dump(report, f, indent=2)
        return

    system_prompt = """
You are an advanced AI Code Reviewer.
You must return the findings strictly as a JSON object matching this schema:
{
  "findings": [
    {
      "id": "F-001",
      "description": "test finding"
    }
  ]
}
"""
    user_prompt = "Review this code: def test(): pass"
    
    print("Executing request...")
    try:
        review_json = provider.review(system_prompt, user_prompt)
        report["response_received"] = True
        
        if isinstance(review_json, dict) and "findings" in review_json:
            report["schema_valid"] = True
            
    except Exception as e:
        print(f"Execution failed: {e}")

    # Read audit log to verify what happened
    if os.path.exists(audit_file):
        with open(audit_file, "r") as f:
            logs = json.load(f)
            if logs:
                last_log = logs[-1]
                report["fallback_triggered"] = last_log.get("fallback_triggered")
                report["fallback_provider"] = last_log.get("fallback_provider")
                report["failure_reason"] = last_log.get("failure_reason")
                
                # If fallback was triggered and provider used was OpenRouterProvider, Gemini must have failed.
                if report["fallback_triggered"]:
                    report["gemini_failure_detected"] = True
                    report["model_used"] = os.environ.get("OPENROUTER_MODEL")
                else:
                    report["model_used"] = os.environ.get("GEMINI_MODEL")

    # Generate the report in the analysis-engine root
    with open(r"c:\Users\lenovo\CodePulse AI\analysis-engine\fallback_chain_validation_report.json", "w") as f:
        json.dump(report, f, indent=2)
        
    print("Validation finished.")

if __name__ == "__main__":
    run()
