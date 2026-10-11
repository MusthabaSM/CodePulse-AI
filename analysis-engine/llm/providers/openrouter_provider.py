import os
import json
import requests

from .base_provider import BaseProvider


class OpenRouterProvider(BaseProvider):
    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")

        if not self.api_key:
            raise ValueError(
                "OPENROUTER_API_KEY environment variable is missing"
            )

        self.url = "https://openrouter.ai/api/v1/chat/completions"

        # Independent fallback model
        self.model = os.getenv(
            "OPENROUTER_MODEL",
            "openai/gpt-oss-120b"
        )

    def review(
        self,
        system_prompt: str,
        user_prompt: str
    ) -> dict:

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-OpenRouter-Title": "CodePulse AI"
        }

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            "response_format": {
                "type": "json_object"
            }
        }

        try:
            response = requests.post(
                self.url,
                headers=headers,
                json=payload,
                timeout=120
            )

            response.raise_for_status()

            result = response.json()

            if (
                "choices" not in result
                or not result["choices"]
            ):
                raise ValueError(
                    "OpenRouter returned no choices"
                )

            content = (
                result["choices"][0]
                ["message"]
                ["content"]
            )

            return json.loads(content)

        except requests.exceptions.Timeout:
            raise ValueError(
                "OpenRouter request timed out"
            )

        except requests.exceptions.HTTPError as e:
            error_text = ""

            try:
                error_text = response.text
            except Exception:
                pass

            raise ValueError(
                f"OpenRouter HTTP Error: "
                f"{response.status_code} - "
                f"{error_text}"
            )

        except json.JSONDecodeError:
            raise ValueError(
                "OpenRouter returned invalid JSON"
            )

        except Exception as e:
            raise ValueError(
                f"OpenRouter execution failed: {str(e)}"
            )