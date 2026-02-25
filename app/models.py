from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class MessageModel(BaseModel):
    sender_id: str
    receiver_id: str
    content: str
    chat_type: str = "direct" # "direct" or "group"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    chat_type: str = "direct"

class UserLogin(BaseModel):
    username: str

class GroupCreate(BaseModel):
    name: str
    members: List[str]

class GroupModel(BaseModel):
    id: Optional[str] = None
    name: str
    members: List[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)
