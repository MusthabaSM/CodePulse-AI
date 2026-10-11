from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseAnalyzerAdapter(ABC):
    """
    Base abstraction for all code complexity analyzers (Lizard, Radon, Sonar, etc.)
    """

    @abstractmethod
    def analyze_file(self, file_path: str, code_content: str) -> Dict[str, Any]:
        """
        Analyzes a single file and returns standardized metrics:
        {
            "cyclomatic_complexity": float,
            "nloc": int,
            "functions": [{"name": str, "cc": float, "nloc": int, "params": int}],
            "maintainability_index": float | None
        }
        """
        pass

    @abstractmethod
    def supports_language(self, language: str) -> bool:
        """
        Returns true if the analyzer supports the given language.
        """
        pass
