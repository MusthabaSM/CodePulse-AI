import os
import sys
import json
import time
from datetime import datetime, timezone

# Load env
env_path = r"c:\Users\lenovo\CodePulse AI\backend\.env"
if os.path.exists(env_path):
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if line.startswith("OPENROUTER_API_KEY="):
                os.environ["OPENROUTER_API_KEY"] = line.split("=", 1)[1].strip('"').strip("'")
            elif line.startswith("OPENROUTER_MODEL="):
                os.environ["OPENROUTER_MODEL"] = line.split("=", 1)[1].strip('"').strip("'")

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from llm.providers.openrouter_provider import OpenRouterProvider

def run():
    api_key = os.environ.get("OPENROUTER_API_KEY")
    model = os.environ.get("OPENROUTER_MODEL")
    
    report = {
        "api_key_detected": bool(api_key),
        "provider_initialized": False,
        "provider_executed": False,
        "model_used": model,
        "latency_ms": 0,
        "response_received": False,
        "json_valid": False,
        "execution_timestamp": datetime.now(timezone.utc).isoformat()
    }

    if not api_key:
        print("Missing OPENROUTER_API_KEY")
        with open("openrouter_live_validation_report.json", "w") as f:
            json.dump(report, f, indent=2)
        return

    try:
        provider = OpenRouterProvider()
        report["provider_initialized"] = True
        # If OPENROUTER_MODEL was missing in env but handled by default in provider:
        report["model_used"] = provider.model
    except Exception as e:
        print(f"Init failed: {e}")
        with open("openrouter_live_validation_report.json", "w") as f:
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
    
    report["provider_executed"] = True
    start_time = time.time()
    try:
        review_json = provider.review(system_prompt, user_prompt)
        end_time = time.time()
        
        report["latency_ms"] = int((end_time - start_time) * 1000)
        report["response_received"] = True
        
        if isinstance(review_json, dict) and "findings" in review_json:
            report["json_valid"] = True
        else:
            print(f"JSON returned is invalid for the engine: {review_json}")
            
    except Exception as e:
        print(f"Execution failed: {e}")
        report["error"] = str(e)
        
    with open("openrouter_live_validation_report.json", "w") as f:
        json.dump(report, f, indent=2)
        
    print("Validation finished.")

if __name__ == "__main__":
    run()
