import os
import time
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger("omnipost.database")

# Use DATABASE_URL if provided, else fallback to local sqlite
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./omnipost.db")
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif SQLALCHEMY_DATABASE_URL.startswith("postgresql://") and not SQLALCHEMY_DATABASE_URL.startswith("postgresql+"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

# Only add check_same_thread=False for SQLite
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db(max_retries=6, delay=3):
    """Initializes tables with retry logic, falling back to SQLite if remote DB is unreachable."""
    global engine, SessionLocal
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Connecting to database (attempt {attempt}/{max_retries})...")
            with engine.connect() as conn:
                pass
            Base.metadata.create_all(bind=engine)
            logger.info("Database connection verified and tables created.")
            return True
        except Exception as e:
            logger.warning(f"Database connection attempt {attempt} failed: {e}")
            if attempt < max_retries:
                time.sleep(delay)

    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        logger.error("Primary PostgreSQL database unreachable after retries. Falling back to local SQLite to ensure uptime.")
        fallback_url = "sqlite:///./omnipost.db"
        engine = create_engine(fallback_url, connect_args={"check_same_thread": False})
        SessionLocal.configure(bind=engine)
        Base.metadata.create_all(bind=engine)
        logger.info("Fallback SQLite database initialized successfully.")
        return True
    return False

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
