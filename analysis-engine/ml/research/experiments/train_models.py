import pandas as pd
import numpy as np
import json
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, average_precision_score, confusion_matrix
from sklearn.inspection import permutation_importance
from sklearn.calibration import calibration_curve
import xgboost as xgb
import lightgbm as lgb
import warnings
warnings.filterwarnings('ignore')

print("Loading dataset...")
df = pd.read_csv('training_dataset_v4.csv')
df['snapshot_date'] = pd.to_datetime(df['snapshot_date'])
df = df.sort_values('snapshot_date')

features = ["nloc", "cyclomatic_complexity", "function_count", "class_count", "comment_ratio", "churn_count", "commits_last_30_days", "commits_last_90_days", "additions_last_90_days", "deletions_last_90_days", "average_commit_size", "contributor_count", "author_entropy", "top_author_percentage", "ownership_concentration", "bug_fix_count", "recent_bugfix_density", "days_since_last_bugfix", "file_age_days", "repository_age_days", "change_frequency", "time_since_last_change", "change_burst_score"]

X = df[features]
y = df['label']

print("Splitting dataset...")
split_idx = int(len(df) * 0.8)
X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

def evaluate(y_true, y_pred, y_prob=None):
    res = {
        'accuracy': float(accuracy_score(y_true, y_pred)),
        'precision': float(precision_score(y_true, y_pred, zero_division=0)),
        'recall': float(recall_score(y_true, y_pred)),
        'f1': float(f1_score(y_true, y_pred)),
        'confusion_matrix': confusion_matrix(y_true, y_pred).tolist()
    }
    if y_prob is not None:
        try:
            res['roc_auc'] = float(roc_auc_score(y_true, y_prob))
        except:
            res['roc_auc'] = 0.5
        res['pr_auc'] = float(average_precision_score(y_true, y_prob))
    else:
        res['roc_auc'] = 0.5
        res['pr_auc'] = float(average_precision_score(y_true, y_pred))
    return res

print("Evaluating Baselines...")
baselines = {}

# Baseline A: Predict all negative
baselines['Baseline A'] = evaluate(y_test, np.zeros_like(y_test))

# Baseline B: Churn only
churn_thresh = X_train['churn_count'].median()
if churn_thresh == 0: churn_thresh = 1
y_pred_b = (X_test['churn_count'] > churn_thresh).astype(int)
baselines['Baseline B'] = evaluate(y_test, y_pred_b, (X_test['churn_count'] / X_train['churn_count'].max()).clip(0, 1))

# Baseline C: Bug history only
bug_thresh = X_train['bug_fix_count'].median()
if bug_thresh == 0: bug_thresh = 1
y_pred_c = (X_test['bug_fix_count'] > bug_thresh).astype(int)
baselines['Baseline C'] = evaluate(y_test, y_pred_c, (X_test['bug_fix_count'] / X_train['bug_fix_count'].max()).clip(0, 1))

# Baseline D: Current CodePulse heuristic (cc > 10 and churn > 10)
y_pred_d = ((X_test['cyclomatic_complexity'] > 10) & (X_test['churn_count'] > 10)).astype(int)
baselines['Baseline D'] = evaluate(y_test, y_pred_d, y_pred_d)

print("Training ML Models...")
models = {
    'Logistic Regression': LogisticRegression(max_iter=1000, random_state=42),
    'Random Forest': RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42, n_jobs=-1),
    'XGBoost': xgb.XGBClassifier(n_estimators=100, max_depth=6, random_state=42, use_label_encoder=False, eval_metric='logloss'),
    'LightGBM': lgb.LGBMClassifier(n_estimators=100, max_depth=6, random_state=42)
}

ml_results = {}
feature_importances = {}
overfitting = {}
calibrations = {}

for name, clf in models.items():
    print(f"Training {name}...")
    clf.fit(X_train, y_train)
    
    y_train_pred = clf.predict(X_train)
    y_train_prob = clf.predict_proba(X_train)[:, 1]
    
    y_test_pred = clf.predict(X_test)
    y_test_prob = clf.predict_proba(X_test)[:, 1]
    
    ml_results[name] = evaluate(y_test, y_test_pred, y_test_prob)
    
    # Overfitting Check
    try:
        train_roc = float(roc_auc_score(y_train, y_train_prob))
    except:
        train_roc = 0.5
    train_pr = float(average_precision_score(y_train, y_train_prob))
    test_roc = ml_results[name]['roc_auc']
    test_pr = ml_results[name]['pr_auc']
    
    overfitting[name] = {
        'train_roc_auc': train_roc,
        'test_roc_auc': test_roc,
        'train_pr_auc': train_pr,
        'test_pr_auc': test_pr,
        'gap_roc': train_roc - test_roc,
        'gap_pr': train_pr - test_pr,
        'is_overfitting': (train_roc - test_roc) > 0.10
    }
    
    # Calibration
    prob_true, prob_pred = calibration_curve(y_test, y_test_prob, n_bins=10)
    calibrations[name] = {
        'prob_true': prob_true.tolist(),
        'prob_pred': prob_pred.tolist()
    }
    
    # Feature Importance
    if name == 'Random Forest':
        feature_importances['model_importance'] = dict(zip(features, map(float, clf.feature_importances_)))
        print("Calculating permutation importance...")
        perm = permutation_importance(clf, X_test.iloc[:2000], y_test.iloc[:2000], n_repeats=3, random_state=42, n_jobs=-1)
        feature_importances['permutation_importance'] = dict(zip(features, map(float, perm.importances_mean)))
        
        # Sort top 20
        sorted_fi = sorted(feature_importances['model_importance'].items(), key=lambda x: x[1], reverse=True)[:20]
        feature_importances['top_20_features'] = [k for k, v in sorted_fi]

print("Saving reports...")
with open('model_benchmark_report.json', 'w') as f:
    json.dump({'baselines': baselines, 'ml_models': ml_results}, f, indent=2)

with open('feature_importance_report.json', 'w') as f:
    json.dump(feature_importances, f, indent=2)

with open('overfitting_audit_report.json', 'w') as f:
    json.dump(overfitting, f, indent=2)

with open('calibration_report.json', 'w') as f:
    json.dump(calibrations, f, indent=2)

print("Done. Generating classification summary...")
# Find best ML model vs Baseline D
base_d_roc = baselines['Baseline D']['roc_auc']
base_d_pr = baselines['Baseline D']['pr_auc']

best_ml_roc = max([m['roc_auc'] for m in ml_results.values()])
best_ml_pr = max([m['pr_auc'] for m in ml_results.values()])

print(f"Baseline D - ROC: {base_d_roc:.4f}, PR: {base_d_pr:.4f}")
print(f"Best ML    - ROC: {best_ml_roc:.4f}, PR: {best_ml_pr:.4f}")

if best_ml_roc > base_d_roc + 0.05 and best_ml_pr > base_d_pr + 0.05:
    print("Classification: A) Production ML")
elif best_ml_roc > base_d_roc + 0.02 and best_ml_pr > base_d_pr + 0.02:
    print("Classification: B) Useful ML")
elif best_ml_roc > base_d_roc:
    print("Classification: C) Marginal Improvement")
else:
    print("Classification: D) Worse Than Heuristics")
