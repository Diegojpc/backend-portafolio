# repositories/interfaces.py — Abstract repository contract

from abc import ABC, abstractmethod
from typing import Any


class Repository(ABC):
    """Base interface for all data repositories."""

    @abstractmethod
    async def list(self, skip: int = 0, take: int = 100) -> list[Any]:
        pass

    @abstractmethod
    async def get(self, uid: int) -> Any:
        pass

    @abstractmethod
    async def create(self, record: Any) -> Any:
        pass

    @abstractmethod
    async def update(self, uid: int, record: Any) -> Any:
        pass

    @abstractmethod
    async def delete(self, uid: int) -> None:
        pass
