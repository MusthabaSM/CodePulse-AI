import os
import json
import urllib.request
import urllib.error
from .base_provider import BaseProvider

class OllamaProvider(BaseProvider):
    def __init__(self):
        self.url = os.environ.get("OLLAMA_URL", "http://localhost:11434")
        self.endpoint = f"{self.url.rstrip('/')}/api/generate"

    def review(self, system_prompt: str, user_prompt: str) -> dict:
        data = {
            "model": "llama3", # Assuming a default model
            "prompt": f"{system_prompt}\n\n{user_prompt}",
            "stream": False,
            "format": "json"
        }
        
        req = urllib.request.Request(
            self.endpoint, 
            data=json.dumps(data).encode('utf-8'),
            headers={"Content-Type": "application/json"}
        )
        
        try:
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode('utf-8'))
                return json.loads(result['response'])
        except urllib.error.HTTPError as e:
            error_msg = e.read().decode('utf-8')
            raise ValueError(f"Ollama API Error {e.code}: {error_msg}")
        except Exception as e:
            raise ValueError(f"Ollama execution failed: {str(e)}")
