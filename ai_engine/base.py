import json
import re
from typing import Any, Dict, Optional

class BaseAgent:
    """Base class for all InterviewGenie specialized agents."""
    
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role

    def clean_json_response(self, text: str) -> Dict[str, Any]:
        """Extracts and parses JSON object from LLM response text."""
        text = text.strip()
        # Remove markdown code fence if present
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()
            
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Fallback regex search for { ... }
            match = re.search(r'(\{.*\})', text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except Exception:
                    pass
            # If all fails, return structured dict
            return {"raw_content": text, "parse_error": True}
