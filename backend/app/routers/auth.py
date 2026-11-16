from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import (
    hash_password, verify_password, create_access_token, get_current_user_id, sanitize_input
)
from backend.app.models.models import User, Profile
from backend.app.schemas.schemas import UserRegister, UserLogin, AuthResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    """Registers a new user and creates an initial profile."""
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    new_user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=sanitize_input(user_in.full_name)
    )
    db.add(new_user)
    db.flush()

    # Create associated default profile
    new_profile = Profile(user_id=new_user.id)
    db.add(new_profile)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": new_user.id, "email": new_user.email})
    return {
        "user": UserResponse.model_validate(new_user),
        "token": token
    }

@router.post("/login", response_model=AuthResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticates user credentials and issues a signed JWT token."""
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    token = create_access_token({"sub": user.id, "email": user.email})
    return {
        "user": UserResponse.model_validate(user),
        "token": token
    }

@router.get("/me", response_model=UserResponse)
def get_current_user(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Returns profile for currently authenticated user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return UserResponse.model_validate(user)
