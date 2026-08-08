import json
import logging
from typing import Dict, Any
from .base import call_gemini

logger = logging.getLogger("omnipost.agents.analytic")

SYSTEM_PROMPT = """
You are the Analytic Agent in a Multi-Agent Content Orchestration system.
Your job is to analyze the final drafted post for a platform, predict its engagement potential, and scan for formatting risk flags.

You must output a raw, valid JSON object with EXACTLY the following structure (do not include markdown wrapping or any other text):
{
  "engagement_score": 8.2,
  "risk_flags": [
    "Flag 1 (e.g., Too long for Twitter, missing hashtags, hook is too weak, tone mismatch)"
  ],
  "recommendations": "A text recommendations string for improvement."
}
"""

def run_analytic(platform: str, draft_text: str, user_key: str = None, user_model: str = None) -> Dict[str, Any]:
    user_prompt = f"""
Target Platform: {platform}
Draft Content:
---
{draft_text}
---
"""

    # Create basic fallback metrics
    engagement = 7.5
    flags = []
    
    if platform.lower() == "twitter" and len(draft_text) > 280:
        flags.append("EXCEEDS_TWITTER_LIMIT")
        engagement = 3.0
    
    if len(draft_text.strip()) < 10:
        flags.append("TOO_SHORT")
        engagement = 1.5

    mock_response = {
        "engagement_score": engagement,
        "risk_flags": flags if flags else ["None"],
        "recommendations": "Strong hook. Keep formatting readable." if not flags else "Fix highlighted flags immediately."
    }

    mock_fallback = json.dumps(mock_response)

    raw_response = call_gemini(SYSTEM_PROMPT, user_prompt, mock_fallback, user_key=user_key, user_model=user_model)

    try:
        clean_response = raw_response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        clean_response = clean_response.strip()
        
        return json.loads(clean_response)
    except Exception as e:
        logger.error(f"Failed to parse Analytic Agent JSON response: {e}. Raw response: {raw_response}")
        return mock_response
