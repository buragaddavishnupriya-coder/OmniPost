import logging
from google import genai
from google.genai import types
from ..config import settings

logger = logging.getLogger("omnipost.agents")

# Initialize client if key is set
client = None
if settings.GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize Gemini client: {e}")

def call_gemini(system_prompt: str, user_prompt: str, mock_fallback_content: str, user_key: str = None, user_model: str = None) -> str:
    """
    Call Gemini via Google GenAI API, or fallback to mock content if API key is missing.
    """
    api_key = user_key or settings.GEMINI_API_KEY
    model = user_model or "gemini-2.5-flash"
    
    # Handle old/claude model settings fallback
    if not model or "claude" in model.lower():
        model = "gemini-2.5-flash"
    
    if api_key:
        try:
            logger.info(f"Calling Gemini API with model: {model}...")
            request_client = genai.Client(api_key=api_key)
            response = request_client.models.generate_content(
                model=model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    systemInstruction=system_prompt,
                )
            )
            return response.text
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}. Falling back to mocked content.")
            # return mock response on error to keep system robust
            return mock_fallback_content
    else:
        logger.info("No Gemini API key found. Using mocked agent response.")
        return mock_fallback_content
