from fastapi import APIRouter, HTTPException, Depends
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
import app.crud as crud
from app.models import UserLogin, GroupCreate
from app.db_models import Group

router = APIRouter()

@router.post("/login")
async def login(user: UserLogin):
    # Mock login - just echo back the username as ID for simplicity
    # Enforce lowercase to prevent WebSocket connection mismatches
    username = user.username.strip().lower()
    return {"user_id": username, "message": "Login successful"}

@router.get("/history/{user_id}/{other_user_id}")
async def history(user_id: str, other_user_id: str, db: AsyncSession = Depends(get_db)):
    messages = await crud.get_chat_history(db, user_id, other_user_id)
    return messages

@router.get("/history/group/{group_id}")
async def group_history(group_id: str, db: AsyncSession = Depends(get_db)):
    messages = await crud.get_group_history(db, group_id)
    return messages

@router.get("/contacts/{user_id}")
async def contacts(user_id: str, db: AsyncSession = Depends(get_db)):
    contacts_list = await crud.get_recent_contacts(db, user_id)
    return contacts_list

@router.post("/groups")
async def create_group(group: GroupCreate, db: AsyncSession = Depends(get_db)):
    return await crud.create_group(db, group)

@router.get("/groups/{user_id}")
async def get_groups(user_id: str, db: AsyncSession = Depends(get_db)):
    return await crud.get_user_groups(db, user_id)


