from abc import ABC, abstractmethod
from typing import Any

class BaseModelProvider(ABC):
    """
    Abstract interface for model serialization and inference.
    Allows swapping between Joblib (MVP), ONNX, PMML, etc.
    """
    
    @abstractmethod
    def save_model(self, model: Any, model_name: str, version: str) -> str:
        """Saves a model and returns the file path."""
        pass
        
    @abstractmethod
    def load_model(self, model_name: str, version: str) -> Any:
        """Loads a model from storage."""
        pass
