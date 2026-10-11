# Predictive ML Research Postmortem

## Executive Summary
This document serves as the permanent record of CodePulse's exploration into predictive Machine Learning for software defect identification. Over an extensive research period, multiple datasets, labeling strategies, and feature families were evaluated against supervised ML algorithms.

**Conclusion:** Software defects are context-heavy, logical anomalies. Static structural analysis, file history, and purely AST-derived semantic metrics do not possess sufficient mathematical signal to predict defects (AUC ≈ 0.50). The predictive ML track has been permanently terminated in favor of deterministic engineering intelligence.

---

## 1. Labels Evaluated

### A. Regex Chronological Labels (Phases 1-5)
- **Method:** Matched standard git commit messages against keywords like `['fix', 'bug', 'issue']`. Positive label assigned if a match occurred within a 30-day window following the snapshot.
- **Result:** ~15% positive rate.
- **Audit Findings:** Estimated 68% label noise. Captured routine maintenance, typo fixes, and refactoring rather than structural defects.

### B. SZZ-Based Bug Induction Labels (Phase 6)
- **Method:** Utilized the Śliwerski, Zimmermann, and Zeller (SZZ) algorithm. High-confidence bug-fix commits (e.g., `fix regression`, `fix crash`) were traced backward using `git diff -U0` and `git blame` to identify the precise commit that introduced the defective line.
- **Result:** ~1.6% positive rate.
- **Audit Findings:** 96% label purity. Extremely precise boundary mapping for actual structural/logical defects.

---

## 2. Features Extracted & Tested

### Structural & Historical Features
Extracted via Lizard and PyDriller.
- **Complexity Metrics:** `nloc`, `cyclomatic_complexity`, `function_count`, `class_count`, `comment_ratio`
- **History Metrics:** `churn_count`, `bug_fix_count`, `commits_last_30_days`, `average_commit_size`, `contributor_count`
- **Ownership Metrics:** `author_entropy`, `ownership_concentration`
- **Signal Precheck Result:** Best ROC-AUC achieved was `0.502` (`bug_fix_count`). Mutual Information was functionally `0.000`.

### Semantic AST Features (Phase 7)
Extracted via Python `ast` and TS/JS heuristics.
- **Metrics:** `ast_node_count`, `max_ast_depth`, `branching_count`, `exception_handler_count`, `async_pattern_count`, `import_count`, `nesting_depth`
- **Signal Precheck Result:** Best ROC-AUC achieved was `0.515` (`max_ast_depth`). Mutual Information was `0.003`. Did not cross the required `0.60` threshold.

---

## 3. Models Trained

Using the chronological V4 dataset, we evaluated:
1. **Logistic Regression** (Baseline Linear)
2. **Random Forest** (Tree Ensemble)
3. **XGBoost** (Gradient Boosting)
4. **LightGBM** (High-Performance Gradient Boosting)

### Results
- **ROC-AUC Plateau:** All models converged at approximately ~0.501.
- **Overfitting Audit:** No model demonstrated a train/test ROC gap exceeding `0.03`.
- **Feature Importance:** Permutation importance mapped closely to uniformly distributed random noise.

---

## 4. Reason for Rejection

The project gate established that a successful predictive ML implementation required either an ROC-AUC > 0.55 on semantic features, or a material outperformance of the baseline heuristic. Neither was achieved.

**Scientific Justification:**
Code structure (how nested a file is, or how long it is) and code history (how often it is modified) describe the *centrality* of a file, not its *logical correctness*. Heavy churn indicates maintenance activity, but it does not deterministically point to a hidden bug. Because bugs are deviations in developer intent, predicting them requires deep semantic comprehension (e.g., LLMs), not tabular classification models. 

Therefore, CodePulse is pivoting away from "Black-Box Probability Scores" and toward "Deterministic Engineering Insight."
