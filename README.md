# AI Tax Research Assistant

RAG-powered tax research tool that answers questions using IRS documentation with source citations. Built for small tax firms looking to "tip-toe" into AI.

![Python](https://img.shields.io/badge/Python-3.11+-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-red)

## Features

- **Grounded Answers**: Responses cite specific IRS documents—no hallucinations from random internet sources
- **Semantic Search**: Vector-based retrieval finds relevant passages even with different wording
- **Chat Interface**: Conversational UI with message history
- **Document Upload**: Add your own tax documents to the knowledge base
- **Self-Hosted**: Your data stays on your infrastructure

## Architecture

```
IRS Documents → PDF Parser → Embeddings → Qdrant Vector DB
                                              │
User Question → Semantic Search → Context → Claude/OpenAI → Answer + Citations
```

[View Full Architecture Diagram](./architecture_diagram.html)

## Quick Start

### Docker (Recommended)

```bash
# Configure environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY or OPENAI_API_KEY

# Build and run
docker build -t tax-rag .
docker run -p 8080:8080 tax-rag
```

Open localhost in your browser

### Local Development

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Configuration

Create a `.env` file:

```env
# Required: Choose one LLM provider
ANTHROPIC_API_KEY=sk-ant-...
# or
OPENAI_API_KEY=sk-...

# Optional: External services (if running separately)
QDRANT_URL=<your-qdrant-url>
REDIS_URL=<your-redis-url>
```

## Tech Stack

**Backend:**
- FastAPI - API framework
- Qdrant - Vector database for semantic search
- Redis - Chat history caching
- Claude/OpenAI - LLM for answer generation
- SentenceTransformers - Document embeddings

**Frontend:**
- React 18 + TypeScript
- Vite - Build tool
- Tailwind CSS - Styling
- React Markdown - Response rendering

## Deployment

Pre-configured for:
- **Fly.io**: `fly deploy` (uses `fly.toml`)
- **Render**: Push to GitHub (uses `render.yaml`)
- **Docker**: Any container platform

## Project Structure

```
tax-rag-solution/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI app
│       ├── document_processor.py # PDF ingestion
│       ├── vector_store.py      # Qdrant integration
│       ├── llm.py               # Claude/OpenAI
│       └── chat_history.py      # Redis sessions
├── frontend/
│   └── src/
│       ├── App.tsx              # Main chat UI
│       └── components/
├── sample_docs/                 # Example IRS documents
├── Dockerfile
└── docker-compose.yml
```

## Why RAG for Tax Research?

Traditional chatbots can "hallucinate" incorrect information. A RAG system grounds responses in actual IRS documentation:

1. **Cited Sources**: Every answer links to the source document
2. **Controlled Knowledge**: Only searches your approved documents
3. **Verifiable**: Tax professionals can check citations before advising clients

## Author

Jamal Campbell - [jamalcampbell.org](https://jamalcampbell.org)
