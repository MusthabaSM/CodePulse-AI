import abc

class BaseProvider(abc.ABC):
    @abc.abstractmethod
    def review(self, system_prompt: str, user_prompt: str) -> dict:
        """
        Executes a review using the LLM provider and returns the parsed JSON response.
        """
        pass
