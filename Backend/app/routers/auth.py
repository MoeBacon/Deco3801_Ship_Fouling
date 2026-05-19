from fastapi import APIRouter, HTTPException, status

from app.auth_utils import create_access_token, verify_password
from app.database import get_connection
from app.schemas import LoginRequest, TokenResponse

router = APIRouter()


@router.post("/auth/login", response_model=TokenResponse)
def login(credentials: LoginRequest):
    connection = get_connection()
    cursor = connection.cursor()

    row = cursor.execute(
        "SELECT hashed_password FROM users WHERE username = ?",
        (credentials.username,),
    ).fetchone()

    connection.close()

    if row is None or not verify_password(credentials.password, row["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_access_token(credentials.username)
    return TokenResponse(access_token=token)
