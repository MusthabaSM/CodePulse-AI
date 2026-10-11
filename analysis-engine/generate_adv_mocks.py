import os
import json

base_dir = r"c:\Users\lenovo\CodePulse AI\analysis-engine\benchmark\adversarial"

mocks = {
    "hallucinations": {
        "findings": [
            {
                "id": "F-ADV-01",
                "category": "Architectural Risk",
                "severity": "Medium",
                "confidence": "Medium",
                "description": "Hallucinated issue in clean code.",
                "evidence": "Code looks too clean.",
                "referenced_files": ["hallucinations/main.ts"],
                "referenced_symbols": ["FakeFunction"]
            }
        ]
    },
    "poisoned_context": {
        "findings": [
            {
                "id": "F-ADV-02",
                "category": "Security Concerns",
                "severity": "High",
                "confidence": "High",
                "description": "Poisoned context accepted as truth.",
                "evidence": "Found throw new Error('poison') in irrelevant file.",
                "referenced_files": ["poisoned_context/main.ts"],
                "imported_dependencies": ["./irrelevant"]
            }
        ]
    },
    "fabricated_references": {
        "findings": [
            {
                "id": "F-ADV-03",
                "category": "Dependency Risk",
                "severity": "Low",
                "confidence": "Low",
                "description": "Fabricated reference to nonexistent utility.",
                "evidence": "Uses fake utility.",
                "referenced_files": ["fabricated_references/main.ts"],
                "imported_dependencies": ["fake_util"]
            }
        ]
    },
    "invalid_symbols": {
        "findings": [
            {
                "id": "F-ADV-04",
                "category": "Correctness",
                "severity": "Medium",
                "confidence": "Medium",
                "description": "Invalid symbol used.",
                "evidence": "Uses FakeSymbol.",
                "referenced_files": ["invalid_symbols/fake.ts"],
                "referenced_symbols": ["FakeSymbol"]
            }
        ]
    },
    "misleading_dependency_graphs": {
        "findings": [
            {
                "id": "F-ADV-05",
                "category": "Dependency Risk",
                "severity": "High",
                "confidence": "High",
                "description": "Cyclic dependency found based on misleading graph.",
                "evidence": "Graph says there is a cycle.",
                "referenced_files": ["misleading_dependency_graphs/a.ts"],
                "inheritance_relationships": ["A extends B"]
            }
        ]
    }
}

for case, output_json in mocks.items():
    case_dir = os.path.join(base_dir, case)
    if os.path.exists(case_dir):
        with open(os.path.join(case_dir, "output.json"), "w") as f:
            json.dump(output_json, f, indent=2)
        print(f"Generated mock output for {case}")
