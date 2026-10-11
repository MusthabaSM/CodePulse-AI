import pandas as pd
import numpy as np
from .base import BaseDatasetGenerator

class SyntheticDatasetGenerator(BaseDatasetGenerator):
    """
    MVP Data Generator that produces realistic synthetic distributions
    of code metrics and assigns bug probabilities based on known risk factors.
    """

    def generate_dataset(self, num_samples: int = 1000) -> pd.DataFrame:
        np.random.seed(42) # For reproducibility during training

        # Generate realistic distributions
        # Churn: Most files changed rarely, some changed often (Exponential)
        churn = np.random.exponential(scale=5.0, size=num_samples).astype(int)
        
        # Bug Fixes: Usually correlated with churn
        bug_fixes = np.random.binomial(churn, 0.2)
        
        # Complexity: Log-normal distribution
        cc = np.random.lognormal(mean=2.0, sigma=0.8, size=num_samples).astype(int)
        
        # NLOC: Correlated with complexity
        nloc = cc * np.random.uniform(10, 30, size=num_samples).astype(int)
        
        # Entropy: Uniform for multiple authors
        entropy = np.random.uniform(0.0, 3.0, size=num_samples)

        # Compute hidden target probability
        # High CC, High Churn, High Bug Fixes heavily increase probability
        z = -4.0 + (cc * 0.05) + (churn * 0.1) + (bug_fixes * 0.3) + (entropy * 0.2)
        prob = 1 / (1 + np.exp(-z)) # Sigmoid function
        
        # Assign target labels
        is_bug_prone = np.random.binomial(1, prob)

        df = pd.DataFrame({
            'churn_count': churn,
            'bug_fix_count': bug_fixes,
            'author_entropy': entropy,
            'cyclomatic_complexity': cc,
            'nloc': nloc,
            'is_bug_prone': is_bug_prone
        })

        return df
