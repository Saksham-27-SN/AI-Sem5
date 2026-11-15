import os
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app, seed_aptitude_questions
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.core.security import create_access_token, hash_password
from backend.app.models.models import User, Profile

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Ensure clean database setup and seed default reference data."""
    Base.metadata.create_all(bind=engine)
    seed_aptitude_questions()
    os.makedirs("./reports", exist_ok=True)
    os.makedirs("./uploads", exist_ok=True)
    os.makedirs("./recordings", exist_ok=True)
    yield

@pytest.fixture
def client():
    """Provides a fresh FastAPI test client."""
    return TestClient(app)

@pytest.fixture
def db_session():
    """Provides a database session for querying or assertions."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def unique_email():
    """Generates a unique email address to prevent duplicate collisions."""
    return f"qa_candidate_{uuid.uuid4().hex[:8]}@example.com"

@pytest.fixture
def registered_user(client, unique_email):
    """Registers a unique candidate and returns credentials and auth token."""
    password = "SecurePassword123!"
    full_name = "QA Candidate"
    res = client.post("/api/auth/register", json={
        "email": unique_email,
        "password": password,
        "full_name": full_name
    })
    assert res.status_code == 201
    data = res.json()
    token = data["token"]
    user_info = data["user"]
    return {
        "email": unique_email,
        "password": password,
        "full_name": full_name,
        "token": token,
        "user_id": user_info["id"],
        "headers": {"Authorization": f"Bearer {token}"}
    }
