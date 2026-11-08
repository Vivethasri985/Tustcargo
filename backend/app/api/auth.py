from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas.auth import LoginIn, SignupIn, UserOut
from app.services import auth

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=UserOut, status_code=201)
def signup(data: SignupIn, response: Response, db: Session = Depends(get_db)) -> User:
    user = User(
        email=data.email,
        password_hash=auth.hash_password(data.password),
        name=data.name,
        business_name=data.business_name,
        country=data.country,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(409, "An account with this email already exists. Log in instead.") from error
    auth.start_session(db, user, response)
    return user


@router.post("/login", response_model=UserOut)
def login(data: LoginIn, response: Response, db: Session = Depends(get_db)) -> User:
    auth.check_login_allowed(data.email)
    user = db.scalar(select(User).where(User.email == data.email))
    if user is None or not auth.verify_password(data.password, user.password_hash):
        auth.record_login_failure(data.email)
        raise HTTPException(401, "The email or password is incorrect.")
    auth.clear_login_failures(data.email)
    auth.start_session(db, user, response)
    return user


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)) -> None:
    auth.end_session(db, request, response)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(auth.current_user)) -> User:
    return user
