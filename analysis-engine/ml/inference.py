import numpy as np
import pandas as pd
from typing import Dict, Any
from .models.joblib_provider import JoblibModelProvider

class InferenceService:
    def __init__(self, model_name: str = "bug_predictor", version: str = "1.0"):
        self.provider = JoblibModelProvider()
        try:
            self.model = self.provider.load_model(model_name, version)
        except FileNotFoundError:
            self.model = None
            print(f"WARNING: Model {model_name}_v{version} not found. Bug predictions will be mocked/unavailable until trained.")

        self.feature_columns = [
            'churn_count',
            'bug_fix_count',
            'author_entropy',
            'cyclomatic_complexity',
            'nloc'
        ]

    def predict_file_risk(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """
        Takes raw file metrics and outputs risk prediction.
        """
        if not self.model:
            return {
                "riskScore": 0.0,
                "confidenceScore": 0.0,
                "topRiskFactor": "Model not loaded"
            }

        # Build feature vector
        features = []
        for col in self.feature_columns:
            val = metrics.get(col)
            if val is None:
                val = 0
            features.append(val)

        # Convert to DataFrame to avoid sklearn warnings about feature names
        X = pd.DataFrame([features], columns=self.feature_columns)

        # Predict probability
        prob = self.model.predict_proba(X)[0][1] # Probability of class 1 (bug)
        
        # Determine top risk factor based on feature values * importances (if available)
        top_risk_factor = "Unknown"
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
            weighted_features = np.array(features) * importances
            top_idx = np.argmax(weighted_features)
            top_risk_factor = self.feature_columns[top_idx]

        return {
            "riskScore": round(float(prob), 4),
            # Model outputs probability. Let's make a mock "confidence" based on how far prob is from 0.5
            "confidenceScore": round(abs(prob - 0.5) * 2, 4), 
            "topRiskFactor": top_risk_factor
        }
