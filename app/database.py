import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv

load_dotenv(override=True)

# Hardcoding url to override stale terminal environment caches
DATABASE_URL = "postgresql+asyncpg://postgres:1234@127.0.0.1/chat_db"

# Create Async Engine
engine = create_async_engine(DATABASE_URL, echo=False)

# Create Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for SQLAlchemy Models
Base = declarative_base()

# Dependency to get DB session
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
