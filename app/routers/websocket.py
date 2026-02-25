from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.manager import manager
from app.models import MessageModel, MessageCreate
from app.database import get_db, AsyncSessionLocal
import app.crud as crud
import json
from datetime import datetime

router = APIRouter()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Expecting JSON: {"receiver_id": "...", "content": "...", "chat_type": "direct" | "group"}
            try:
                message_data = json.loads(data)
                receiver_id = message_data.get("receiver_id")
                content = message_data.get("content")
                chat_type = message_data.get("chat_type", "direct")

                if receiver_id and content:
                    # Create Message Object
                    message = MessageModel(
                        sender_id=user_id,
                        receiver_id=receiver_id,
                        content=content,
                        chat_type=chat_type,
                        timestamp=datetime.utcnow()
                    )
                    
                    # Store in DB & Broadcast
                    async with AsyncSessionLocal() as db:
                        await crud.save_message(db, message)
                        
                        if chat_type == "group":
                            # Get all members of the group
                            members = await crud.get_group_members(db, receiver_id)
                            # Broadcast to everyone
                            for member_id in members:
                                if member_id != user_id:
                                    sent = await manager.send_personal_message(
                                        json.dumps(message.dict(), default=str), 
                                        member_id
                                    )
                        else:
                            # Direct Message
                            sent = await manager.send_personal_message(
                                json.dumps(message.dict(), default=str), 
                                receiver_id
                            )

                    # Ack to Sender
                    await websocket.send_text(json.dumps({
                        "status": "sent", 
                        "message": message.dict()
                    }, default=str))
                    
            except json.JSONDecodeError:
                await websocket.send_text("Invalid JSON format")

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
