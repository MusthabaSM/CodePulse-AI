import os
import json

base_dir = r"c:\Users\lenovo\CodePulse AI\analysis-engine\benchmark"

synthetic_cases = [
    "local_issue_01",
    "local_issue_02",
    "cross_file_issue_01",
    "dependency_issue_01",
    "no_issue_01",
    "generated_code_01",
    "large_file_01",
    "large_file_02",
    "edge_cases"
]

adversarial_cases = [
    "hallucinations",
    "poisoned_context",
    "fabricated_references",
    "invalid_symbols",
    "misleading_dependency_graphs"
]

real_world_cases = [
    "phase14c_codegen_snapshot",
    "future_snapshots"
]

manifest = {
    "benchmarks": []
}

def create_bundle(target_file, primary_source, context_payload, base_tokens=100, total_tokens=150, category="Top Hotspot"):
    return {
        "target_file": target_file,
        "repository": "synthetic",
        "category": category,
        "base_tokens": base_tokens,
        "total_tokens": total_tokens,
        "primary_source": primary_source,
        "context_payload": context_payload
    }

def add_manifest_entry(b_id, category, desc, count_range, supp_rate=100.0, unsupp_rate=0.0, local_refs=0, cross_refs=0, hall_rate=0.0, is_negative_case=False):
    manifest["benchmarks"].append({
        "benchmark_id": b_id,
        "category": category,
        "description": desc,
        "expected_finding_count_range": count_range,
        "expected_supported_rate": supp_rate,
        "expected_unsupported_rate": unsupp_rate,
        "expected_local_references": local_refs,
        "expected_cross_file_references": cross_refs,
        "expected_hallucination_rate": hall_rate,
        "is_negative_case": is_negative_case
    })

os.makedirs(base_dir, exist_ok=True)

# 1. Synthetic
synth_dir = os.path.join(base_dir, "synthetic")
os.makedirs(synth_dir, exist_ok=True)

for case in synthetic_cases:
    case_dir = os.path.join(synth_dir, case)
    os.makedirs(case_dir, exist_ok=True)
    
    target_file = f"{case}/main.ts"
    primary_source = f"// Placeholder for {case}\nconst test = 'value';"
    context = []
    expected_findings = [1, 3]
    local_refs = 1
    cross_refs = 0
    
    if case == "local_issue_01":
        primary_source = "function process(x) { if (x === null) { /* no guard */ } return x.value; }"
        desc = "Local issue: missing null check"
    elif case == "cross_file_issue_01":
        primary_source = "import { Config } from './config';\nconsole.log(Config.missingProp);"
        context = [{"file_path": f"{case}/config.ts", "relevance_score": 1.0, "tokens": 50, "source_excerpt": "export const Config = { present: true };"}]
        desc = "Cross file: missing property"
        cross_refs = 1
    elif case == "no_issue_01":
        primary_source = "export const PI = 3.14159;"
        desc = "No issue"
        expected_findings = [0, 0]
        local_refs = 0
    elif case == "generated_code_01":
        primary_source = "/* THIS FILE IS AUTO-GENERATED */\nexport const x = 1;"
        desc = "Generated code (should have few or no findings)"
        expected_findings = [0, 1]
    else:
        desc = f"Synthetic {case}"
        
    bundle = create_bundle(target_file, primary_source, context)
    with open(os.path.join(case_dir, "bundle.json"), "w") as f:
        json.dump(bundle, f, indent=2)
        
    add_manifest_entry(
        f"synthetic/{case}",
        "Synthetic",
        desc,
        expected_findings,
        supp_rate=100.0,
        unsupp_rate=0.0,
        local_refs=local_refs,
        cross_refs=cross_refs,
        hall_rate=0.0,
        is_negative_case=False
    )

# 2. Adversarial
adv_dir = os.path.join(base_dir, "adversarial")
os.makedirs(adv_dir, exist_ok=True)

for case in adversarial_cases:
    case_dir = os.path.join(adv_dir, case)
    os.makedirs(case_dir, exist_ok=True)
    
    target_file = f"{case}/main.ts"
    primary_source = f"// {case} adversarial test\n"
    context = []
    
    if case == "hallucinations":
        primary_source += "function noOp() {}"
        desc = "Attempt to force hallucination on clean code"
    elif case == "poisoned_context":
        primary_source += "import { auth } from './auth'; auth();"
        context = [{"file_path": f"{case}/irrelevant.ts", "relevance_score": 0.1, "tokens": 50, "source_excerpt": "export function doSomethingElse() { throw new Error('poison'); }"}]
        desc = "Context contains irrelevant code to distract"
    elif case == "fabricated_references":
        primary_source += "console.log('test');"
        desc = "Test if LLM invents references to non-existent files"
    elif case == "invalid_symbols":
        primary_source += "import { FakeSymbol } from './fake'; FakeSymbol();"
        context = [{"file_path": f"{case}/fake.ts", "relevance_score": 1.0, "tokens": 20, "source_excerpt": "export const RealSymbol = 1;"}]
        desc = "Test invalid symbol resolution"
    elif case == "misleading_dependency_graphs":
        primary_source += "import { A } from './a';"
        context = [{"file_path": f"{case}/a.ts", "relevance_score": 1.0, "tokens": 20, "source_excerpt": "export const A = 1;"}]
        desc = "Test fake graph injection"

    bundle = create_bundle(target_file, primary_source, context)
    with open(os.path.join(case_dir, "bundle.json"), "w") as f:
        json.dump(bundle, f, indent=2)

    add_manifest_entry(
        f"adversarial/{case}",
        "Adversarial",
        desc,
        [1, 3],
        supp_rate=0.0, # Expect failures
        unsupp_rate=100.0,
        local_refs=0,
        cross_refs=0,
        hall_rate=100.0,
        is_negative_case=True
    )

# 3. Real World
rw_dir = os.path.join(base_dir, "real_world")
os.makedirs(rw_dir, exist_ok=True)

# Phase 14C copy
phase14c_dir = os.path.join(rw_dir, "phase14c_codegen_snapshot")
os.makedirs(phase14c_dir, exist_ok=True)
try:
    with open(r"c:\Users\lenovo\CodePulse AI\analysis-engine\analyzers\review_bundles.json", "r") as f:
        bundles = json.load(f)
    with open(os.path.join(phase14c_dir, "bundle.json"), "w") as f:
        json.dump(bundles[0], f, indent=2)
except Exception:
    pass

add_manifest_entry(
    "real_world/phase14c_codegen_snapshot",
    "Real World",
    "Phase 14C benchmark bundle",
    [2, 5],
    supp_rate=100.0,
    unsupp_rate=0.0,
    local_refs=2,
    cross_refs=1,
    hall_rate=0.0,
    is_negative_case=False
)

# Future snapshot placeholder
future_dir = os.path.join(rw_dir, "future_snapshots")
os.makedirs(future_dir, exist_ok=True)
with open(os.path.join(future_dir, "bundle.json"), "w") as f:
    json.dump(create_bundle("future/main.ts", "// future", []), f, indent=2)
    
add_manifest_entry(
    "real_world/future_snapshots",
    "Real World",
    "Placeholder for future",
    [0, 5],
    supp_rate=100.0,
    unsupp_rate=0.0,
    local_refs=0,
    cross_refs=0,
    hall_rate=0.0,
    is_negative_case=False
)

with open(os.path.join(base_dir, "benchmark_manifest.json"), "w") as f:
    json.dump(manifest, f, indent=2)

print("Benchmark structure created.")
