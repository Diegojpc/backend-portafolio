# schemas.py — Pydantic request/response models

from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


# --- Conversation Schemas ---

class ConversationCreate(BaseModel):
    title: str = "New Chat"


class ConversationUpdate(BaseModel):
    title: str | None = None


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime
    updated_at: datetime


# --- Message Schemas ---

class MessageCreate(BaseModel):
    conversation_id: int
    prompt_content: str
    response_content: str


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    prompt_content: str
    response_content: str
    created_at: datetime


# --- Chat Request ---

class ChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    use_local_model: bool = False
