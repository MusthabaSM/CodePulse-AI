import os
import tempfile
import subprocess
import json

AST_SCRIPT = r"c:\Users\lenovo\CodePulse AI\analysis-engine\ast_validator.js"

def get_ast(source_code):
    with tempfile.NamedTemporaryFile("w", suffix=".ts", delete=False) as f:
        f.write(source_code)
        tmp_path = f.name
    try:
        result = subprocess.run(["node", AST_SCRIPT, tmp_path], capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    except Exception as e:
        print("AST extraction failed:", e)
        return {}
    finally:
        os.remove(tmp_path)

def validate_finding_semantics(finding, valid_files_map):
    referenced_files = finding.get("referenced_files", [])
    
    # Extract claims
    ref_symbols = finding.get("referenced_symbols", [])
    imp_deps = finding.get("imported_dependencies", [])
    inh_rels = finding.get("inheritance_relationships", [])
    
    if not (ref_symbols or imp_deps or inh_rels):
        return True, []
        
    all_declared = set()
    all_imports = set()
    all_inheritance = set()
    
    for ref_file in referenced_files:
        if ref_file in valid_files_map:
            ast_data = get_ast(valid_files_map[ref_file])
            all_declared.update(ast_data.get("declared_functions", []))
            all_declared.update(ast_data.get("declared_classes", []))
            all_declared.update(ast_data.get("declared_variables", []))
            all_declared.update(ast_data.get("exports", []))
            all_imports.update(ast_data.get("imports", []))
            all_inheritance.update(ast_data.get("inheritance", []))
            
    failed_claims = []
    
    for sym in ref_symbols:
        if sym not in all_declared:
            failed_claims.append(f"Symbol '{sym}' not found in AST.")
            
    for dep in imp_deps:
        if dep not in all_imports:
            failed_claims.append(f"Dependency '{dep}' not imported.")
            
    for inh in inh_rels:
        if inh not in all_inheritance:
            failed_claims.append(f"Inheritance '{inh}' not found.")
            
    if failed_claims:
        return False, failed_claims
        
    return True, []
