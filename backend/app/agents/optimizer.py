import logging
from typing import Dict, Any, List
from .base import call_gemini

logger = logging.getLogger("omnipost.agents.optimizer")

SYSTEM_PROMPT = """
You are the Optimizer Agent in a Multi-Agent Content Orchestration system.
Your job is to revise a platform draft post based on feedback from the Critic Agent or the User.

IMPORTANT: Do not rewrite the post from scratch. Maintain the structure and core content. Edit it surgically to fix the specific issues listed.
Do not output any conversational meta-text (like "Here is the revised draft:"), just output the raw revised post content.
"""

def run_optimizer(platform: str, draft_text: str, issues: List[str], brand_profile: Dict[str, Any], user_feedback: str = None, user_key: str = None, user_model: str = None) -> str:
    feedback_str = f"Critic Issues: {issues}"
    if user_feedback:
        feedback_str += f"\nUser Instruction: {user_feedback}"

    user_prompt = f"""
Target Platform: {platform}
Current Draft Content:
---
{draft_text}
---

Critique Feedback to apply:
{feedback_str}

Brand Voice Profile:
- Tone Descriptors: {brand_profile.get('tone_descriptors', [])}
- Avoid Phrases: {brand_profile.get('avoid_phrases', [])}
"""

    # Mock surgical revision
    revised_text = draft_text
    
    # Simple code-based replacements for mock mode
    avoided = brand_profile.get("avoid_phrases", [])
    for phrase in avoided:
        if phrase.lower() in revised_text.lower():
            # Replace phrase with standard equivalent
            import re
            revised_text = re.sub(re.escape(phrase), "innovation", revised_text, flags=re.IGNORECASE)

    # If it was Twitter and too long, truncate it
    if platform.lower() == "twitter" and len(revised_text) > 280:
        revised_text = revised_text[:270] + "..."

    # If there is user feedback, add a placeholder indicating it was optimized with user feedback
    if user_feedback:
        revised_text = f"{revised_text}\n\n*(Note: Optimized based on feedback: {user_feedback})*"

    return call_gemini(SYSTEM_PROMPT, user_prompt, revised_text, user_key=user_key, user_model=user_model).strip()
