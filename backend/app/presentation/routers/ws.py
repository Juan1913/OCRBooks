import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis
from app.config import REDIS_URL

router = APIRouter()


@router.websocket("/ws/{book_id}")
async def book_progress_ws(websocket: WebSocket, book_id: str):
    await websocket.accept()
    client = aioredis.from_url(REDIS_URL, decode_responses=True)
    pubsub = client.pubsub()
    await pubsub.subscribe(f"book:{book_id}:progress")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    finally:
        await pubsub.unsubscribe(f"book:{book_id}:progress")
        await client.aclose()
