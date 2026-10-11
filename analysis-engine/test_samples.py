
import joblib
model = joblib.load('models_registry/bug_predictor_v1.0.joblib')
print('Num Estimators:', len(model.estimators_))
print('Training Samples (from tree 0 root):', model.estimators_[0].tree_.n_node_samples[0])
print('Classes:', getattr(model, 'classes_', 'N/A'))

