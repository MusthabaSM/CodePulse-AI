from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseExplanationService(ABC):
    """
    Abstract Interface for Explanation Generation (Rule-based or LLM).
    """
    
    @abstractmethod
    def generate_explanations(self, metrics: Dict[str, Any]) -> List[str]:
        """
        Takes in a unified metrics dictionary and returns a list of human-readable findings/explanations.
        """
        pass
