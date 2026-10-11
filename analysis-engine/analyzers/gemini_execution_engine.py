import os
import sys
import json
import time
import csv
import traceback
from datetime import datetime

# Configure Failure Handling
def write_failure(reason, exception_details, stage, bundle_id=""):
    failure = {
        "failure_reason": reason,
        "exception_details": str(exception_details),
        "execution_stage": stage,
        "token_estimates": None,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "bundle_identifier": bundle_id
    }
    with open("review_execution_failure.json", "w") as f:
        json.dump(failure, f, indent=2)
    print(f"Execution Failed: {reason}")
    sys.exit(1)

def main():
    # 1. Load Bundles
    stage = "Loading Intelligence Context"
    try:
        with open("review_bundles.json", "r") as f:
            bundles = json.load(f)
        if not bundles:
            write_failure("Missing Data", "No review bundles found", stage)
        
        # Select the first top hotspot bundle for execution
        bundle = bundles[0]
        bundle_id = bundle.get("target_file", "unknown")
    except Exception as e:
        write_failure("Data Loading Failure", e, stage)

    # 2. Prompt Construction
    stage = "Prompt Construction"
    try:
        system_prompt = """
You are an advanced Architectural AI Code Reviewer.
Operating Mode: Architectural Intelligence Review Mode.
You are evaluating the current repository state of the Target File using the provided context.
You must NOT auto-approve or auto-reject code. Provide strictly risk assessments, recommendations, and confidence-weighted findings.
Every finding must include at least one entry in referenced_files. If the finding is based solely on the target file, the target file path must be included in referenced_files. Do not leave referenced_files empty.
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
        
        # Build Context String
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
        token_estimate = len(system_prompt + user_prompt) // 4
        
        # Output Prompt Snapshot
        snapshot = {
            "bundle_id": bundle_id,
            "target_file": bundle_id,
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
            "token_estimate": token_estimate,
            "bundle_statistics": {
                "base_tokens": bundle.get("base_tokens"),
                "total_tokens": bundle.get("total_tokens")
            }
        }
        with open("prompt_snapshot.json", "w") as f:
            json.dump(snapshot, f, indent=2)

    except Exception as e:
        write_failure("Prompt Construction Failure", e, stage, bundle_id)

    # 3. Provider API Execution
    stage = "Initialization & Auth"
    try:
        sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
        from llm.providers.provider_factory import ProviderFactory
        provider = ProviderFactory.get_provider()
    except Exception as e:
        write_failure("Provider Initialization Failure", e, stage, bundle_id)
        
    stage = "LLM Provider API Execution"
    start_time = time.time()
    try:
        review_json = provider.review(system_prompt, user_prompt)
        latency = time.time() - start_time
    except Exception as e:
        write_failure(f"LLM Provider API Error: {type(e).__name__}", e, stage, bundle_id)

    # 4. Evidence Validation Layer
    stage = "Evidence Validation"
    try:
        findings = review_json.get("findings", [])
        
        # Valid contextual files
        valid_files = set([f["file_path"] for f in bundle.get("context_payload", [])])
        valid_files.add(bundle_id)
        
        validation_report = []
        for finding in findings:
            refs = finding.get("referenced_files", [])
            valid_refs = []
            missing_refs = []
            for r in refs:
                if r in valid_files:
                    valid_refs.append(r)
                else:
                    missing_refs.append(r)
                    
            status = "validated"
            score = 1.0
            
            if not refs:
                status = "missing_citation"
                score = 0.0
            else:
                if missing_refs:
                    status = "partial" if valid_refs else "unsupported"
                    score = len(valid_refs) / len(refs) if refs else 0.0
                    
                # Semantic AST Validation
                valid_files_map = {f["file_path"]: f.get("source_excerpt", "") for f in bundle.get("context_payload", [])}
                valid_files_map[bundle_id] = bundle.get("primary_source", "")
                
                root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
                if root_dir not in sys.path:
                    sys.path.append(root_dir)
                from semantic_validator import validate_finding_semantics
                
                is_semantic_valid, failed_claims = validate_finding_semantics(finding, valid_files_map)
                if not is_semantic_valid:
                    status = "unsupported"
                    score = 0.0
                    finding["semantic_failures"] = failed_claims
                
            validation_report.append({
                "finding_id": finding.get("id"),
                "validation_status": status,
                "validated_references": valid_refs,
                "missing_references": missing_refs,
                "validation_score": score
            })
            
        with open("finding_validation_report.json", "w") as f:
            json.dump(validation_report, f, indent=2)
            
    except Exception as e:
        write_failure("Validation Engine Failure", e, stage, bundle_id)

    # 5. Output Generators
    stage = "Report Generation"
    try:
        with open("review_report.json", "w") as f:
            json.dump(review_json, f, indent=2)
            
        with open("review_summary.md", "w") as f:
            f.write(f"# Architectural Intelligence Review\n\n")
            f.write(f"**Target File:** {bundle_id}\n\n")
            for finding in findings:
                f.write(f"### {finding.get('id')} - {finding.get('category')} [{finding.get('severity')}]\n")
                f.write(f"**Confidence:** {finding.get('confidence')}\n\n")
                f.write(f"{finding.get('description')}\n\n")
                f.write(f"*Evidence:* {finding.get('evidence')}\n\n")
                f.write("---\n")
                
        with open("review_findings.csv", "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["ID", "Category", "Severity", "Confidence", "Description", "Referenced Files"])
            for finding in findings:
                writer.writerow([
                    finding.get('id'),
                    finding.get('category'),
                    finding.get('severity'),
                    finding.get('confidence'),
                    finding.get('description'),
                    "|".join(finding.get('referenced_files', []))
                ])
                
        with open("review_execution_log.json", "w") as f:
            json.dump({
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "target_file": bundle_id,
                "model_used": os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
                "latency_seconds": round(latency, 2),
                "tokens_consumed_estimate": token_estimate + len(json.dumps(review_json))//4,
                "finding_count": len(findings),
                "cost_estimate_usd": 0.00 # Placeholder
            }, f, indent=2)
            
    except Exception as e:
        write_failure("Report Generation Failure", e, stage, bundle_id)

    print("Phase 14 Execution Engine Complete")

if __name__ == "__main__":
    main()
