from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Group(Base):
    __tablename__ = "groups"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    members = relationship("GroupMember", back_populates="group", cascade="all, delete-orphan")

class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(String, primary_key=True, default=generate_uuid)
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    user_id = Column(String, nullable=False, index=True)

    # Relationships
    group = relationship("Group", back_populates="members")

class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    sender_id = Column(String, nullable=False, index=True)
    receiver_id = Column(String, nullable=False, index=True) # User ID or Group ID
    content = Column(Text, nullable=False)
    chat_type = Column(String, default="direct") # "direct" or "group"
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
