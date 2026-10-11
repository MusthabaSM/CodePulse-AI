import os
import json
from .base_provider import BaseProvider

class GeminiProvider(BaseProvider):
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is missing")
            
        import google.generativeai as genai
        genai.configure(api_key=self.api_key)
        model_name = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
        self.model = genai.GenerativeModel(model_name)

    def review(self, system_prompt: str, user_prompt: str) -> dict:
        import google.generativeai as genai
        response = self.model.generate_content(
            contents=[system_prompt, user_prompt],
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        if not response.text:
            raise ValueError("Empty response received from Gemini.")
            
        return json.loads(response.text)
