# repositories/messages.py — Data access for Message entities

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.entities import Message
from app.repositories.interfaces import Repository
from app.schemas import MessageCreate


class MessageRepository(Repository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_by_conversation(self, conversation_id: int) -> list[Message]:
        logger.debug(f"[MessageRepo] Listing messages for conversation_id={conversation_id}")
        query = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def list(self, skip: int = 0, take: int = 100) -> list[Message]:
        query = select(Message).offset(skip).limit(take)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get(self, msg_id: int) -> Message | None:
        query = select(Message).where(Message.id == msg_id)
        result = await self.session.execute(query)
        return result.scalars().first()

    async def create(self, message_data: MessageCreate) -> Message:
        new_message = Message(**message_data.model_dump())
        self.session.add(new_message)
        await self.session.commit()
        await self.session.refresh(new_message)
        logger.info(f"[MessageRepo] Saved message id={new_message.id} for conversation={new_message.conversation_id}")
        return new_message

    async def update(self, msg_id: int, record) -> Message | None:
        # Not needed for this project, but required by interface
        raise NotImplementedError

    async def delete(self, msg_id: int) -> None:
        message = await self.get(msg_id)
        if not message:
            return
        await self.session.delete(message)
        await self.session.commit()
        logger.info(f"[MessageRepo] Deleted message id={msg_id}")
