import sys
import os
import time

# Add parent directory to path so app can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.database import engine, Base, SessionLocal
from app.models import User, BrandVoiceProfile, ContentJob, Draft, PublishRecord
from app.orchestrator import run_agent_pipeline_sync
from app.main import app

def run_tests():
    print("[START] Starting Omnipost Automated Test Suite...")
    
    # Drop and recreate all tables inside the database (fixes Windows file lock issue)
    try:
        Base.metadata.drop_all(bind=engine)
        print("[CLEAN] Dropped all existing tables successfully")
    except Exception as e:
        print(f"[WARN] Table clean error: {e}")

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Test 1: Create User & Profile Creation
        print("\n[TEST 1] User & Profile Creation")
        from app.auth import get_password_hash, verify_password
        pwd = "testpassword123"
        hashed = get_password_hash(pwd)
        assert verify_password(pwd, hashed), "[FAIL] Password hashing failed verification"
        
        test_email = f"test_{int(time.time())}@omnipost.ai"
        user = User(email=test_email, password_hash=hashed)
        db.add(user)
        db.commit()
        db.refresh(user)
        assert user.id is not None, "[FAIL] User failed to save to database"
        print(f"[OK] User created successfully ({test_email})")
        
        # Test 2: Brand voice setup
        profile = BrandVoiceProfile(
            user_id=user.id,
            tone_descriptors=["professional", "concise"],
            avoid_phrases=["synergy"],
            gold_examples=[]
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        assert profile.id is not None, "[FAIL] Brand Voice Profile failed to save"
        print("[OK] Default Brand Voice Profile created")

        # Test 3: ContentJob and Orchestrator execution
        print("\n[TEST 2] Orchestration Pipeline Execution")
        job = ContentJob(
            user_id=user.id,
            raw_input="Explain multi-agent state machines in 2 sentences.",
            status="pending"
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        assert job.id is not None, "[FAIL] ContentJob failed to save"
        print("[OK] ContentJob registered")
        
        # Run orchestrator
        run_agent_pipeline_sync(db, job.id, ["linkedin", "twitter"])
        
        # Fetch updated job and drafts
        db.refresh(job)
        assert job.status == "completed", f"[FAIL] Job status should be 'completed', got {job.status}"
        
        drafts = db.query(Draft).filter(Draft.content_job_id == job.id).all()
        assert len(drafts) == 2, f"[FAIL] Should have generated 2 drafts, got {len(drafts)}"
        
        for draft in drafts:
            assert draft.platform in ["linkedin", "twitter"], f"[FAIL] Unexpected platform {draft.platform}"
            assert len(draft.body_text) > 0, f"[FAIL] Draft text for {draft.platform} is empty"
            assert draft.status == "awaiting_approval", f"[FAIL] Draft status should be 'awaiting_approval', got {draft.status}"
            assert len(draft.critique_history) > 0, "[FAIL] Critique history is empty"
            print(f"[OK] Generated platform draft: {draft.platform} | Version: {draft.version} | Score: {draft.quality_score}")

        # Test 4: Brand Voice Memory Updates
        print("\n[TEST 3] Brand Voice Profile Memory Updates")
        draft = drafts[0]
        original_draft_text = draft.body_text
        # Simulate user edits to the draft text (removing 'synergy' or changing structure)
        user_modified_text = original_draft_text + "\nLet's make sure it sounds authentic and has no corporate buzzwords."
        
        # Approve draft with edits, triggering voice feedback learning
        from app.orchestrator import update_brand_voice_from_approved_draft
        update_brand_voice_from_approved_draft(db, user.id, original_draft_text, user_modified_text, draft.platform)
        
        # Verify changes in BrandVoiceProfile
        db.refresh(profile)
        assert len(profile.tone_descriptors) > 0, "[FAIL] Tone descriptors empty"
        # Should have saved the gold example
        assert len(profile.gold_examples) > 0, "[FAIL] Gold examples did not capture user approved text"
        print("[OK] Learned brand voice attributes from user modifications successfully")

        # Test 5: API Integration Endpoints
        print("\n[TEST 4] FastAPI Router Integration & Client Tests")
        client = TestClient(app)
        
        # Test login
        response = client.post("/auth/login", json={"email": test_email, "password": "testpassword123"})
        assert response.status_code == 200, f"[FAIL] API Login failed: {response.text}"
        token_data = response.json()
        assert "access_token" in token_data, "[FAIL] Access token missing from response"
        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        print("[OK] API Authentication works")
        
        # Test creating content jobs via API
        response = client.post("/content-jobs", headers=headers, json={
            "raw_input": "Creating posts for AI developers",
            "platforms": ["linkedin"]
        })
        assert response.status_code == 200, f"[FAIL] API Job trigger failed: {response.text}"
        job_data = response.json()
        job_id = job_data["id"]
        print("[OK] API Job triggering works")
        
        # Test fetching brand voice profile
        response = client.get("/brand-voice-profile", headers=headers)
        assert response.status_code == 200, f"[FAIL] API Voice Profile fetch failed: {response.text}"
        print("[OK] API Brand Voice Profile fetch works")

        print("\n[SUCCESS] ALL TESTS PASSED SUCCESSFULLY!")
        
    except AssertionError as err:
        print(f"\nAssertionError: {err}")
        sys.exit(1)
    except Exception as ex:
        print(f"\nUnexpected Exception: {ex}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
