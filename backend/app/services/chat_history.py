"""Chat history service using Redis."""
import json
import uuid
import logging
from datetime import datetime
from functools import lru_cache
from redis import Redis
from ..config import get_settings

logger = logging.getLogger(__name__)

# TTL for chat sessions (24 hours)
SESSION_TTL = 86400


class ChatHistoryService:
    """Service for managing chat history in Redis."""

    def __init__(self):
        settings = get_settings()
        self.client = Redis.from_url(settings.redis_url, decode_responses=True)
        self.prefix = "tax_rag:chat:"

    def _key(self, session_id: str) -> str:
        """Get Redis key for a session."""
        return f"{self.prefix}{session_id}"

    def create_session(self) -> str:
        """Create a new chat session."""
        session_id = str(uuid.uuid4())
        self.client.setex(
            self._key(session_id),
            SESSION_TTL,
            json.dumps([])
        )
        return session_id

    def get_history(self, session_id: str) -> list[dict]:
        """Get chat history for a session."""
        data = self.client.get(self._key(session_id))
        if data:
            return json.loads(data)
        return []

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        sources: list[dict] | None = None
    ) -> None:
        """Add a message to chat history."""
        history = self.get_history(session_id)

        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "sources": sources
        }
        history.append(message)

        # Keep last 50 messages
        if len(history) > 50:
            history = history[-50:]

        self.client.setex(
            self._key(session_id),
            SESSION_TTL,
            json.dumps(history)
        )

    def clear_history(self, session_id: str) -> bool:
        """Clear chat history for a session."""
        result = self.client.delete(self._key(session_id))
        return result > 0

    def session_exists(self, session_id: str) -> bool:
        """Check if a session exists."""
        return self.client.exists(self._key(session_id)) > 0

    def health_check(self) -> bool:
        """Check if Redis is accessible."""
        try:
            return self.client.ping()
        except Exception:
            return False


@lru_cache()
def get_chat_history_service() -> ChatHistoryService:
    """Get cached chat history service instance."""
    return ChatHistoryService()
