"""Chat history service using Redis."""
import json
import uuid
import logging
from datetime import datetime
from functools import lru_cache
from redis import Redis
from redis.exceptions import ConnectionError, TimeoutError
from ..config import get_settings

logger = logging.getLogger(__name__)

# TTL for chat sessions (24 hours)
SESSION_TTL = 86400


class ChatHistoryService:
    """Service for managing chat history in Redis."""

    def __init__(self):
        settings = get_settings()
        # Add retry and timeout settings for Upstash
        self.client = Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_timeout=10,
            socket_connect_timeout=10,
            retry_on_timeout=True,
            health_check_interval=30
        )
        self.prefix = "tax_rag:chat:"
        self._fallback_sessions: dict[str, list] = {}  # In-memory fallback

    def _key(self, session_id: str) -> str:
        """Get Redis key for a session."""
        return f"{self.prefix}{session_id}"

    def _reconnect(self):
        """Attempt to reconnect Redis client."""
        try:
            self.client.ping()
        except Exception:
            settings = get_settings()
            self.client = Redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_timeout=10,
                socket_connect_timeout=10,
                retry_on_timeout=True,
                health_check_interval=30
            )

    def create_session(self) -> str:
        """Create a new chat session."""
        session_id = str(uuid.uuid4())
        try:
            self._reconnect()
            self.client.setex(
                self._key(session_id),
                SESSION_TTL,
                json.dumps([])
            )
        except (ConnectionError, TimeoutError) as e:
            logger.warning(f"Redis unavailable, using in-memory fallback: {e}")
            self._fallback_sessions[session_id] = []
        return session_id

    def get_history(self, session_id: str) -> list[dict]:
        """Get chat history for a session."""
        # Check fallback first
        if session_id in self._fallback_sessions:
            return self._fallback_sessions[session_id]

        try:
            self._reconnect()
            data = self.client.get(self._key(session_id))
            if data:
                return json.loads(data)
        except (ConnectionError, TimeoutError) as e:
            logger.warning(f"Redis unavailable for get_history: {e}")
            return self._fallback_sessions.get(session_id, [])
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

        try:
            self._reconnect()
            self.client.setex(
                self._key(session_id),
                SESSION_TTL,
                json.dumps(history)
            )
            # Sync fallback if we succeeded
            if session_id in self._fallback_sessions:
                del self._fallback_sessions[session_id]
        except (ConnectionError, TimeoutError) as e:
            logger.warning(f"Redis unavailable for add_message: {e}")
            self._fallback_sessions[session_id] = history

    def clear_history(self, session_id: str) -> bool:
        """Clear chat history for a session."""
        # Clear fallback
        if session_id in self._fallback_sessions:
            del self._fallback_sessions[session_id]

        try:
            self._reconnect()
            result = self.client.delete(self._key(session_id))
            return result > 0
        except (ConnectionError, TimeoutError) as e:
            logger.warning(f"Redis unavailable for clear_history: {e}")
            return True  # Session cleared from fallback

    def session_exists(self, session_id: str) -> bool:
        """Check if a session exists."""
        if session_id in self._fallback_sessions:
            return True

        try:
            self._reconnect()
            return self.client.exists(self._key(session_id)) > 0
        except (ConnectionError, TimeoutError):
            return False

    def health_check(self) -> bool:
        """Check if Redis is accessible."""
        try:
            self._reconnect()
            return self.client.ping()
        except Exception:
            return False


@lru_cache()
def get_chat_history_service() -> ChatHistoryService:
    """Get cached chat history service instance."""
    return ChatHistoryService()
