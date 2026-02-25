from fastapi import FastAPI
from app.routers import websocket, auth
from fastapi.staticfiles import StaticFiles

app = FastAPI()

from contextlib import asynccontextmanager
from app.database import engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Cleanup on shutdown
    await engine.dispose()

app = FastAPI(lifespan=lifespan)

# Include Routers
app.include_router(websocket.router)
app.include_router(auth.router)

# Mount static files for frontend
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

@app.get("/")
async def read_root():
    return {"message": "Welcome to FastAPI Real-Time Chat"}
