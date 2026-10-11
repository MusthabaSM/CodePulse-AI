import os
import json
from datetime import datetime
from .base_provider import BaseProvider

class ResilientProvider(BaseProvider):
    def __init__(self, primary_provider_class, fallback_provider_class):
        self.primary_provider_class = primary_provider_class
        self.fallback_provider_class = fallback_provider_class
        self.audit_log_file = "llm_fallback_audit.json"

    def _log_audit(self, provider_selected, provider_used, fallback_triggered, fallback_provider, failure_reason):
        event = {
            "provider_selected": provider_selected,
            "provider_used": provider_used,
            "fallback_triggered": fallback_triggered,
            "fallback_provider": fallback_provider,
            "failure_reason": failure_reason,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        # Load existing
        logs = []
        if os.path.exists(self.audit_log_file):
            try:
                with open(self.audit_log_file, "r") as f:
                    logs = json.load(f)
            except:
                pass
                
        logs.append(event)
        
        with open(self.audit_log_file, "w") as f:
            json.dump(logs, f, indent=2)

    def review(self, system_prompt: str, user_prompt: str) -> dict:
        primary_name = self.primary_provider_class.__name__
        
        # Try instantiate primary
        primary_instance = None
        primary_error = None
        try:
            primary_instance = self.primary_provider_class()
        except Exception as e:
            primary_error = str(e)
            
        if primary_instance:
            try:
                result = primary_instance.review(system_prompt, user_prompt)
                self._log_audit(primary_name, primary_name, False, None, None)
                return result
            except Exception as e:
                primary_error = str(e)
                
        # Primary failed, attempt fallback
        if not self.fallback_provider_class:
            # No fallback configured
            self._log_audit(primary_name, None, False, None, primary_error)
            raise ValueError(f"Primary provider {primary_name} failed and no fallback available: {primary_error}")
            
        fallback_name = self.fallback_provider_class.__name__
        fallback_instance = None
        fallback_error = None
        try:
            fallback_instance = self.fallback_provider_class()
        except Exception as e:
            fallback_error = str(e)
            
        if fallback_instance:
            try:
                result = fallback_instance.review(system_prompt, user_prompt)
                self._log_audit(primary_name, fallback_name, True, fallback_name, primary_error)
                return result
            except Exception as e:
                fallback_error = str(e)
                
        # Fallback also failed
        hard_failure_reason = f"Primary failed: {primary_error}. Fallback failed: {fallback_error}"
        self._log_audit(primary_name, None, True, fallback_name, hard_failure_reason)
        raise ValueError(f"Hard failure: Both {primary_name} and {fallback_name} failed. Reason: {hard_failure_reason}")
