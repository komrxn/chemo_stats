from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from pydantic import BaseModel
from datetime import datetime

from database import get_session
from models.user import User
from routers.auth import get_current_active_user

router = APIRouter(prefix="/admin", tags=["admin"])

# -- Schemas --
class UserAdminResponse(BaseModel):
    id: int
    email: str
    is_active: bool
    is_approved: bool
    is_superuser: bool
    created_at: datetime

# -- Dependencies --
async def get_current_superuser(
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="The user doesn't have enough privileges"
        )
    return current_user

# -- Endpoints --

@router.get("/users", response_model=List[UserAdminResponse])
async def read_users(
    session: Session = Depends(get_session),
    current_superuser: User = Depends(get_current_superuser)
):
    """
    Get all users. Only for superusers.
    """
    users = session.exec(select(User).order_by(User.created_at.desc())).all()
    return users

@router.patch("/users/{user_id}/approve", response_model=UserAdminResponse)
async def approve_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_superuser: User = Depends(get_current_superuser)
):
    """
    Approve a user. Only for superusers.
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_approved = True
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
