import logging
import traceback
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from .models import ContentJob, Draft, BrandVoiceProfile, User
from .agents import run_strategy, run_writer, run_critic, run_optimizer, run_analytic, run_memory_update

logger = logging.getLogger("omnipost.orchestrator")

def run_agent_pipeline_sync(db: Session, job_id: int, requested_platforms: List[str] = None):
    """
    Runs the multi-agent orchestration pipeline for a content job.
    Updates the database with real-time progress.
    Designed to run in background tasks.
    """
    logger.info(f"Starting orchestration pipeline for job {job_id}")
    
    # 1. Fetch ContentJob and User
    job = db.query(ContentJob).filter(ContentJob.id == job_id).first()
    if not job:
        logger.error(f"Job {job_id} not found")
        return
        
    user = db.query(User).filter(User.id == job.user_id).first()
    user_key = user.gemini_api_key if user else None
    user_model = user.preferred_model if user else None
    
    job.status = "processing"
    db.commit()
    
    try:
        # 2. Fetch or create User Brand Voice Profile
        profile = db.query(BrandVoiceProfile).filter(BrandVoiceProfile.user_id == job.user_id).first()
        if not profile:
            profile = BrandVoiceProfile(
                user_id=job.user_id,
                tone_descriptors=["professional", "engaging", "clear"],
                avoid_phrases=["synergy", "paradigm shift"],
                gold_examples=[]
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
        
        profile_dict = {
            "tone_descriptors": profile.tone_descriptors,
            "avoid_phrases": profile.avoid_phrases,
            "gold_examples": profile.gold_examples
        }

        # 3. Strategy Agent execution
        strategy_res = run_strategy(job.raw_input, profile_dict, requested_platforms, user_key=user_key, user_model=user_model)
        target_platforms = strategy_res.get("platforms", requested_platforms or ["linkedin", "twitter", "instagram"])
        plans = strategy_res.get("plan", {})
        
        logger.info(f"Strategy complete. Target platforms: {target_platforms}")

        # 4. Generate platform-specific drafts in parallel-like fashion
        for platform in target_platforms:
            platform_plan = plans.get(platform, {
                "angle": "Standard summary of the raw input.",
                "tone": "Aligned to brand voice.",
                "key_points": ["Discuss the core input point."]
            })
            
            # Create a blank draft record
            draft = Draft(
                content_job_id=job_id,
                platform=platform,
                body_text="",
                status="drafting",
                critique_history=[],
                quality_score=0.0,
                version=1
            )
            db.add(draft)
            db.commit()
            db.refresh(draft)
            
            try:
                # Drafting Phase
                logger.info(f"Drafting post for platform: {platform}")
                draft.body_text = run_writer(platform, job.raw_input, platform_plan, profile_dict, user_key=user_key, user_model=user_model)
                draft.status = "critiquing"
                db.commit()

                # Critic-Optimizer Loop (max 2 iterations)
                max_iterations = 2
                for i in range(max_iterations):
                    logger.info(f"Critiquing draft for {platform} (iteration {i+1})")
                    critic_res = run_critic(platform, draft.body_text, profile_dict, user_key=user_key, user_model=user_model)
                    
                    # Update critique history (ensure it remains a serializable list)
                    history = list(draft.critique_history) if draft.critique_history else []
                    critique_summary = f"Iter {i+1}: Score={critic_res.get('score', 0)} | {critic_res.get('critique', '')} | Issues={critic_res.get('issues', [])}"
                    history.append(critique_summary)
                    draft.critique_history = history
                    db.commit()
                    
                    if critic_res.get("passed", False) or i == max_iterations - 1:
                        # Passed or hit limit
                        break
                    
                    # Optimize
                    draft.status = "optimizing"
                    db.commit()
                    logger.info(f"Optimizing draft for {platform} due to critic issues")
                    draft.body_text = run_optimizer(
                        platform, 
                        draft.body_text, 
                        critic_res.get("issues", []), 
                        profile_dict,
                        user_key=user_key,
                        user_model=user_model
                    )
                    draft.version += 1
                    draft.status = "critiquing"
                    db.commit()

                # Analytic Agent Scoring
                logger.info(f"Running analytics for {platform}")
                draft.status = "analyzing"
                db.commit()
                analytic_res = run_analytic(platform, draft.body_text, user_key=user_key, user_model=user_model)
                score = analytic_res.get("engagement_score", 7.0)
                draft.quality_score = float(score)
                db.commit()

                # Quality Gate
                # Let's say quality bar is 5.0 out of 10.0 for passing
                draft.original_text = draft.body_text
                if score >= 5.0:
                    draft.status = "awaiting_approval"
                else:
                    draft.status = "gated"
                db.commit()
                logger.info(f"Draft for {platform} complete. Status: {draft.status}, Score: {score}")

            except Exception as platform_err:
                logger.error(f"Error processing platform {platform}: {platform_err}")
                logger.error(traceback.format_exc())
                draft.status = "failed"
                db.commit()

        # 5. Mark job as completed
        job.status = "completed"
        db.commit()
        logger.info(f"Orchestration pipeline complete for job {job_id}")

    except Exception as job_err:
        logger.error(f"Error executing orchestration pipeline for job {job_id}: {job_err}")
        logger.error(traceback.format_exc())
        job.status = "failed"
        db.commit()

def update_brand_voice_from_approved_draft(db: Session, user_id: int, original_text: str, approved_text: str, platform: str):
    """
    Runs the Brand Voice Memory learning module and persists updates back to the DB.
    """
    logger.info(f"Running Brand Voice learning loop for user {user_id} on {platform}")
    
    # Fetch User settings for memory training
    user = db.query(User).filter(User.id == user_id).first()
    user_key = user.gemini_api_key if user else None
    user_model = user.preferred_model if user else None
    
    profile = db.query(BrandVoiceProfile).filter(BrandVoiceProfile.user_id == user_id).first()
    if not profile:
        profile = BrandVoiceProfile(
            user_id=user_id,
            tone_descriptors=["professional", "engaging", "clear"],
            avoid_phrases=["synergy", "paradigm shift"],
            gold_examples=[]
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    profile_dict = {
        "tone_descriptors": profile.tone_descriptors,
        "avoid_phrases": profile.avoid_phrases,
        "gold_examples": profile.gold_examples
    }

    try:
        memory_updates = run_memory_update(platform, original_text, approved_text, profile_dict, user_key=user_key, user_model=user_model)
        
        # 1. Update tone descriptors
        current_tones = set(profile.tone_descriptors)
        for add_tone in memory_updates.get("add_tone_descriptors", []):
            current_tones.add(add_tone.strip().lower())
        for remove_tone in memory_updates.get("remove_tone_descriptors", []):
            current_tones.discard(remove_tone.strip().lower())
        profile.tone_descriptors = list(current_tones)

        # 2. Update avoid phrases
        current_avoid = set(profile.avoid_phrases)
        for avoid in memory_updates.get("add_avoid_phrases", []):
            current_avoid.add(avoid.strip().lower())
        profile.avoid_phrases = list(current_avoid)

        # 3. Add gold example
        gold_ex = memory_updates.get("new_gold_example")
        if gold_ex:
            # We want to store gold examples as dictionaries: {"platform": platform, "text": text}
            current_gold = list(profile.gold_examples) if profile.gold_examples else []
            # Check if this post is already present
            exists = any(item.get("text") == gold_ex for item in current_gold)
            if not exists:
                current_gold.append({"platform": platform, "text": gold_ex})
                # Cap gold examples at 5 elements to keep prompts tidy
                if len(current_gold) > 5:
                    current_gold = current_gold[-5:]
                profile.gold_examples = current_gold
        
        db.commit()
        logger.info(f"Successfully updated brand voice profile for user {user_id}")
    except Exception as e:
        logger.error(f"Error updating brand voice memory for user {user_id}: {e}")
        db.rollback()

