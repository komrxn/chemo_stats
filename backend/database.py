from typing import Generator
import os
from sqlmodel import SQLModel, Session, create_engine
from dotenv import load_dotenv

from pathlib import Path

# Load .env from project root
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

# Fallback for when DATABASE_URL is not set (prevents crash on import, but will crash on usage if still None)
if not DATABASE_URL:
    # Try default for docker if not set, or raise clearer error
    # DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/kkh_analysis"
    pass

engine = create_engine(DATABASE_URL, echo=True)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
