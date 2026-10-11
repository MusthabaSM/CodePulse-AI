
import joblib
model = joblib.load('models_registry/bug_predictor_v1.0.joblib')
print('Classes:', getattr(model, 'classes_', 'N/A'))
print('Feature importances:', getattr(model, 'feature_importances_', 'N/A'))

