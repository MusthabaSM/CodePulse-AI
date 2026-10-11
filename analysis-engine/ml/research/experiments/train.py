import os
import sys

# Ensure analysis-engine root is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
import pandas as pd
from ml.data.real_extractor import RealDataExtractor
from ml.models.joblib_provider import JoblibModelProvider

def train_and_evaluate():
    print("Loading Real Outcome-Based Dataset...")
    csv_path = os.path.join(os.path.dirname(__file__), 'data', 'training_data.csv')
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
    else:
        print("Dataset not found. Please run real_extractor.py first.")
        return
        
    baseline_features = ['cyclomatic_complexity', 'nloc']
    hist_features = ['churn_count', 'bug_fix_count', 'author_entropy', 'cyclomatic_complexity', 'nloc']
        
    # Cross-Repository Hard Split
    train_repos = ['express', 'fastapi']
    test_repos = ['nest', 'socket.io']

    train_df = df[df['repository'].isin(train_repos)]
    test_df = df[df['repository'].isin(test_repos)]

    y_train = train_df['future_bug']
    y_test = test_df['future_bug']

    print(f"\n--- Data Split (Zero Repository Leakage) ---")
    print(f"Train Repositories: {train_repos} ({len(train_df)} files)")
    print(f"Test Repositories: {test_repos} ({len(test_df)} files)")

    # 1. Baseline Model
    print("\nTraining Baseline Model (Complexity Only)...")
    base_model = RandomForestClassifier(n_estimators=100, random_state=42)
    base_model.fit(train_df[baseline_features], y_train)
    
    y_pred_base = base_model.predict(test_df[baseline_features])
    y_prob_base = base_model.predict_proba(test_df[baseline_features])[:, 1]
    
    base_acc = accuracy_score(y_test, y_pred_base)
    base_prec = precision_score(y_test, y_pred_base, zero_division=0)
    base_rec = recall_score(y_test, y_pred_base, zero_division=0)
    base_f1 = f1_score(y_test, y_pred_base, zero_division=0)
    base_auc = roc_auc_score(y_test, y_prob_base)

    print(f"Baseline Metrics:")
    print(f"  Accuracy:  {base_acc:.4f}")
    print(f"  Precision: {base_prec:.4f}")
    print(f"  Recall:    {base_rec:.4f}")
    print(f"  F1:        {base_f1:.4f}")
    print(f"  ROC-AUC:   {base_auc:.4f}")

    # 2. Historical Intelligence Model
    print("\nTraining Historical Intelligence Model...")
    hist_model = RandomForestClassifier(n_estimators=100, random_state=42)
    hist_model.fit(train_df[hist_features], y_train)
    
    y_pred_hist = hist_model.predict(test_df[hist_features])
    y_prob_hist = hist_model.predict_proba(test_df[hist_features])[:, 1]
    
    hist_acc = accuracy_score(y_test, y_pred_hist)
    hist_prec = precision_score(y_test, y_pred_hist, zero_division=0)
    hist_rec = recall_score(y_test, y_pred_hist, zero_division=0)
    hist_f1 = f1_score(y_test, y_pred_hist, zero_division=0)
    hist_auc = roc_auc_score(y_test, y_prob_hist)

    print(f"Historical Metrics:")
    print(f"  Accuracy:  {hist_acc:.4f} (+{(hist_acc - base_acc)/base_acc*100:.1f}%)")
    print(f"  Precision: {hist_prec:.4f} (+{(hist_prec - base_prec)/(base_prec+0.0001)*100:.1f}%)")
    print(f"  Recall:    {hist_rec:.4f} (+{(hist_rec - base_rec)/(base_rec+0.0001)*100:.1f}%)")
    print(f"  F1:        {hist_f1:.4f} (+{(hist_f1 - base_f1)/(base_f1+0.0001)*100:.1f}%)")
    print(f"  ROC-AUC:   {hist_auc:.4f} (+{(hist_auc - base_auc)/base_auc*100:.1f}%)")
    
    print("\nConfusion Matrix (Historical):")
    print(confusion_matrix(y_test, y_pred_hist))

    print("\nFeature Importances (Historical):")
    for name, imp in zip(hist_features, hist_model.feature_importances_):
        print(f"  {name}: {imp:.4f}")

    print("\n--- Identifying Defect Catches ---")
    caught = test_df[(y_test == 1) & (y_pred_base == 0) & (y_pred_hist == 1)]
    print(f"Top 20 files caught by Historical but missed by Baseline:")
    for _, row in caught.head(20).iterrows():
        print(f"  {row['repository']}/{row['file_path']} | Churn: {row['churn_count']} | Bug Fixes: {row['bug_fix_count']} | CC: {row['cyclomatic_complexity']}")

    # Save the historical model
    provider = JoblibModelProvider()
    path = provider.save_model(hist_model, "bug_predictor", "1.0")
    print(f"\nHistorical Model saved successfully to {path}")

if __name__ == "__main__":
    train_and_evaluate()
