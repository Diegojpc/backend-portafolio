# repositories/conversations.py — Data access for Conversation entities

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.entities import Conversation
from app.repositories.interfaces import Repository
from app.schemas import ConversationCreate, ConversationUpdate


class ConversationRepository(Repository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list(self, skip: int = 0, take: int = 100) -> list[Conversation]:
        logger.debug(f"[ConversationRepo] Listing conversations (skip={skip}, take={take})")
        query = select(Conversation).order_by(Conversation.updated_at.desc()).offset(skip).limit(take)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get(self, conversation_id: int) -> Conversation | None:
        logger.debug(f"[ConversationRepo] Getting conversation id={conversation_id}")
        query = select(Conversation).where(Conversation.id == conversation_id)
        result = await self.session.execute(query)
        return result.scalars().first()

    async def create(self, conversation: ConversationCreate) -> Conversation:
        new_conversation = Conversation(**conversation.model_dump())
        self.session.add(new_conversation)
        await self.session.commit()
        await self.session.refresh(new_conversation)
        logger.info(f"[ConversationRepo] Created conversation id={new_conversation.id}")
        return new_conversation

    async def update(
        self, conversation_id: int, updated_conversation: ConversationUpdate
    ) -> Conversation | None:
        conversation = await self.get(conversation_id)
        if not conversation:
            logger.warning(f"[ConversationRepo] Conversation id={conversation_id} not found for update")
            return None
        update_data = updated_conversation.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(conversation, key, value)
        self.session.add(conversation)
        await self.session.commit()
        await self.session.refresh(conversation)
        logger.info(f"[ConversationRepo] Updated conversation id={conversation_id}")
        return conversation

    async def delete(self, conversation_id: int) -> None:
        conversation = await self.get(conversation_id)
        if not conversation:
            logger.warning(f"[ConversationRepo] Conversation id={conversation_id} not found for delete")
            return
        await self.session.delete(conversation)
        await self.session.commit()
        logger.info(f"[ConversationRepo] Deleted conversation id={conversation_id}")
