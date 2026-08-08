import logging
from typing import Dict, Any
from .base import call_gemini

logger = logging.getLogger("omnipost.agents.writer")

SYSTEM_PROMPT = """
You are a Platform Writer Agent in a Multi-Agent Content Orchestration system.
Your job is to take a content plan, raw user input, and the user's Brand Voice Profile, and craft a single, highly-engaging post for your target platform.

Adhere strictly to:
- Platform format constraints:
  * linkedin: Professional tone, clear spacing, hooks, actionable summary, minimal emoji, professional call-to-action.
  * twitter/X: Very concise, punchy, fits within 280 characters, strong hook, minimal hashtags (1-2 max).
  * instagram: Visual narrative, engaging hook, spacing for readability, relevant hashtags (3-5 max), emoji friendly.
  * youtube: Compelling video title options and an engaging description with timestamps draft and CTA.
  * facebook: Personal/community angle, conversational tone, clear CTA.
  * reddit: Thread format with a title, objective value, no sales pitch, conversational/informal tone.
- Brand Voice Profile rules (tone descriptors, emojis habits, avoid phrases).
- Do not add any conversational meta-text (like "Here is your draft:"), just output the raw post content.
"""

def run_writer(platform: str, raw_input: str, platform_plan: Dict[str, Any], brand_profile: Dict[str, Any], user_key: str = None, user_model: str = None) -> str:
    user_prompt = f"""
Target Platform: {platform}
Raw Input: {raw_input}
Platform Strategy/Plan: {platform_plan}

Brand Voice Profile:
- Tone Descriptors: {brand_profile.get('tone_descriptors', [])}
- Avoid Phrases: {brand_profile.get('avoid_phrases', [])}
- Approved Examples: {brand_profile.get('gold_examples', [])}
"""

    # Simple extraction of Brand and Product Name for high-quality mock copy
    import re
    brand_name = "NeuraGlow Labs"
    product_name = "NeuraSkin AI Serum"
    
    brand_match = re.search(r"Brand\s*Name:\s*(.*)", raw_input, re.IGNORECASE)
    if brand_match:
        brand_name = brand_match.group(1).strip()
    product_match = re.search(r"Product\s*Name:\s*(.*)", raw_input, re.IGNORECASE)
    if product_match:
        product_name = product_match.group(1).strip()

    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', raw_input.strip()) if s.strip()]
    first_sentence = sentences[0] if sentences else raw_input.strip()
    if first_sentence.endswith('.'):
        first_sentence = first_sentence[:-1]

    # Create high-quality dynamic mock drafts for all platforms
    mock_drafts = {
        "linkedin": (
            f"💡 Introducing {product_name} by {brand_name} — the next evolution in skincare technology:\n\n"
            f"The skincare industry is officially entering the AI era. No more trial-and-error routines. "
            f"With real-time smartphone app analysis and an adaptive formula that calibrates to your daily skin health, "
            f"this is skincare optimized by data.\n\n"
            f"Key Takeaways:\n"
            f"1️⃣ AI-powered skin analysis via app tracking.\n"
            f"2️⃣ Adaptive formula adjusting to texture, acne, and glow.\n"
            f"3️⃣ Clean, vegan, lightweight, and dermatologically safe ingredients.\n\n"
            f"The future of personalized wellness is here. Let's discuss in the comments! 👇\n\n"
            f"#Innovation #BeautyTech #Skincare #AI"
        ),
        "twitter": (
            f"🔥 The future of skincare is here. Meet {product_name} by {brand_name}. "
            f"An adaptive formula backed by mobile AI skin analysis to eliminate trial-and-error routines. "
            f"Lightweight, vegan, and science-backed. Join the future: #SkincareTech"
        ),
        "instagram": (
            f"✨ Transforming the narrative: {product_name} by {brand_name} ✨\n\n"
            f"Skincare meets AI. Scan your skin on our mobile app, and watch the formula adapt to your texture, acne, and glow in real-time. Lightweight, non-sticky, clean, and 100% vegan.\n\n"
            f"💬 Ready to upgrade your routine? Drop a comment below!\n\n"
            f"#BeautyTech #Aesthetics #Skincare #Innovation #NeuraSkin"
        ),
        "youtube": (
            f"🎥 Title Ideas:\n"
            f"1. AI Skincare is Here: {brand_name} {product_name} Review!\n"
            f"2. Master Your Skincare Routine with {product_name}\n"
            f"3. The Science Behind NeuraSkin AI Serum\n\n"
            f"Description:\n"
            f"In this video, we review {product_name} from {brand_name} and explore the future of AI-powered skincare.\n\n"
            f"Make sure to subscribe for more tutorials!\n\n"
            f"Timestamps:\n"
            f"0:00 - Introduction\n"
            f"1:30 - Core Concepts of AI Skincare\n"
            f"4:45 - Practical Demonstration\n"
            f"8:15 - Final Summary & Takeaways"
        ),
        "facebook": (
            f"Hey everyone! I wanted to share my thoughts on {product_name} from {brand_name}:\n\n"
            f"This is a game-changer. An adaptive formula that changes based on your skin condition, tracked daily through their mobile app. Lightweight, vegan, and clean ingredients.\n\n"
            f"Let me know what you think in the comments! Have a great week ahead."
        ),
        "reddit": (
            f"Title: Thoughts on the new AI-powered skincare from {brand_name}?\n\n"
            f"Body: I've been checking out {product_name} and wanted to share my breakdown:\n\n"
            f"It's a clean, vegan, lightweight serum that uses AI skin analysis via a mobile app to adapt to your skin condition. Eliminates trial-and-error skincare.\n\n"
            f"What do you guys think? Is this the right approach or is there a better way to do it?"
        )
    }
    
    mock_fallback = mock_drafts.get(platform.lower(), f"Draft for {platform}:\n\n{raw_input.strip()}")
  
    return call_gemini(SYSTEM_PROMPT, user_prompt, mock_fallback, user_key=user_key, user_model=user_model).strip()
