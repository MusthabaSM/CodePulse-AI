from radon.metrics import mi_visit
from typing import Dict, Any
from .base import BaseAnalyzerAdapter

class RadonAdapter(BaseAnalyzerAdapter):
    """
    Python-specific deep analysis using Radon to supplement Lizard.
    Provides Maintainability Index (MI).
    """

    def supports_language(self, language: str) -> bool:
        return language.lower() == 'python'

    def analyze_file(self, file_path: str, code_content: str) -> Dict[str, Any]:
        try:
            # We only extract Maintainability Index here, as Lizard handles CC
            mi_score = mi_visit(code_content, multi=True)
        except Exception:
            mi_score = None

        return {
            "cyclomatic_complexity": None, # Defer to Lizard
            "nloc": None, # Defer to Lizard
            "functions": [],
            "maintainability_index": mi_score
        }
