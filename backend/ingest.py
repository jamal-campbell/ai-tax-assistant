import os
import pypdf
from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
import uuid

# --- Configuration ---
# Construct the absolute path to the 'irs_docs' directory
DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "irs_docs"))
load_dotenv()
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "tax_documents"

# --- Main Ingestion Logic ---
def ingest_documents():
    """
    Reads PDFs from a directory, processes them into text chunks,
    generates embeddings, and upserts them into a Qdrant collection.
    """
    if not QDRANT_URL:
        raise ValueError("QDRANT_URL environment variable not set.")

    # Initialize clients
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

    # Create collection if it doesn't exist
    try:
        qdrant_client.recreate_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=embedding_model.get_sentence_embedding_dimension(),
                distance=models.Distance.COSINE
            ),
        )
        print(f"Collection '{COLLECTION_NAME}' created.")
    except Exception as e:
        print(f"Collection already exists or error creating it: {e}")


    # Process each PDF file
    for filename in os.listdir(DOCS_DIR):
        if filename.endswith(".pdf"):
            filepath = os.path.join(DOCS_DIR, filename)
            print(f"Processing {filepath}...")

            # 1. Extract text from PDF
            try:
                reader = pypdf.PdfReader(filepath)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() or ""
            except Exception as e:
                print(f"  - Could not read {filename}: {e}")
                continue

            # 2. Split text into chunks (e.g., by paragraph)
            chunks = [p.strip() for p in text.split("\n\n") if p.strip()]
            if not chunks:
                print(f"  - No text chunks found in {filename}.")
                continue

            print(f"  - Found {len(chunks)} chunks.")

            # 3. Generate embeddings and prepare points for Qdrant
            points = []
            for i, chunk in enumerate(chunks):
                # Generate a unique ID for each point
                point_id = str(uuid.uuid4())
                
                # Create vector embedding
                embedding = embedding_model.encode(chunk).tolist()

                # Prepare payload
                payload = {
                    "text": chunk,
                    "source": filename,
                    "chunk_index": i
                }

                points.append(
                    models.PointStruct(
                        id=point_id,
                        vector=embedding,
                        payload=payload
                    )
                )

            # 4. Upsert points to Qdrant in batches
            if points:
                qdrant_client.upsert(
                    collection_name=COLLECTION_NAME,
                    points=points,
                    wait=True  # Wait for the operation to complete
                )
                print(f"  - Upserted {len(points)} points to Qdrant.")

    print("\nIngestion complete!")

if __name__ == "__main__":
    # This allows the script to be run directly
    ingest_documents()
