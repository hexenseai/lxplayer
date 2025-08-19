import os
import hashlib
import hmac
import time
import jwt

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALG = "HS256"


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
