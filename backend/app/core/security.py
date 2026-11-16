import html
import re
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.app.core.config import settings

security = HTTPBearer(auto_error=False)

def sanitize_input(value: Optional[str]) -> Optional[str]:
    """
    Sanitizes user input string against Cross-Site Scripting (XSS) attacks.
    Strips dangerous HTML tags, inline JavaScript handlers (e.g. onerror, onload),
    script/iframe/object tags, and encodes HTML entities.
    """
    if value is None:
        return None
    if not isinstance(value, str):
        return str(value)
    
    # Strip script, iframe, object, embed, style, applet tags and their contents
    cleaned = re.sub(
        r'<(script|iframe|object|embed|style|applet)\b[^>]*>.*?</\1>',
        '',
        value,
        flags=re.IGNORECASE | re.DOTALL
    )
    # Strip any dangling / self-closing dangerous tags
    cleaned = re.sub(
        r'<(script|iframe|object|embed|style|applet)\b[^>]*/>',
        '',
        cleaned,
        flags=re.IGNORECASE
    )
    # Strip javascript: and vbscript: URIs
    cleaned = re.sub(r'(javascript|vbscript|data):[^\s"\'<>]*', '', cleaned, flags=re.IGNORECASE)
    # Strip inline event handlers like onerror=..., onload=..., onclick=..., onfocus=..., etc.
    cleaned = re.sub(r'\bon\w+\s*=\s*(["\'][^"\']*["\']|[^\s>]+)', '', cleaned, flags=re.IGNORECASE)
    # Escape any remaining HTML markup to neutralize any tags
    cleaned = html.escape(cleaned, quote=True)
    return cleaned

def sanitize_html(value: Optional[str]) -> Optional[str]:
    """Alias for sanitize_input."""
    return sanitize_input(value)

def hash_password(password: str) -> str:
    """Secure password hashing using PBKDF2 HMAC-SHA256."""
    salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"{salt}${key}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored salt$hash string."""
    try:
        salt, expected_key = hashed_password.split("$")
        computed_key = hashlib.pbkdf2_hmac(
            'sha256',
            plain_password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        ).hex()
        return hmac.compare_digest(expected_key, computed_key)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates a JWT access token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = Query(None)
) -> str:
    """Dependency to retrieve the authenticated user ID from Authorization header or ?token= query param."""
    raw_token = credentials.credentials if credentials else token
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(raw_token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return str(payload["sub"])

def get_optional_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = Query(None)
) -> Optional[str]:
    """Dependency that returns user ID if token present, or None if anonymous."""
    raw_token = credentials.credentials if credentials else token
    if not raw_token:
        return None
    payload = decode_access_token(raw_token)
    return str(payload.get("sub")) if (payload and "sub" in payload) else None
