from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, desc, asc
from typing import List

from app.db_models import Message, Group, GroupMember
from app.models import MessageModel, GroupCreate

async def save_message(db: AsyncSession, message_data: MessageModel) -> Message:
    new_message = Message(
        sender_id=message_data.sender_id,
        receiver_id=message_data.receiver_id,
        content=message_data.content,
        chat_type=message_data.chat_type,
        timestamp=message_data.timestamp
    )
    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)
    return new_message

async def get_chat_history(db: AsyncSession, user_id_1: str, user_id_2: str) -> List[dict]:
    query = select(Message).where(
        Message.chat_type == "direct",
        or_(
            and_(Message.sender_id == user_id_1, Message.receiver_id == user_id_2),
            and_(Message.sender_id == user_id_2, Message.receiver_id == user_id_1)
        )
    ).order_by(asc(Message.timestamp)).limit(100)
    
    result = await db.execute(query)
    messages = result.scalars().all()
    
    # Format for JSON response
    return [{
        "id": m.id,
        "sender_id": m.sender_id,
        "receiver_id": m.receiver_id,
        "content": m.content,
        "chat_type": m.chat_type,
        "timestamp": m.timestamp.isoformat()
    } for m in messages]

async def get_group_history(db: AsyncSession, group_id: str) -> List[dict]:
    query = select(Message).where(
        Message.chat_type == "group",
        Message.receiver_id == group_id
    ).order_by(asc(Message.timestamp)).limit(100)
    
    result = await db.execute(query)
    messages = result.scalars().all()
    
    return [{
        "id": m.id,
        "sender_id": m.sender_id,
        "receiver_id": m.receiver_id,
        "content": m.content,
        "chat_type": m.chat_type,
        "timestamp": m.timestamp.isoformat()
    } for m in messages]

async def create_group(db: AsyncSession, group_data: GroupCreate) -> dict:
    new_group = Group(name=group_data.name)
    db.add(new_group)
    await db.flush() # To get the group.id
    
    # Enforce lowercase on backend to override any stubborn browser cache issues
    lowercased_members = list(set([m.strip().lower() for m in group_data.members]))
    
    for member_id in lowercased_members:
        member = GroupMember(group_id=new_group.id, user_id=member_id)
        db.add(member)
        
    await db.commit()
    await db.refresh(new_group)
    
    return {
        "id": new_group.id,
        "name": new_group.name,
        "members": lowercased_members
    }

async def get_user_groups(db: AsyncSession, user_id: str) -> List[dict]:
    # Query all groups that user belongs to
    query = select(Group).join(GroupMember).where(GroupMember.user_id == user_id)
    result = await db.execute(query)
    groups = result.scalars().all()
    
    return [{
        "id": g.id,
        "name": g.name
    } for g in groups]

async def get_recent_contacts(db: AsyncSession, user_id: str) -> List[str]:
    # Query distinct sender_ids where user is receiver
    sender_query = select(Message.sender_id).where(
        Message.chat_type == "direct",
        Message.receiver_id == user_id
    ).distinct()
    
    # Query distinct receiver_ids where user is sender
    receiver_query = select(Message.receiver_id).where(
        Message.chat_type == "direct",
        Message.sender_id == user_id
    ).distinct()
    
    sender_result = await db.execute(sender_query)
    receiver_result = await db.execute(receiver_query)
    
    contacts = set()
    for s_id in sender_result.scalars().all():
        contacts.add(s_id)
    for r_id in receiver_result.scalars().all():
        contacts.add(r_id)
        
    if user_id in contacts:
        contacts.remove(user_id)
        
    return list(contacts)

async def get_group_members(db: AsyncSession, group_id: str) -> List[str]:
    query = select(GroupMember.user_id).where(GroupMember.group_id == group_id)
    result = await db.execute(query)
    return result.scalars().all()
