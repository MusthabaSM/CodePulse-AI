import os
from .base_provider import BaseProvider
from .gemini_provider import GeminiProvider
from .openrouter_provider import OpenRouterProvider
from .ollama_provider import OllamaProvider
from .resilient_provider import ResilientProvider

class ProviderFactory:
    @staticmethod
    def get_provider() -> BaseProvider:
        provider_name = os.environ.get("LLM_PROVIDER", "gemini").lower()
        
        if provider_name == "gemini":
            # Return resilient wrapper which tries Gemini, falls back to OpenRouter
            return ResilientProvider(GeminiProvider, OpenRouterProvider)
        elif provider_name == "openrouter":
            return ResilientProvider(OpenRouterProvider, None)
        elif provider_name == "ollama":
            return ResilientProvider(OllamaProvider, None)
        else:
            raise ValueError(f"Unknown LLM_PROVIDER: {provider_name}")
