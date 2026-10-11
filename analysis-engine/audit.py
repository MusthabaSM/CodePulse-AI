import pandas as pd
import numpy as np
import sys
import os
import json

from ml.models.joblib_provider import JoblibModelProvider

def main():
    result = {}
    
    # 1. Load Data
    try:
        df = pd.read_csv('/app/metrics.csv')
        metrics = {}
        for col in ['cyclomatic_complexity', 'churnCount', 'bugFixCount', 'authorEntropy']:
            # map column names from DB to expected names if needed
            db_col = col
            if col == 'cyclomatic_complexity': db_col = 'complexity'
            
            if db_col in df.columns:
                series = df[db_col].dropna()
                if len(series) > 0:
                    metrics[col] = {
                        'min': float(series.min()),
                        'max': float(series.max()),
                        'mean': float(series.mean()),
                        'median': float(series.median()),
                        'std': float(series.std()),
                        'is_constant': float(series.min()) == float(series.max())
                    }
                else:
                    metrics[col] = "Empty"
            else:
                metrics[col] = "Not found"
        result['distributions'] = metrics
    except Exception as e:
        result['data_error'] = str(e)

    # 2. Load Model
    try:
        provider = JoblibModelProvider(base_path="/app/models_registry")
        model = provider.load_model("bug_predictor", "1.0")
        
        features = ['churn_count', 'bug_fix_count', 'author_entropy', 'cyclomatic_complexity', 'nloc']
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            feature_imp = {f: float(imp) for f, imp in zip(features, importances)}
            result['feature_importances'] = feature_imp
        else:
            result['feature_importances'] = "Model lacks feature_importances_"
    except Exception as e:
        result['model_error'] = str(e)

    print("---AUDIT_START---")
    print(json.dumps(result, indent=2))
    print("---AUDIT_END---")

if __name__ == "__main__":
    main()
