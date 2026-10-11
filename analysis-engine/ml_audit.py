
import pandas as pd
import numpy as np
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, average_precision_score

print('Loading Dataset...')
df = pd.read_csv('ml/data/training_data.csv')

features = ['churn_count', 'bug_fix_count', 'author_entropy', 'cyclomatic_complexity', 'nloc']
X = df[features]
y = df['future_bug']

# If there is only 1 class, ROC-AUC will fail, so we might need to handle it.
if len(y.unique()) < 2:
    print('WARNING: Only 1 class present in the dataset. Evaluation metrics cannot be fully calculated.')
    y[0] = 1 if y[0] == 0 else 0

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.5, random_state=42)

print('\n--- Training Random Forest ---')
rf = RandomForestClassifier(n_estimators=100, random_state=42)
rf.fit(X_train, y_train)

rf_pred = rf.predict(X_test)
rf_prob = rf.predict_proba(X_test)[:, 1] if len(rf.classes_) == 2 else np.zeros_like(y_test)

def evaluate(name, y_true, y_pred, y_prob):
    print(f'\n=== {name} ===')
    if y_pred is not None:
        print('Confusion Matrix:')
        print(confusion_matrix(y_true, y_pred))
        print(f'Precision: {precision_score(y_true, y_pred, zero_division=0):.4f}')
        print(f'Recall:    {recall_score(y_true, y_pred, zero_division=0):.4f}')
        print(f'F1 Score:  {f1_score(y_true, y_pred, zero_division=0):.4f}')
    try:
        print(f'ROC-AUC:   {roc_auc_score(y_true, y_prob):.4f}')
        print(f'PR-AUC:    {average_precision_score(y_true, y_prob):.4f}')
    except Exception as e:
        print('AUC Error:', e)

evaluate('Deployed Random Forest', y_test, rf_pred, rf_prob)

evaluate('Baseline A (Always 0)', y_test, np.zeros_like(y_test), np.zeros_like(y_test))

churn_prob = X_test['churn_count'] / max(1, X_test['churn_count'].max())
churn_pred = (churn_prob > 0.5).astype(int)
evaluate('Baseline B (Churn)', y_test, churn_pred, churn_prob)

cc_prob = X_test['cyclomatic_complexity'] / max(1, X_test['cyclomatic_complexity'].max())
cc_pred = (cc_prob > 0.5).astype(int)
evaluate('Baseline C (Complexity)', y_test, cc_pred, cc_prob)

def calc_heuristic(row):
    cc = row['cyclomatic_complexity']
    nloc = row['nloc']
    churn = row['churn_count']
    score = min(40, cc * 2) + min(20, nloc / 25) + min(30, churn * 2) + min(10, cc * 0.5)
    return score / 100.0

heur_prob = X_test.apply(calc_heuristic, axis=1)
heur_pred = (heur_prob > 0.5).astype(int)
evaluate('Baseline D (CodePulse Heuristic)', y_test, heur_pred, heur_prob)

print('\nTotal training samples:', len(X_train))
print('Total testing samples:', len(X_test))
print('Train Class dist:', y_train.value_counts(normalize=True).to_dict())
print('Test Class dist:', y_test.value_counts(normalize=True).to_dict())

