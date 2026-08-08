import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    brand_voice_profile_id = Column(Integer, nullable=True) # Reference to profile if cached, though relationship is clearer
    plan_tier = Column(String, default="free")
    anthropic_api_key = Column(String, nullable=True)
    gemini_api_key = Column(String, nullable=True)
    preferred_model = Column(String, default="gemini-2.5-flash")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    brand_voice_profile = relationship("BrandVoiceProfile", uselist=False, back_populates="user", cascade="all, delete-orphan")
    content_jobs = relationship("ContentJob", back_populates="user")
    agents = relationship("Agent", back_populates="user", cascade="all, delete-orphan")


class BrandVoiceProfile(Base):
    __tablename__ = "brand_voice_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Store lists as JSON
    tone_descriptors = Column(JSON, default=list) # e.g. ["professional", "insightful", "concise"]
    avoid_phrases = Column(JSON, default=list) # e.g. ["synergy", "paradigm shift"]
    gold_examples = Column(JSON, default=list) # list of dicts with platform and text
    
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="brand_voice_profile")

class ContentJob(Base):
    __tablename__ = "content_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    raw_input = Column(String, nullable=False)
    status = Column(String, default="pending") # pending, processing, completed, failed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="content_jobs")
    drafts = relationship("Draft", back_populates="content_job", cascade="all, delete-orphan")

class Draft(Base):
    __tablename__ = "drafts"

    id = Column(Integer, primary_key=True, index=True)
    content_job_id = Column(Integer, ForeignKey("content_jobs.id"), nullable=False)
    platform = Column(String, nullable=False) # instagram, linkedin, twitter, youtube, facebook, reddit
    body_text = Column(String, nullable=True)
    original_text = Column(String, nullable=True) # Keep agent's original generated text for memory training
    status = Column(String, default="drafting") # drafting, critiquing, optimizing, gated, awaiting_approval, approved, rejected, published
    critique_history = Column(JSON, default=list) # list of string critiques or structure
    quality_score = Column(Float, default=0.0)
    version = Column(Integer, default=1)
    scheduled_time = Column(DateTime, nullable=True) # None means unscheduled
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    content_job = relationship("ContentJob", back_populates="drafts")
    publish_records = relationship("PublishRecord", back_populates="draft", cascade="all, delete-orphan")

class PublishRecord(Base):
    __tablename__ = "publish_records"

    id = Column(Integer, primary_key=True, index=True)
    draft_id = Column(Integer, ForeignKey("drafts.id"), nullable=False)
    platform = Column(String, nullable=False)
    external_post_id = Column(String, nullable=True)
    status = Column(String, default="pending") # pending, success, failed
    published_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    draft = relationship("Draft", back_populates="publish_records")

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="active") # active, paused
    platforms = Column(JSON, default=list) # e.g. ["instagram", "linkedin"]
    frequency = Column(String, default="Daily") # Hourly, Daily, Custom
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="agents")

