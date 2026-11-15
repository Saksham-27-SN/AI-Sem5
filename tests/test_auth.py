import uuid
import pytest
from backend.app.core.security import verify_password, decode_access_token, hash_password
from backend.app.models.models import User, Profile

def test_user_registration_success(client, db_session):
    """Verify that a new candidate can register successfully."""
    email = f"auth_reg_{uuid.uuid4().hex[:8]}@example.com"
    password = "StrongPassword@123"
    full_name = "Jane Candidate"

    response = client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": full_name
    })

    assert response.status_code == 201
    data = response.json()
    assert "token" in data
    assert "user" in data

    user_data = data["user"]
    assert user_data["email"] == email
    assert user_data["full_name"] == full_name
    assert "id" in user_data

    # Verify JWT validity
    decoded = decode_access_token(data["token"])
    assert decoded is not None
    assert decoded["sub"] == user_data["id"]
    assert decoded["email"] == email

    # Verify database persistence & password hashing
    db_user = db_session.query(User).filter(User.email == email).first()
    assert db_user is not None
    assert db_user.is_active is True
    assert db_user.hashed_password != password
    assert "$" in db_user.hashed_password
    assert verify_password(password, db_user.hashed_password)

    # Verify default profile creation
    db_profile = db_session.query(Profile).filter(Profile.user_id == db_user.id).first()
    assert db_profile is not None
    assert db_profile.experience_level == "entry"

def test_duplicate_email_registration_rejection(client, registered_user):
    """Verify that attempting to register with an existing email returns 400 Bad Request."""
    response = client.post("/api/auth/register", json={
        "email": registered_user["email"],
        "password": "AnotherPassword456!",
        "full_name": "Imposter User"
    })

    assert response.status_code == 400
    assert response.json()["detail"] == "A user with this email address already exists."

def test_user_login_success(client, registered_user):
    """Verify that a valid user can log in and receive an authenticated JWT token."""
    response = client.post("/api/auth/login", json={
        "email": registered_user["email"],
        "password": registered_user["password"]
    })

    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["user"]["email"] == registered_user["email"]
    assert data["user"]["id"] == registered_user["user_id"]

    # Decode and verify token
    payload = decode_access_token(data["token"])
    assert payload is not None
    assert payload["sub"] == registered_user["user_id"]

def test_user_login_invalid_password(client, registered_user):
    """Verify that login fails with 401 when an incorrect password is provided."""
    response = client.post("/api/auth/login", json={
        "email": registered_user["email"],
        "password": "IncorrectPassword123!"
    })

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password."

def test_user_login_nonexistent_email(client):
    """Verify that login fails with 401 when the email does not exist."""
    response = client.post("/api/auth/login", json={
        "email": f"nonexistent_{uuid.uuid4().hex[:8]}@example.com",
        "password": "AnyPassword123!"
    })

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password."

def test_authenticated_me_access(client, registered_user):
    """Verify that an authenticated user can access their /me profile with valid JWT."""
    response = client.get("/api/auth/me", headers=registered_user["headers"])

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == registered_user["user_id"]
    assert data["email"] == registered_user["email"]
    assert data["full_name"] == registered_user["full_name"]

def test_unauthenticated_me_access_rejected(client):
    """Verify that accessing /me without an Authorization header returns 401 Unauthorized."""
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "detail" in response.json()

def test_password_hashing_security():
    """Direct unit test of cryptographic salt and PBKDF2 hashing functions."""
    raw_secret = "UltraSecureSecret!2026"
    hash1 = hash_password(raw_secret)
    hash2 = hash_password(raw_secret)

    # Salt uniqueness ensure different hashes for identical passwords
    assert hash1 != hash2
    assert verify_password(raw_secret, hash1) is True
    assert verify_password(raw_secret, hash2) is True
    assert verify_password("WrongSecret", hash1) is False
    assert verify_password("", hash1) is False
