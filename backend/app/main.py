import logging
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .database import get_db, engine, Base
from .models import User, BrandVoiceProfile, ContentJob, Draft, PublishRecord, Agent
from .schemas import (
    UserSignUp, UserLogin, Token, BrandVoiceProfileResponse, 
    BrandVoiceProfileUpdate, DraftResponse, DraftPatch, 
    DraftRegenerate, ContentJobCreate, ContentJobResponse, PublishRecordResponse,
    DraftCreate, AgentResponse, AgentCreate, AgentUpdate,
    UserSettingsResponse, UserSettingsUpdate
)
from .auth import get_password_hash, verify_password, create_access_token, get_current_user
from .orchestrator import run_agent_pipeline_sync, update_brand_voice_from_approved_draft
from .agents import run_optimizer, run_critic, run_analytic


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("omnipost.api")

# Initialize database tables and run lightweight migrations
import sqlite3
try:
    conn = sqlite3.connect("omnipost.db")
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in cursor.fetchall()]
    if "anthropic_api_key" not in columns:
        logger.info("Migrating database: adding 'anthropic_api_key' column to users table")
        cursor.execute("ALTER TABLE users ADD COLUMN anthropic_api_key TEXT")
    if "gemini_api_key" not in columns:
        logger.info("Migrating database: adding 'gemini_api_key' column to users table")
        cursor.execute("ALTER TABLE users ADD COLUMN gemini_api_key TEXT")
    if "preferred_model" not in columns:
        logger.info("Migrating database: adding 'preferred_model' column to users table")
        cursor.execute("ALTER TABLE users ADD COLUMN preferred_model TEXT DEFAULT 'gemini-2.5-flash'")
    conn.commit()
    conn.close()
except Exception as e:
    logger.error(f"Failed to run auto-migration: {e}")

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Omnipost API Gateway", version="1.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, configure this correctly
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Authentication Endpoints ---

@app.post("/auth/signup", response_model=Token)
def signup(user_data: UserSignUp, db: Session = Depends(get_db)):
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = get_password_hash(user_data.password)
    user = User(email=user_data.email, password_hash=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize Brand Voice Profile for the user
    profile = BrandVoiceProfile(
        user_id=user.id,
        tone_descriptors=["professional", "informative", "approachable"],
        avoid_phrases=["synergy", "disruptive", "paradigm shift"],
        gold_examples=[]
    )
    db.add(profile)

    # Initialize Default Agents
    default_agents = [
        Agent(
            user_id=user.id,
            name="Growth Bot",
            description="Analyzes market trends and optimizes ad spend across social platforms in real-time.",
            status="active",
            platforms=["instagram", "linkedin", "twitter"],
            frequency="Daily"
        ),
        Agent(
            user_id=user.id,
            name="Support Specialist",
            description="Handles Level-1 customer inquiries and schedules complex issues for human review.",
            status="active",
            platforms=["facebook", "linkedin"],
            frequency="Hourly"
        ),
        Agent(
            user_id=user.id,
            name="Data Miner",
            description="Extracts structured data from unstructured documentation and synchronizes with CRM.",
            status="paused",
            platforms=["twitter"],
            frequency="Daily"
        ),
        Agent(
            user_id=user.id,
            name="Quality Sentry",
            description="Monitors code commits for security vulnerabilities and architectural inconsistencies.",
            status="active",
            platforms=["linkedin"],
            frequency="Hourly"
        )
    ]
    for agent in default_agents:
        db.add(agent)

    db.commit()
    db.refresh(profile)

    # Automatically log them in and return token
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/auth/login", response_model=Token)
def login(
    user_data: UserLogin, 
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# --- User Settings Endpoints ---

@app.get("/users/settings", response_model=UserSettingsResponse)
def get_user_settings(current_user: User = Depends(get_current_user)):
    masked_key = None
    if current_user.gemini_api_key:
        key = current_user.gemini_api_key
        if len(key) > 10:
            masked_key = f"{key[:8]}••••••••{key[-4:]}"
        else:
            masked_key = "••••••••"
            
    masked_anthropic = None
    if current_user.anthropic_api_key:
        key = current_user.anthropic_api_key
        if len(key) > 10:
            masked_anthropic = f"{key[:8]}••••••••{key[-4:]}"
        else:
            masked_anthropic = "••••••••"
            
    return UserSettingsResponse(
        anthropic_api_key=masked_anthropic,
        gemini_api_key=masked_key,
        preferred_model=current_user.preferred_model or "gemini-2.5-flash"
    )

@app.put("/users/settings", response_model=UserSettingsResponse)
def update_user_settings(
    settings_data: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == current_user.id).first()
    
    if settings_data.preferred_model is not None:
        user.preferred_model = settings_data.preferred_model
        
    if settings_data.gemini_api_key is not None:
        key_input = settings_data.gemini_api_key.strip()
        if "••••" in key_input:
            pass # Keep existing key
        else:
            user.gemini_api_key = key_input if key_input else None

    if settings_data.anthropic_api_key is not None:
        key_input = settings_data.anthropic_api_key.strip()
        if "••••" in key_input:
            pass # Keep existing key
        else:
            user.anthropic_api_key = key_input if key_input else None
            
    db.commit()
    db.refresh(user)
    
    masked_key = None
    if user.gemini_api_key:
        key = user.gemini_api_key
        if len(key) > 10:
            masked_key = f"{key[:8]}••••••••{key[-4:]}"
        else:
            masked_key = "••••••••"

    masked_anthropic = None
    if user.anthropic_api_key:
        key = user.anthropic_api_key
        if len(key) > 10:
            masked_anthropic = f"{key[:8]}••••••••{key[-4:]}"
        else:
            masked_anthropic = "••••••••"
            
    return UserSettingsResponse(
        anthropic_api_key=masked_anthropic,
        gemini_api_key=masked_key,
        preferred_model=user.preferred_model or "gemini-2.5-flash"
    )

@app.post("/users/settings/test")
def test_user_llm_connection(
    settings_data: UserSettingsUpdate,
    current_user: User = Depends(get_current_user)
):
    key = settings_data.gemini_api_key
    if key and "••••" in key:
        key = current_user.gemini_api_key
    elif not key:
        key = current_user.gemini_api_key
        
    model = settings_data.preferred_model or current_user.preferred_model or "gemini-2.5-flash"
    
    # Handle old/claude model settings fallback
    if not model or "claude" in model.lower():
        model = "gemini-2.5-flash"

    if not key:
        raise HTTPException(
            status_code=400,
            detail="No Gemini API key provided or saved."
        )
        
    try:
        from google import genai
        client = genai.Client(api_key=key)
        client.models.generate_content(
            model=model,
            contents="Say connection test ok."
        )
        return {"status": "success", "message": "Successfully connected to Google Gemini!"}
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Gemini API connection test failed: {str(e)}"
        )


# --- Content Jobs & Orchestration Endpoints ---

@app.post("/content-jobs", response_model=ContentJobResponse)
def create_content_job(
    job_data: ContentJobCreate, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Create Content Job entry
    job = ContentJob(
        user_id=current_user.id,
        raw_input=job_data.raw_input,
        status="pending"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Launch multi-agent pipeline in backend background task
    background_tasks.add_task(
        run_agent_pipeline_sync,
        db=Session(bind=engine), # Use a fresh thread-safe DB session
        job_id=job.id,
        requested_platforms=job_data.platforms
    )

    return job

@app.get("/content-jobs/{id}", response_model=ContentJobResponse)
def get_content_job(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    job = db.query(ContentJob).filter(ContentJob.id == id, ContentJob.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Content job not found")
    return job

# --- Draft Manipulation Endpoints ---

@app.patch("/drafts/{id}", response_model=DraftResponse)
def edit_draft(
    id: int, 
    patch_data: DraftPatch, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    draft = db.query(Draft).join(ContentJob).filter(Draft.id == id, ContentJob.user_id == current_user.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    if patch_data.body_text is not None:
        draft.body_text = patch_data.body_text
        draft.version += 1
    if patch_data.scheduled_time is not None:
        draft.scheduled_time = patch_data.scheduled_time
    if patch_data.status is not None:
        draft.status = patch_data.status
        
    db.commit()
    db.refresh(draft)
    return draft

@app.post("/drafts/{id}/regenerate", response_model=DraftResponse)
def regenerate_draft(
    id: int, 
    regen_data: DraftRegenerate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Re-run optimizer with user instruction
    draft = db.query(Draft).join(ContentJob).filter(Draft.id == id, ContentJob.user_id == current_user.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    # Fetch brand profile
    profile = db.query(BrandVoiceProfile).filter(BrandVoiceProfile.user_id == current_user.id).first()
    profile_dict = {
        "tone_descriptors": profile.tone_descriptors if profile else [],
        "avoid_phrases": profile.avoid_phrases if profile else [],
        "gold_examples": profile.gold_examples if profile else []
    }

    try:
        draft.status = "optimizing"
        db.commit()

        # Run optimizer using custom user feedback
        revised_text = run_optimizer(
            draft.platform,
            draft.body_text,
            [],
            profile_dict,
            user_feedback=regen_data.feedback,
            user_key=current_user.anthropic_api_key,
            user_model=current_user.preferred_model
        )

        # Run critic and analytics again on the revision
        critic_res = run_critic(
            draft.platform,
            revised_text,
            profile_dict,
            user_key=current_user.anthropic_api_key,
            user_model=current_user.preferred_model
        )
        history = list(draft.critique_history) if draft.critique_history else []
        history.append(f"User Regenerate: {regen_data.feedback} | Score={critic_res.get('score', 0)} | issues={critic_res.get('issues', [])}")
        
        analytic_res = run_analytic(
            draft.platform,
            revised_text,
            user_key=current_user.anthropic_api_key,
            user_model=current_user.preferred_model
        )
        score = analytic_res.get("engagement_score", 7.0)

        draft.body_text = revised_text
        draft.critique_history = history
        draft.quality_score = float(score)
        draft.version += 1

        if score >= 5.0:
            draft.status = "awaiting_approval"
        else:
            draft.status = "gated"

        db.commit()
        db.refresh(draft)
        return draft
    except Exception as e:
        logger.error(f"Error during regeneration: {e}")
        draft.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Regeneration failed: {str(e)}")

@app.post("/drafts/{id}/approve", response_model=DraftResponse)
def approve_draft(
    id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    draft = db.query(Draft).join(ContentJob).filter(Draft.id == id, ContentJob.user_id == current_user.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    # Run Brand Voice Memory learning if there is a difference between original agent text and user approved text
    if draft.original_text and draft.body_text and (draft.original_text.strip() != draft.body_text.strip()):
        # Run asynchronously to avoid blocking user response
        logger.info("Content divergence detected. Learning brand voice signals...")
        try:
            update_brand_voice_from_approved_draft(
                db, 
                current_user.id, 
                draft.original_text, 
                draft.body_text, 
                draft.platform
            )
        except Exception as e:
            logger.error(f"Failed to learn brand voice updates: {e}")
    
    draft.status = "approved"
    db.commit()
    db.refresh(draft)
    return draft

@app.post("/drafts/{id}/publish", response_model=PublishRecordResponse)
def publish_draft(
    id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    draft = db.query(Draft).join(ContentJob).filter(Draft.id == id, ContentJob.user_id == current_user.id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    # 1. Create a PublishRecord entry
    publish_rec = PublishRecord(
        draft_id=draft.id,
        platform=draft.platform,
        external_post_id=f"ext_{draft.platform}_mocked_{draft.id}",
        status="success"
    )
    db.add(publish_rec)
    
    # 2. Mark draft as published
    draft.status = "published"
    db.commit()
    db.refresh(publish_rec)
    db.refresh(draft)
    
    return publish_rec

# --- Brand Voice Profile Endpoints ---

@app.get("/brand-voice-profile", response_model=BrandVoiceProfileResponse)
def get_brand_voice_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(BrandVoiceProfile).filter(BrandVoiceProfile.user_id == current_user.id).first()
    if not profile:
        # Create default if not found
        profile = BrandVoiceProfile(
            user_id=current_user.id,
            tone_descriptors=["professional", "informative", "approachable"],
            avoid_phrases=["synergy", "disruptive", "paradigm shift"],
            gold_examples=[]
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@app.put("/brand-voice-profile", response_model=BrandVoiceProfileResponse)
def update_brand_voice_profile(
    profile_data: BrandVoiceProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(BrandVoiceProfile).filter(BrandVoiceProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    if profile_data.tone_descriptors is not None:
        profile.tone_descriptors = profile_data.tone_descriptors
    if profile_data.avoid_phrases is not None:
        profile.avoid_phrases = profile_data.avoid_phrases
    if profile_data.gold_examples is not None:
        # Map objects to dicts for JSON column
        profile.gold_examples = [example.dict() for example in profile_data.gold_examples]
        
    db.commit()
    db.refresh(profile)
    return profile

# --- Additional Multi-Screen Endpoints ---

@app.get("/drafts", response_model=List[DraftResponse])
def get_all_drafts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    drafts = db.query(Draft).join(ContentJob).filter(
        ContentJob.user_id == current_user.id
    ).order_by(Draft.updated_at.desc()).all()
    return drafts

@app.post("/drafts", response_model=List[DraftResponse])
def create_manual_drafts(
    draft_data: DraftCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Create content job
    job = ContentJob(
        user_id=current_user.id,
        raw_input="Manual Composition",
        status="completed"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    
    created_drafts = []
    # 2. For each platform create a draft
    for platform in draft_data.platforms:
        draft = Draft(
            content_job_id=job.id,
            platform=platform,
            body_text=draft_data.body_text,
            original_text=draft_data.body_text,
            status="approved" if draft_data.scheduled_time else "drafting",
            critique_history=["Human composed post."],
            quality_score=7.5,
            version=1,
            scheduled_time=draft_data.scheduled_time
        )
        db.add(draft)
        created_drafts.append(draft)
        
    db.commit()
    for d in created_drafts:
        db.refresh(d)
        
    return created_drafts

@app.get("/agents", response_model=List[AgentResponse])
def get_agents(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    agents = db.query(Agent).filter(Agent.user_id == current_user.id).all()
    return agents

@app.post("/agents", response_model=AgentResponse)
def create_agent(
    agent_data: AgentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    agent = Agent(
        user_id=current_user.id,
        name=agent_data.name,
        description=agent_data.description,
        platforms=agent_data.platforms,
        frequency=agent_data.frequency,
        status="active"
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent

@app.patch("/agents/{id}", response_model=AgentResponse)
def update_agent(
    id: int,
    agent_data: AgentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    agent = db.query(Agent).filter(Agent.id == id, Agent.user_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    if agent_data.name is not None:
        agent.name = agent_data.name
    if agent_data.description is not None:
        agent.description = agent_data.description
    if agent_data.status is not None:
        agent.status = agent_data.status
    if agent_data.platforms is not None:
        agent.platforms = agent_data.platforms
    if agent_data.frequency is not None:
        agent.frequency = agent_data.frequency
        
    db.commit()
    db.refresh(agent)
    return agent

@app.delete("/agents/{id}")
def delete_agent(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    agent = db.query(Agent).filter(Agent.id == id, Agent.user_id == current_user.id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    db.delete(agent)
    db.commit()
    return {"message": "Agent deleted successfully"}

@app.get("/analytics/overview")
def get_analytics_overview(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Fetch published drafts
    published_drafts = db.query(Draft).join(ContentJob).filter(
        ContentJob.user_id == current_user.id,
        Draft.status == "published"
    ).all()
    
    total_posts = 12 + len(published_drafts)
    
    scores = [d.quality_score for d in published_drafts if d.quality_score]
    if scores:
        avg_score = sum(scores) / len(scores)
        avg_engagement = f"{round(avg_score * 0.7, 1)}%"
    else:
        avg_engagement = "4.8%"
        
    follower_growth = "+12%"
    
    engagement_over_time = [
        {"date": "01 Oct", "value": 150},
        {"date": "07 Oct", "value": 120},
        {"date": "14 Oct", "value": 140},
        {"date": "21 Oct", "value": 100},
        {"date": "30 Oct", "value": 180}
    ]
    if published_drafts:
        engagement_over_time[-1]["value"] += len(published_drafts) * 15
        
    content_strategy = {
        "video": 82,
        "carousel": 65,
        "static": 41,
        "stories": 94
    }
    
    top_posts = []
    for d in published_drafts[:5]:
        reach_val = int((d.quality_score or 7.0) * 1234)
        ctr_val = round((d.quality_score or 7.0) * 0.4, 2)
        top_posts.append({
            "id": d.id,
            "body_text": d.body_text,
            "platform": d.platform,
            "reach": f"{round(reach_val/1000, 1)}k" if reach_val >= 1000 else str(reach_val),
            "engagement": f"{round((d.quality_score or 7.0)*0.7, 1)}%",
            "ctr": f"{ctr_val}%",
            "date": d.updated_at.strftime("%Y-%m-%d")
        })
        
    if not top_posts:
        top_posts = [
            {
                "id": 9991,
                "body_text": "Launch of our Q4 Roadmap. Elevating the digital workspace.",
                "platform": "instagram",
                "reach": "42.5k",
                "engagement": "8.2%",
                "ctr": "3.1%",
                "date": "2 days ago"
            },
            {
                "id": 9992,
                "body_text": "The future of SaaS analytics. Deep dive into the data that drove our latest...",
                "platform": "linkedin",
                "reach": "18.9k",
                "engagement": "12.4%",
                "ctr": "5.8%",
                "date": "4 days ago"
            },
            {
                "id": 9993,
                "body_text": "How we scaled our team... Quick Update: New Features Live!",
                "platform": "twitter",
                "reach": "94.2k",
                "engagement": "4.1%",
                "ctr": "1.2%",
                "date": "1 week ago"
            }
        ]
        
    return {
        "kpis": {
            "total_posts": total_posts,
            "engagement_rate": avg_engagement,
            "follower_growth": follower_growth
        },
        "charts": {
            "engagement_over_time": engagement_over_time,
            "content_strategy": content_strategy
        },
        "top_posts": top_posts
    }

