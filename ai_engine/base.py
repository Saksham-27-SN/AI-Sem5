import json
import re
from typing import Any, Dict, Optional

class BaseAgent:
    """Base class for all InterviewGenie specialized agents."""
    
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role

    @staticmethod
    def safe_float(val: Any, default: float = 0.0) -> float:
        """Safely converts value to float with fallback."""
        if val is None:
            return default
        try:
            return float(val)
        except (ValueError, TypeError):
            return default

    def clean_json_response(self, text: str) -> Dict[str, Any]:
        """Extracts and parses JSON object from LLM response text."""
        if not text:
            return {"parse_error": True, "raw_content": ""}

        text = text.strip()
        # Remove markdown code fence if present
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        # Clean trailing commas before ] or }
        cleaned_text = re.sub(r',\s*([\]}])', r'\1', text)
        try:
            return json.loads(cleaned_text)
        except json.JSONDecodeError:
            # Fallback regex search for { ... }
            match = re.search(r'(\{.*\})', text, re.DOTALL)
            if match:
                matched_str = match.group(1)
                matched_cleaned = re.sub(r',\s*([\]}])', r'\1', matched_str)
                try:
                    return json.loads(matched_cleaned)
                except Exception:
                    pass
            # If all fails, return structured dict
            return {"raw_content": text, "parse_error": True}
