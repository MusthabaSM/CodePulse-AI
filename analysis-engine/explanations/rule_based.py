from typing import Dict, Any, List
from .base import BaseExplanationService

class RuleBasedExplanationEngine(BaseExplanationService):
    """
    MVP Explanation Engine using deterministic rules and thresholds.
    Easily swappable with LLMExplanationEngine in the future.
    """

    def generate_explanations(self, metrics: Dict[str, Any]) -> List[str]:
        explanations = []
        
        # 1. Complexity Rule
        cc = metrics.get('cyclomatic_complexity', 0)
        if cc > 15:
            explanations.append(f"High Complexity: File complexity ({cc}) exceeds the recommended threshold. High complexity can increase bug risk, reduce maintainability, and make testing more difficult.")
            
        # 2. Maintainability Index Rule (Python only)
        mi = metrics.get('maintainability_index')
        if mi is not None and mi < 50:
            explanations.append(f"Low Maintainability: Maintainability Index is critically low ({mi:.2f}). Consider heavily refactoring this module to improve readability and structure.")

        # 3. File Size Rule
        nloc = metrics.get('nloc', 0)
        if nloc > 500:
            explanations.append(f"Large File Size: File contains {nloc} lines of code. Consider splitting into smaller, single-responsibility modules.")

        # 4. Churn Rule
        churn = metrics.get('churn_count', 0)
        if churn > 15:
            explanations.append(f"High Code Churn: This file has been modified {churn} times. High churn often indicates unstable requirements or ongoing maintenance challenges.")

        # 5. Author Entropy Rule
        entropy = metrics.get('author_entropy', 0)
        if entropy > 1.5:
            explanations.append(f"Multiple Contributors: This file has high authorship dispersion (entropy: {entropy:.2f}). Shared ownership can increase coordination complexity and defect risk.")

        # 6. Combined Tech Debt Rule
        if cc > 10 and churn > 10:
            explanations.append("Technical Debt: This module combines high complexity and frequent modifications, making it a strong candidate for immediate refactoring.")

        return explanations

    def enhance_explanations(self, explanations: List[str], prediction: Dict[str, Any], metrics: Dict[str, Any] = None):
        """
        Enhance the list of explanations with the ML prediction's top risk factor.
        """
        top_risk_factor = prediction.get('topRiskFactor', 'Unknown')
        risk_score = prediction.get('riskScore', 0.0)
        confidence = prediction.get('confidenceScore', 0.0)
        
        feature_names = {
            'churn_count': 'Historical Code Churn',
            'bug_fix_count': 'Historical Bug Fixes',
            'author_entropy': 'Author Entropy',
            'cyclomatic_complexity': 'Complexity',
            'nloc': 'File Size'
        }
        
        readable_factor = feature_names.get(top_risk_factor, top_risk_factor)
        
        score_val = int(risk_score * 100)
        
        if top_risk_factor == 'bug_fix_count':
            base_expl = "Files with similar historical patterns frequently required future bug-fix commits."
        elif top_risk_factor == 'churn_count':
            base_expl = "This file undergoes frequent modifications (high churn), making it historically unstable and prone to future regressions."
        elif top_risk_factor == 'author_entropy':
            base_expl = "This file has high authorship dispersion, meaning changes come from many contributors, increasing coordination complexity and future defect risk."
        elif top_risk_factor == 'cyclomatic_complexity':
            base_expl = "This file exhibits high code complexity, making it difficult to understand, test, and maintain in the future."
        else:
            base_expl = "This file shows elevated risk factors that may require attention during future maintenance."
        
        factors_str = ""
        if metrics:
            cc = metrics.get('cyclomatic_complexity', 0)
            churn = metrics.get('churn_count', 0)
            bugs = metrics.get('bug_fix_count', 0)
            entropy = metrics.get('author_entropy', 0.0)
            
            factors_str = f"Contributing Factors:\n\n* Bug Fixes: {bugs}\n* Churn: {churn}\n* Entropy: {entropy:.2f}\n* Complexity: {cc}\n\n"
            
        final_text = f"Risk Score: {score_val}\n\nPrediction Confidence: {confidence:.2f}\n\nTop Risk Factor:\n{readable_factor}\n\n{factors_str}Explanation:\n{base_expl}"
        
        explanations.clear()
        explanations.append(final_text)
