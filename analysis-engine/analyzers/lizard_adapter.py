import lizard
from typing import Dict, Any
from .base import BaseAnalyzerAdapter

class LizardAdapter(BaseAnalyzerAdapter):
    """
    Universal code analysis using Lizard. Acts as the source of truth for CC and NLOC across languages.
    """
    
    def supports_language(self, language: str) -> bool:
        # Lizard supports many languages out of the box
        supported = ['python', 'javascript', 'typescript', 'java', 'c', 'cpp', 'csharp', 'go', 'php', 'ruby', 'swift']
        return language.lower() in supported or language == 'any'

    def analyze_file(self, file_path: str, code_content: str) -> Dict[str, Any]:
        file_info = lizard.analyze_file.analyze_source_code(file_path, code_content)
        
        functions = []
        max_cc = 0
        total_cc = 0
        
        for func in file_info.function_list:
            cc = func.cyclomatic_complexity
            max_cc = max(max_cc, cc)
            total_cc += cc
            
            functions.append({
                "name": func.name,
                "cc": cc,
                "nloc": func.nloc,
                "params": len(func.parameters)
            })
            
        avg_cc = total_cc / len(functions) if functions else 0

        return {
            "cyclomatic_complexity": max_cc, # We use the max CC of any function in the file as the file's CC
            "avg_cyclomatic_complexity": avg_cc,
            "nloc": file_info.nloc,
            "functions": functions,
            "maintainability_index": None # Lizard doesn't calculate MI natively
        }
