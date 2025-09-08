import os
import hashlib
import hmac
import time
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from .db import get_session
from .models import User

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALG = "HS256"

security = HTTPBearer()


def hash_password(password: str) -> str:
    # Simple SHA256; replace with bcrypt in production
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hmac.compare_digest(hash_password(password), password_hash)


def create_access_token(sub: str, expires_in: int = 3600) -> str:
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET environment variable is required")
    payload = {"sub": sub, "exp": int(time.time()) + expires_in}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def verify_token(token: str) -> dict | None:
    if not JWT_SECRET:
        raise RuntimeError("JWT_SECRET environment variable is required")
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    token = credentials.credentials
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def is_super_admin(user: User) -> bool:
    return user.role == "SuperAdmin"


def is_admin(user: User) -> bool:
    return user.role in ["Admin", "SuperAdmin"]


def is_super_admin_or_admin(user: User) -> bool:
    return user.role in ["SuperAdmin", "Admin"]


def check_company_access(user: User, company_id: str) -> bool:
    """Check if user has access to the specified company"""
    print(f"🔐 check_company_access - User: {user.email}, Role: {user.role}, User Company: {user.company_id}, Target Company: {company_id}")
    
    if is_super_admin(user):
        print(f"✅ SuperAdmin access granted (even for null company_id)")
        return True
    
    # company_id None ise, SuperAdmin dışında erişim yok
    if company_id is None:
        print(f"❌ Company ID is None, access denied for non-SuperAdmin")
        return False
    
    has_access = user.company_id == company_id
    print(f"🔐 Company access check: {has_access} (user.company_id: {user.company_id} == company_id: {company_id})")
    return has_access


def check_same_company(user: User, target_user: User) -> bool:
    """Check if user and target user are in the same company"""
    if is_super_admin(user):
        return True
    return user.company_id == target_user.company_id

def can_manage_user(user: User, target_user: User) -> bool:
    """Check if user can manage (create, update, delete) target user"""
    if is_super_admin(user):
        return True
    if is_admin(user):
        return user.company_id == target_user.company_id
    return False
