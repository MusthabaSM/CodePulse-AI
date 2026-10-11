
import joblib
import numpy as np
model = joblib.load('models_registry/bug_predictor_v1.0.joblib')
class_0 = 0
class_1 = 0
for est in model.estimators_:
    class_0 += est.tree_.value[0][0][0]
    class_1 += est.tree_.value[0][0][1]
print('Avg Class 0:', class_0 / len(model.estimators_))
print('Avg Class 1:', class_1 / len(model.estimators_))
print('Distribution:', (class_1 / (class_0 + class_1)) * 100, '% bugs')

