# routers/conversations.py — API endpoints for conversations and chat

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from loguru import logger

from app.database import DBSessionDep
from app.entities import Conversation
from app.repositories.conversations import ConversationRepository
from app.services.conversations import ConversationService
from app.schemas import (
    ChatRequest,
    ConversationCreate,
    ConversationOut,
    ConversationUpdate,
    MessageOut,
)

router = APIRouter(
    prefix="/conversations",
    tags=["Conversations"],
)


async def get_conversation(
    conversation_id: int, session: DBSessionDep
) -> Conversation:
    """Dependency to fetch and validate a conversation exists."""
    conversation = await ConversationRepository(session).get(conversation_id)
    if not conversation:
        logger.warning(f"[Router] Conversation id={conversation_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return conversation


GetConversationDep = Annotated[Conversation, Depends(get_conversation)]


# --- CRUD Endpoints ---

@router.get("")
async def list_conversations(
    session: DBSessionDep, skip: int = 0, take: int = 100
) -> list[ConversationOut]:
    """List all conversations, ordered by most recent."""
    logger.info(f"[Router] GET /conversations (skip={skip}, take={take})")
    conversations = await ConversationRepository(session).list(skip, take)
    return [ConversationOut.model_validate(c) for c in conversations]


@router.get("/{conversation_id}")
async def get_conversation_detail(
    conversation: GetConversationDep,
) -> ConversationOut:
    """Get a single conversation by ID."""
    return ConversationOut.model_validate(conversation)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation: ConversationCreate, session: DBSessionDep
) -> ConversationOut:
    """Create a new conversation."""
    logger.info(f"[Router] POST /conversations title='{conversation.title}'")
    new_conv = await ConversationRepository(session).create(conversation)
    return ConversationOut.model_validate(new_conv)


@router.put("/{conversation_id}", status_code=status.HTTP_202_ACCEPTED)
async def update_conversation(
    conversation: GetConversationDep,
    updated: ConversationUpdate,
    session: DBSessionDep,
) -> ConversationOut:
    """Update a conversation's title."""
    result = await ConversationRepository(session).update(conversation.id, updated)
    return ConversationOut.model_validate(result)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation: GetConversationDep, session: DBSessionDep
) -> None:
    """Delete a conversation and all its messages."""
    logger.info(f"[Router] DELETE /conversations/{conversation.id}")
    await ConversationRepository(session).delete(conversation.id)


@router.get("/{conversation_id}/messages")
async def list_conversation_messages(
    conversation: GetConversationDep,
    session: DBSessionDep,
) -> list[MessageOut]:
    """Get all messages for a conversation."""
    messages = await ConversationService(session).list_messages(conversation.id)
    return [MessageOut.model_validate(m) for m in messages]


# --- Chat Endpoint (RAG-powered) ---

@router.post("/{conversation_id}/chat", summary="Chat with AI Assistant")
async def chat(
    conversation: GetConversationDep,
    chat_request: ChatRequest,
    session: DBSessionDep,
):
    """
    Send a message and receive a streaming response.
    Uses RAG pipeline: retrieves relevant context → generates with TinyLlama → streams to client.
    Conversation history provides memory across messages.
    """
    import asyncio
    from app.services.rag import stream_response, is_ready

    logger.info(f"[Router] POST /conversations/{conversation.id}/chat prompt='{chat_request.prompt[:50]}...'")

    service = ConversationService(session)

    async def rag_stream():
        """Stream RAG response and save to DB after completion."""
        full_response = []

        if not is_ready():
            fallback = "I'm sorry, the AI assistant is still loading. Please try again in a moment."
            yield fallback
            await service.save_interaction(
                conversation_id=conversation.id,
                prompt=chat_request.prompt,
                response=fallback,
            )
            return

        # Get conversation history for memory
        history = await service.get_conversation_history(conversation.id, limit=10)

        # Stream from RAG pipeline (runs LLM in a thread if local, or hits Gemini if API)
        for chunk in stream_response(
            prompt=chat_request.prompt, 
            conversation_history=history, 
            use_local_model=chat_request.use_local_model
        ):
            full_response.append(chunk)
            yield chunk
            await asyncio.sleep(0.01)  # Give the event loop breathing room

        # Save complete interaction
        final_text = "".join(full_response)
        await service.save_interaction(
            conversation_id=conversation.id,
            prompt=chat_request.prompt,
            response=final_text,
        )

        # Auto-title new conversations
        if conversation.title == "New Chat":
            short_title = chat_request.prompt[:40] + ("..." if len(chat_request.prompt) > 40 else "")
            await service.update_title(conversation.id, short_title)

    return StreamingResponse(
        rag_stream(),
        media_type="text/event-stream",
    )
