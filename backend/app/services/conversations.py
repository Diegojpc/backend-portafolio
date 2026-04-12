# services/conversations.py — Business logic for conversations

from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.entities import Message
from app.repositories.conversations import ConversationRepository
from app.repositories.messages import MessageRepository
from app.schemas import MessageCreate, ConversationUpdate


class ConversationService:
    """Service layer for conversation business logic."""

    def __init__(self, session: AsyncSession) -> None:
        self.conversation_repo = ConversationRepository(session)
        self.message_repo = MessageRepository(session)

    async def list_messages(self, conversation_id: int) -> list[Message]:
        """Retrieve all messages for a conversation, ordered by creation time."""
        logger.debug(f"[ConversationService] Fetching messages for conversation_id={conversation_id}")
        return await self.message_repo.list_by_conversation(conversation_id)

    async def save_interaction(
        self,
        conversation_id: int,
        prompt: str,
        response: str,
    ) -> None:
        """Persist a prompt/response pair to the database."""
        logger.info(f"[ConversationService] Saving interaction for conversation_id={conversation_id}")
        message_data = MessageCreate(
            conversation_id=conversation_id,
            prompt_content=prompt,
            response_content=response,
        )
        await self.message_repo.create(message_data)

    async def update_title(self, conversation_id: int, title: str) -> None:
        """Update the conversation title. Truncates to 50 chars."""
        clean_title = title.strip().replace('"', "")[:50]
        logger.info(f"[ConversationService] Updating title for conversation_id={conversation_id} to: {clean_title}")
        update_data = ConversationUpdate(title=clean_title)
        await self.conversation_repo.update(conversation_id, update_data)

    async def get_conversation_history(self, conversation_id: int, limit: int = 10) -> list[dict]:
        """Get recent conversation history formatted for LLM context."""
        messages = await self.message_repo.list_by_conversation(conversation_id)
        recent = messages[-limit:] if len(messages) > limit else messages
        history = []
        for msg in recent:
            history.append({"role": "user", "content": msg.prompt_content})
            history.append({"role": "assistant", "content": msg.response_content})
        logger.debug(f"[ConversationService] Retrieved {len(history)} history entries for conversation_id={conversation_id}")
        return history
