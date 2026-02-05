"""Chat endpoints with RAG."""
import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ..models.schemas import ChatRequest, ChatResponse, ChatHistory, Source
from ..services.vector_store import get_vector_store
from ..services.chat_history import get_chat_history_service
from ..services.llm import get_llm_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with the RAG system (non-streaming)."""
    vector_store = get_vector_store()
    chat_history_service = get_chat_history_service()
    llm = get_llm_service()

    # Get or create session
    session_id = request.session_id
    if not session_id or not chat_history_service.session_exists(session_id):
        session_id = chat_history_service.create_session()

    # Get chat history
    history = chat_history_service.get_history(session_id)

    # Search for relevant documents
    search_results = vector_store.search(request.query, limit=5)

    if not search_results:
        logger.warning(f"No search results for query: {request.query}")

    # Generate response
    try:
        response_text = llm.generate(
            query=request.query,
            context=search_results,
            chat_history=history
        )
    except Exception as e:
        logger.error(f"LLM error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate response")

    # Convert search results to Source objects
    sources = [
        Source(
            text=r["text"],
            source=r["source"],
            chunk_index=r["chunk_index"],
            score=r["score"],
            page=r.get("page")
        )
        for r in search_results
    ]

    # Save to chat history
    chat_history_service.add_message(session_id, "user", request.query)
    chat_history_service.add_message(
        session_id,
        "assistant",
        response_text,
        sources=[s.model_dump() for s in sources]
    )

    return ChatResponse(
        response=response_text,
        sources=sources,
        session_id=session_id
    )


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """Chat with the RAG system (streaming)."""
    vector_store = get_vector_store()
    chat_history_service = get_chat_history_service()
    llm = get_llm_service()

    # Get or create session
    session_id = request.session_id
    if not session_id or not chat_history_service.session_exists(session_id):
        session_id = chat_history_service.create_session()

    # Get chat history
    history = chat_history_service.get_history(session_id)

    # Search for relevant documents
    search_results = vector_store.search(request.query, limit=5)

    # Convert search results to Source objects
    sources = [
        {
            "text": r["text"],
            "source": r["source"],
            "chunk_index": r["chunk_index"],
            "score": r["score"],
            "page": r.get("page")
        }
        for r in search_results
    ]

    # Save user message
    chat_history_service.add_message(session_id, "user", request.query)

    async def generate():
        full_response = ""
        try:
            # First, send the sources and session_id
            yield f"data: {json.dumps({'type': 'sources', 'sources': sources, 'session_id': session_id})}\n\n"

            # Stream the response
            async for chunk in llm.generate_stream(
                query=request.query,
                context=search_results,
                chat_history=history
            ):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Signal completion
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

            # Save assistant response
            chat_history_service.add_message(
                session_id,
                "assistant",
                full_response,
                sources=sources
            )

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@router.get("/history/{session_id}", response_model=ChatHistory)
async def get_chat_history(session_id: str):
    """Get chat history for a session."""
    chat_history_service = get_chat_history_service()

    if not chat_history_service.session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    messages = chat_history_service.get_history(session_id)

    return ChatHistory(
        session_id=session_id,
        messages=messages
    )


@router.delete("/history/{session_id}")
async def clear_chat_history(session_id: str):
    """Clear chat history for a session."""
    chat_history_service = get_chat_history_service()

    if not chat_history_service.clear_history(session_id):
        raise HTTPException(status_code=404, detail="Session not found")

    return {"message": "Chat history cleared"}
