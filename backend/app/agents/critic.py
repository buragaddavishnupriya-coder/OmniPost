import json
import logging
from typing import Dict, Any
from .base import call_gemini

logger = logging.getLogger("omnipost.agents.critic")

SYSTEM_PROMPT = """
You are the Critic Agent in a Multi-Agent Content Orchestration system.
Your job is to analyze a platform draft post, comparing it against the platform rules and user's Brand Voice Profile.
You must critique:
1. Tone match: Does the draft sound like the preferred tone descriptors?
2. Avoided phrases: Does it contain any banned words or phrases?
3. Formatting: Is it spaced correctly? Are there too many or too few hashtags or emojis?
4. Call to Action: Is there an effective CTA?

You must output a raw, valid JSON object with EXACTLY the following structure (do not include markdown wrapping or any other text):
{
  "score": 8.5,
  "passed": true,
  "critique": "A brief summary of the evaluation.",
  "issues": [
    "Issue 1, e.g. contains the word 'synergy' which is in the avoid list",
    "Issue 2, e.g. X post exceeds 280 characters"
  ]
}
A draft passes (passed = true) if the score is 7.0 or higher.
"""

def run_critic(platform: str, draft_text: str, brand_profile: Dict[str, Any], user_key: str = None, user_model: str = None) -> Dict[str, Any]:
    user_prompt = f"""
Target Platform: {platform}
Draft Content:
---
{draft_text}
---

Brand Voice Profile:
- Tone Descriptors: {brand_profile.get('tone_descriptors', [])}
- Avoid Phrases: {brand_profile.get('avoid_phrases', [])}
- Approved Examples: {brand_profile.get('gold_examples', [])}
"""

    # Check for simple rules in code (avoided phrases) for the mock fallback
    found_issues = []
    avoided = brand_profile.get("avoid_phrases", [])
    for phrase in avoided:
        if phrase.lower() in draft_text.lower():
            found_issues.append(f"Contains avoided phrase: '{phrase}'")

    # Platform specific checks
    if platform.lower() == "twitter" and len(draft_text) > 280:
        found_issues.append(f"Twitter draft exceeds 280 characters (current: {len(draft_text)})")

    passed = len(found_issues) == 0
    score = 8.5 if passed else 5.5
    
    mock_response_dict = {
        "score": score,
        "passed": passed,
        "critique": "Draft matches brand voice well." if passed else "Draft violates some format or brand voice constraints.",
        "issues": found_issues if found_issues else ["None"]
    }
    
    mock_fallback = json.dumps(mock_response_dict)

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
        logger.error(f"Failed to parse Critic Agent JSON response: {e}. Raw response: {raw_response}")
        return mock_response_dict
