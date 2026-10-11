from analyzers.lizard_adapter import LizardAdapter
from analyzers.radon_adapter import RadonAdapter
from explanations.rule_based import RuleBasedExplanationEngine

class TechnicalDebtEngine:
    def __init__(self):
        # Initialize our universal source of truth
        self.lizard_adapter = LizardAdapter()
        # Initialize language specific supplements
        self.radon_adapter = RadonAdapter()
        
        # Initialize explanation service
        self.explanation_service = RuleBasedExplanationEngine()

    def determine_language(self, file_path: str) -> str:
        """Simple extension-based language detection."""
        ext = file_path.split('.')[-1].lower()
        mapping = {
            'py': 'python',
            'js': 'javascript',
            'ts': 'typescript',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cs': 'csharp',
            'go': 'go'
        }
        return mapping.get(ext, 'unknown')

    def analyze_file(self, file_path: str, code_content: str, vcs_metrics: dict) -> dict:
        """
        Combines Lizard, Radon (if applicable), and VCS metrics into a unified result.
        vcs_metrics should contain: churn_count, bug_fix_count, author_entropy
        """
        language = self.determine_language(file_path)
        
        # 1. Base Metrics from Lizard
        metrics = self.lizard_adapter.analyze_file(file_path, code_content)
        
        # 2. Supplemental Metrics (e.g. Radon for Python)
        if self.radon_adapter.supports_language(language):
            radon_metrics = self.radon_adapter.analyze_file(file_path, code_content)
            metrics['maintainability_index'] = radon_metrics.get('maintainability_index')

        # 3. Merge VCS Metrics
        metrics.update(vcs_metrics)
        
        # 4. Calculate Technical Debt Score (0-100, where 100 is extremely indebted/risky)
        tech_debt_score = self._calculate_score(metrics)
        metrics['tech_debt_score'] = tech_debt_score

        # 5. Generate Explanations
        metrics['explanations'] = self.explanation_service.generate_explanations(metrics)
        
        return metrics

    def _calculate_score(self, metrics: dict) -> float:
        """
        Formula weighting CC, NLOC, MI, and Churn into a 0-100 risk score.
        """
        score = 0
        
        # Complexity (Max 40 points)
        cc = metrics.get('cyclomatic_complexity', 0)
        score += min(40, cc * 2) # CC of 20 maxes out this bucket
        
        # File Size (Max 20 points)
        nloc = metrics.get('nloc', 0)
        score += min(20, nloc / 25) # 500 lines maxes out
        
        # Churn (Max 30 points)
        churn = metrics.get('churn_count', 0)
        score += min(30, churn * 2) # 15 modifications maxes out
        
        # Python specific Maintainability deduction
        mi = metrics.get('maintainability_index')
        if mi is not None:
            # MI is 0-100 (higher is better). 
            # If MI is low, add up to 10 points of debt.
            mi_penalty = max(0, (100 - mi) * 0.1)
            score += mi_penalty
        else:
            # For non-python languages, distribute the 10 points into complexity
            score += min(10, cc * 0.5)

        return min(100.0, round(score, 2))
