from abc import ABC, abstractmethod
import pandas as pd

class BaseDatasetGenerator(ABC):
    """
    Abstract Interface for generating training and testing datasets.
    Ensures that all dataset sources (Synthetic or Repository Mining)
    output the exact same feature schema.
    """
    
    @property
    def feature_columns(self):
        return [
            'churn_count',
            'bug_fix_count',
            'author_entropy',
            'cyclomatic_complexity',
            'nloc'
        ]

    @abstractmethod
    def generate_dataset(self, num_samples: int = 1000) -> pd.DataFrame:
        """
        Generates a DataFrame containing the standard feature columns and a 'is_bug_prone' target column.
        """
        pass
