"""LLM service using Anthropic Claude."""
import logging
from typing import AsyncGenerator
from functools import lru_cache
import anthropic
from ..config import get_settings

logger = logging.getLogger(__name__)

# System prompt for tax compliance assistant
SYSTEM_PROMPT = """You are a knowledgeable tax compliance assistant specializing in US federal tax law.
Your role is to help users understand tax regulations based on official IRS publications.

Guidelines:
1. Only answer based on the provided context from IRS documents
2. If the context doesn't contain relevant information, clearly state that
3. Cite specific publications when possible (e.g., "According to Publication 526...")
4. Use clear, accessible language while remaining accurate
5. For complex topics, break down the explanation into steps
6. Always remind users to consult a tax professional for their specific situation

Format your response with:
- Clear paragraphs for main points
- Bullet points for lists when appropriate
- Bold text for key terms using **term**
"""


class LLMService:
    """Service for LLM interactions using Anthropic Claude."""

    def __init__(self):
        settings = get_settings()
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.llm_model

    def _build_prompt(
        self,
        query: str,
        context: list[dict],
        chat_history: list[dict] | None = None
    ) -> str:
        """Build the prompt with context and history."""
        # Format context
        context_text = ""
        for i, doc in enumerate(context, 1):
            source = doc.get("source", "Unknown")
            page = doc.get("page")
            page_info = f" (Page {page})" if page else ""
            context_text += f"\n[Source {i}: {source}{page_info}]\n{doc['text']}\n"

        # Format chat history
        history_text = ""
        if chat_history:
            history_text = "\n\nRecent conversation:\n"
            for msg in chat_history[-6:]:  # Last 3 exchanges
                role = "User" if msg["role"] == "user" else "Assistant"
                history_text += f"{role}: {msg['content']}\n"

        prompt = f"""Context from IRS publications:
{context_text}
{history_text}
User question: {query}

Please provide a helpful, accurate response based on the context above. If citing sources, reference them by their publication name."""

        return prompt

    def generate(
        self,
        query: str,
        context: list[dict],
        chat_history: list[dict] | None = None
    ) -> str:
        """Generate a response (non-streaming)."""
        prompt = self._build_prompt(query, context, chat_history)

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return message.content[0].text
        except Exception as e:
            logger.error(f"LLM generation error: {e}")
            raise

    async def generate_stream(
        self,
        query: str,
        context: list[dict],
        chat_history: list[dict] | None = None
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming response."""
        prompt = self._build_prompt(query, context, chat_history)

        try:
            with self.client.messages.stream(
                model=self.model,
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            ) as stream:
                for text in stream.text_stream:
                    yield text
        except Exception as e:
            logger.error(f"LLM streaming error: {e}")
            raise

    def health_check(self) -> bool:
        """Check if Anthropic API is accessible."""
        try:
            # Simple test generation
            message = self.client.messages.create(
                model=self.model,
                max_tokens=10,
                messages=[
                    {"role": "user", "content": "Say OK"}
                ]
            )
            return bool(message.content[0].text)
        except Exception:
            return False


@lru_cache()
def get_llm_service() -> LLMService:
    """Get cached LLM service instance."""
    return LLMService()
