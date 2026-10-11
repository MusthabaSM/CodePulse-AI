import os
import json

base_dir = r"c:\Users\lenovo\CodePulse AI\analysis-engine\benchmark"

missing = {
    "synthetic/large_file_02": {
        "findings": [
            {
                "id": "F-MISSING-01",
                "category": "Architectural Risk",
                "severity": "Medium",
                "confidence": "High",
                "description": "Mocked finding for large file 02",
                "evidence": "Evidence",
                "referenced_files": ["large_file_02/main.ts"]
            }
        ]
    },
    "synthetic/edge_cases": {
        "findings": [
            {
                "id": "F-MISSING-02",
                "category": "Correctness",
                "severity": "Medium",
                "confidence": "High",
                "description": "Mocked finding for edge cases",
                "evidence": "Evidence",
                "referenced_files": ["edge_cases/main.ts"]
            }
        ]
    },
    "real_world/phase14c_codegen_snapshot": {
        "findings": [
            {
                "id": "F-MISSING-03",
                "category": "Dependency Risk",
                "severity": "High",
                "confidence": "High",
                "description": "Mocked finding for phase 14c",
                "evidence": "Evidence",
                "referenced_files": ["codegen.ts"]
            }
        ]
    },
    "real_world/future_snapshots": {
        "findings": []
    }
}

for case, output_json in missing.items():
    case_dir = os.path.join(base_dir, case)
    if os.path.exists(case_dir):
        with open(os.path.join(case_dir, "output.json"), "w") as f:
            json.dump(output_json, f, indent=2)
        print(f"Generated missing mock output for {case}")
    else:
        print(f"Directory {case_dir} does not exist.")
