import json
import logging
from typing import Dict, Any
from .base import call_gemini

logger = logging.getLogger("omnipost.agents.strategy")

SYSTEM_PROMPT = """
You are the Strategy Agent in a Multi-Agent Content Orchestration system.
Your job is to analyze raw user content intent (a topic, draft, transcript, or link description) alongside their Brand Voice Profile, and output a structured content plan.

You must output a raw, valid JSON object with EXACTLY the following structure (do not include markdown wrapping like ```json or any other text):
{
  "platforms": ["list", "of", "platforms", "to", "target", "out", "of", "instagram", "linkedin", "twitter", "youtube", "facebook", "reddit"],
  "plan": {
    "platform_name": {
      "angle": "why this platform and what angle we take",
      "tone": "how the tone should shift specifically for this platform",
      "key_points": ["point 1", "point 2"]
    }
  }
}
Choose appropriate platforms from the input or default to reasonable ones (like linkedin, twitter, instagram).
"""

def run_strategy(raw_input: str, brand_profile: Dict[str, Any], requested_platforms: list = None, user_key: str = None, user_model: str = None) -> Dict[str, Any]:
    # Construct user prompt
    user_prompt = f"""
Raw Input Intent: {raw_input}
Requested Platforms: {requested_platforms if requested_platforms else 'Any relevant platforms'}

Brand Voice Profile:
- Tone Descriptors: {brand_profile.get('tone_descriptors', [])}
- Avoid Phrases: {brand_profile.get('avoid_phrases', [])}
- Approved Examples: {brand_profile.get('gold_examples', [])}
"""

    # Generate mock fallback
    target_platforms = requested_platforms if requested_platforms else ["linkedin", "twitter", "instagram"]
    mock_plan = {
        "platforms": target_platforms,
        "plan": {}
    }
    for platform in target_platforms:
        mock_plan["plan"][platform] = {
            "angle": f"Focusing on the core value proposition of the topic for {platform}.",
            "tone": f"Aligned to profile: {', '.join(brand_profile.get('tone_descriptors', ['Professional']))}",
            "key_points": [
                f"Introduce the main idea of '{raw_input[:30]}...'",
                "Provide a compelling, visual breakdown or takeaway",
                "End with an engaging call-to-action"
            ]
        }
    
    mock_fallback = json.dumps(mock_plan)

    raw_response = call_gemini(SYSTEM_PROMPT, user_prompt, mock_fallback, user_key=user_key, user_model=user_model)
    
    # Try parsing
    try:
        # Strip markdown if present
        clean_response = raw_response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        clean_response = clean_response.strip()
        
        return json.loads(clean_response)
    except Exception as e:
        logger.error(f"Failed to parse Strategy Agent JSON response: {e}. Raw response: {raw_response}")
        return mock_plan
