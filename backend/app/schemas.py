from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

# Auth Schemas
class UserSignUp(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# User LLM Settings Schemas
class UserSettingsResponse(BaseModel):
    anthropic_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    preferred_model: str

    class Config:
        from_attributes = True

class UserSettingsUpdate(BaseModel):
    anthropic_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    preferred_model: Optional[str] = None

# Brand Voice Schemas
class GoldExample(BaseModel):
    platform: str
    text: str

class BrandVoiceProfileResponse(BaseModel):
    id: int
    user_id: int
    tone_descriptors: List[str]
    avoid_phrases: List[str]
    gold_examples: List[GoldExample]
    updated_at: datetime

    class Config:
        from_attributes = True

class BrandVoiceProfileUpdate(BaseModel):
    tone_descriptors: Optional[List[str]] = None
    avoid_phrases: Optional[List[str]] = None
    gold_examples: Optional[List[GoldExample]] = None

# Draft Schemas
class DraftResponse(BaseModel):
    id: int
    content_job_id: int
    platform: str
    body_text: Optional[str] = None
    status: str
    critique_history: List[str]
    quality_score: float
    version: int
    scheduled_time: Optional[datetime] = None
    updated_at: datetime

    class Config:
        from_attributes = True

class DraftPatch(BaseModel):
    body_text: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    status: Optional[str] = None

class DraftCreate(BaseModel):
    body_text: str
    platforms: List[str]
    scheduled_time: Optional[datetime] = None

class DraftRegenerate(BaseModel):
    feedback: str

# Agent Schemas
class AgentResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str] = None
    status: str
    platforms: List[str]
    frequency: str
    created_at: datetime

    class Config:
        from_attributes = True

class AgentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    platforms: List[str]
    frequency: str

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    platforms: Optional[List[str]] = None
    frequency: Optional[str] = None


# Content Job Schemas
class ContentJobCreate(BaseModel):
    raw_input: str
    platforms: Optional[List[str]] = None # custom platform list if wanted, defaults to all

class ContentJobResponse(BaseModel):
    id: int
    user_id: int
    raw_input: str
    status: str
    created_at: datetime
    drafts: List[DraftResponse]

    class Config:
        from_attributes = True

class PublishRecordResponse(BaseModel):
    id: int
    draft_id: int
    platform: str
    external_post_id: Optional[str] = None
    status: str
    published_at: datetime

    class Config:
        from_attributes = True
