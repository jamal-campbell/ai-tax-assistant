import os
import logging
from fastapi import FastAPI, HTTPException, Body, Request
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
from google import genai
from qdrant_client import QdrantClient, models
from redis import Redis
import pypdf
from sentence_transformers import SentenceTransformer
from .ingest import ingest_documents

# Configure logging
logging.basicConfig(level=logging.INFO)

# Load environment variables
load_dotenv()

# --- Initialize Clients ---
# Initialize FastAPI app
app = FastAPI(
    title="Tax Compliance RAG System",
    description="A RAG system to answer questions about tax compliance using IRS publications.",
    version="1.0.0",
)

# Configure templates
templates = Jinja2Templates(directory=os.path.join(os.path.dirname(__file__), "templates"))

# Initialize Google Gemini
# The google.genai library automatically looks for the GOOGLE_API_KEY environment variable.
# Ensure it is set in your .env file.

# Initialize Qdrant Client
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
if not QDRANT_URL:
    raise ValueError("QDRANT_URL environment variable not set.")
qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

# Initialize Redis Client
REDIS_URL = os.getenv("REDIS_URL")
if not REDIS_URL:
    raise ValueError("REDIS_URL environment variable not set.")
redis_client = Redis.from_url(REDIS_URL)

# Initialize Sentence Transformer for embeddings
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# --- FastAPI Endpoints ---

@app.get("/", tags=["General"])
async def read_root(request: Request):
    """
    Serves the main HTML dashboard.
    """
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/chat", tags=["RAG"])
async def chat_with_rag(query: str = Body(..., embed=True)):
    """
    Main endpoint to interact with the RAG system.
    Takes a user query and returns a response from the LLM.
    """
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # 1. Generate embedding for the query
    query_embedding = embedding_model.encode(query).tolist()

    # 2. Search for relevant documents in Qdrant
    search_result = qdrant_client.search(
        collection_name="tax_documents",
        query_vector=query_embedding,
        limit=3,
        with_payload=True
    )

    # 3. Formulate the prompt for the LLM
    context = ""
    for result in search_result:
        context += result.payload['text'] + "\n\n"

    prompt = f"""
    You are a helpful AI assistant specializing in US tax compliance.
    Answer the user's question based *only* on the following context provided from IRS documents.
    If the context does not contain the answer, state that you cannot answer the question with the provided information.

    Context:
    {context}

    Question:
    {query}

    Answer:
    """

    # 4. Generate response from Gemini
    try:
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        return {"response": response.text}
    except Exception as e:
        logging.error(f"Error during Gemini API call: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating response from LLM: {str(e)}")

@app.post("/ingest", tags=["Data Ingestion"])
async def trigger_ingestion():
    """
    Endpoint to trigger the ingestion of documents from the irs_docs folder.
    """
    try:
        ingest_documents()
        return {"message": "Ingestion process completed successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
