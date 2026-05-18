from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.auth_utils import decode_token

_bearer = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> str:
    try:
        return decode_token(credentials.credentials)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
