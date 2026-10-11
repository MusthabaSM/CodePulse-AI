import os
import joblib
from typing import Any
from .base import BaseModelProvider

class JoblibModelProvider(BaseModelProvider):
    """
    MVP Model Provider using Scikit-Learn's joblib format.
    """
    
    def __init__(self, registry_dir: str = "models_registry"):
        # The base dir will be relative to analysis-engine
        self.registry_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), registry_dir)
        os.makedirs(self.registry_dir, exist_ok=True)

    def _get_path(self, model_name: str, version: str) -> str:
        return os.path.join(self.registry_dir, f"{model_name}_v{version}.joblib")

    def save_model(self, model: Any, model_name: str, version: str) -> str:
        path = self._get_path(model_name, version)
        joblib.dump(model, path)
        return path

    def load_model(self, model_name: str, version: str) -> Any:
        path = self._get_path(model_name, version)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model not found at {path}")
        return joblib.load(path)
