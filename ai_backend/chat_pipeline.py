"""
Unified ChatGPT extraction, embedding, and semantic search pipeline.
Clean class-based structure for the entire workflow.
"""

import os
import asyncio
import sys

# On Windows, ensure the ProactorEventLoop is used so subprocess support works
# Playwright spawns browser subprocesses; without a loop that supports subprocesses
# you get `NotImplementedError` from asyncio.create_subprocess_exec.
if sys.platform.startswith("win"):
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        # If setting the policy fails for any reason, continue — caller will see errors.
        pass
import tempfile
from pathlib import Path
from datetime import datetime
from importlib.metadata import PackageNotFoundError, version as package_version

from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
import pinecone as pinecone_package

# Pinecone SDK compatibility
try:
    pinecone_package.__version__ = package_version("pinecone")
except PackageNotFoundError:
    pinecone_package.__version__ = "0.0.0"

from pinecone._client import Pinecone
from pinecone.control import ServerlessSpec


def _sync_extract_chatgpt_conversation(url: str, output_file: str) -> None:
    """Synchronous Playwright extraction (runs in a thread).

    Using the sync API avoids asyncio subprocess usage in the event loop
    (which can raise NotImplementedError on some Windows event loops).
    """
    from playwright.sync_api import sync_playwright
    import time

    print(f"  → (sync) Starting browser for URL: {url}")
    with sync_playwright() as p:
        print("  → Launching Chromium browser (sync)...")
        browser = p.chromium.launch()
        page = browser.new_page()

        print("  → Loading page...")
        page.goto(url, wait_until="networkidle")
        time.sleep(2)
        print("  ✓ Page loaded successfully")

        print("  → Scrolling to load all messages (sync)...")
        last_height = 0
        scroll_pause_time = 1
        scroll_count = 0

        for _ in range(50):
            page.evaluate("window.scrollBy(0, window.innerHeight)")
            time.sleep(scroll_pause_time)
            scroll_count += 1
            new_height = page.evaluate("document.documentElement.scrollHeight")
            if new_height == last_height:
                print(f"  ✓ Reached end of conversation after {scroll_count} scrolls")
                break
            last_height = new_height

        print("  → Extracting conversation text (sync) via element handles...")
        elements = page.query_selector_all('[data-message-id]')
        texts = []
        for el in elements:
            try:
                txt = el.inner_text()
            except Exception:
                txt = el.text_content() or ""
            if txt:
                texts.append(txt.strip())

        page_text = "\n\n".join(texts)

        if not page_text or len(page_text.strip()) < 100:
            print("  → Using fallback: extracting all visible text (sync)...")
            try:
                page_text = page.inner_text('body')
            except Exception:
                page_text = page.content()

        with open(output_file, "w", encoding="utf-8") as f:
            f.write(page_text)

        char_count = len(page_text)
        word_count = len(page_text.split())
        print(f"  ✓ TEXT SCRAPED: {char_count} characters, {word_count} words")

        browser.close()
        print("  ✓ Browser closed (sync)")


async def extract_chatgpt_conversation(url: str, output_file: str) -> None:
    """Async wrapper that runs the sync extraction in a thread."""
    await asyncio.to_thread(_sync_extract_chatgpt_conversation, url, output_file)


class ChatPipeline:
    """Unified pipeline for chat extraction, embedding, and semantic search."""

    def __init__(self, index_name: str = "chatgpt-extracts"):
        """Initialize the pipeline with configuration."""
        self.index_name = index_name
        self.model_name = "all-MiniLM-L6-v2"
        self.chunk_size = 500
        self.model = None
        self.pc = None
        self.index = None
        
        self._load_environment()
        self._initialize_pinecone()

    def _load_environment(self) -> None:
        """Load environment variables from .env file."""
        current_dir = Path(__file__).resolve().parent
        env_path = current_dir / ".env"
        if env_path.exists():
            load_dotenv(dotenv_path=env_path, override=False)
        else:
            load_dotenv(override=False)

    def _initialize_pinecone(self) -> None:
        """Initialize Pinecone connection."""
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("PINECONE_API_KEY environment variable not set")
        self.pc = Pinecone(api_key=api_key)

    def _load_model(self) -> None:
        """Load SentenceTransformer model if not already loaded."""
        if self.model is None:
            print(f"Loading SentenceTransformer model ({self.model_name})...")
            self.model = SentenceTransformer(self.model_name)
            print("✓ Model loaded successfully")

    def _split_into_chunks(self, text: str) -> list[str]:
        """Split text into chunks of reasonable size."""
        chunks = []
        current_chunk = ""
        sentences = text.split(". ")

        for sentence in sentences:
            if len(current_chunk) + len(sentence) < self.chunk_size:
                current_chunk += sentence + ". "
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence + ". "

        if current_chunk:
            chunks.append(current_chunk.strip())

        return chunks

    async def extract_chat(self, url: str) -> str:
        """Extract chat from URL using Playwright and return raw text."""
        print("\n" + "=" * 80)
        print("STEP 1: EXTRACTING CHATGPT CONVERSATION")
        print("=" * 80)
        print(f"URL: {url}\n")

        # Use cross-platform temp directory
        temp_file = os.path.join(tempfile.gettempdir(), "extracted_chat_temp.txt")
        await extract_chatgpt_conversation(url, temp_file)

        # Read content into memory
        if not os.path.exists(temp_file):
            raise FileNotFoundError(f"Extraction failed: {temp_file} not created")

        with open(temp_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Also save the extracted content to a static file `text.txt` in this package
        static_path = os.path.join(os.path.dirname(__file__), "text.txt")
        try:
            with open(static_path, "w", encoding="utf-8") as sf:
                sf.write(content)
            print(f"  ✓ Saved extracted text to: {static_path}")
        except Exception as _e:
            print(f"  ⚠️ Warning: failed to write static text file: {_e}")

        # Clean up temp file
        os.remove(temp_file)

        print(f"\n✓ EXTRACTION COMPLETE")
        print(f"  Content Size: {len(content):,} characters")
        print(f"  Word Count: {len(content.split()):,} words")
        return content

    def create_embeddings(self, text: str, chat_id: str = None) -> list[dict]:
        """Create embeddings from chat text."""
        print("\n" + "=" * 80)
        print("STEP 2: CREATING EMBEDDINGS")
        print("=" * 80 + "\n")

        self._load_model()

        # Split into chunks
        print("  → Splitting text into chunks...")
        chunks = self._split_into_chunks(text)
        avg_chunk_size = sum(len(c) for c in chunks) / len(chunks) if chunks else 0
        print(f"  ✓ CHUNKS CREATED: {len(chunks)} chunks (avg {avg_chunk_size:.0f} chars/chunk)\n")

        # Create embeddings
        print("  → Generating embeddings...")
        embeddings = self.model.encode(chunks, show_progress_bar=True)
        embedding_dim = len(embeddings[0]) if len(embeddings) > 0 else 0
        print(f"\n  ✓ EMBEDDINGS GENERATED: {len(embeddings)} embeddings ({embedding_dim}-dimensional)\n")

        # Create embedding records with metadata
        embedding_records = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            vector_id = f"{chat_id}_chunk_{i}" if chat_id else f"chunk_{i}"
            record = {
                "id": vector_id,
                "values": embedding.tolist(),
                "metadata": {
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                    "text": chunk,
                    "chat_id": chat_id,
                    "created_at": datetime.now().isoformat()
                }
            }
            embedding_records.append(record)

        print(f"✓ EMBEDDING RECORDS CREATED: {len(embedding_records)} records ready for storage")
        return embedding_records

    def store_embeddings(self, embedding_records: list[dict]) -> bool:
        """Store embeddings in Pinecone."""
        print("\n" + "=" * 80)
        print("STEP 3: STORING EMBEDDINGS IN PINECONE")
        print("=" * 80 + "\n")

        # Check or create index
        print(f"  → Checking for index: {self.index_name}")
        listed_indexes = self.pc.list_indexes()
        if hasattr(listed_indexes, "names"):
            index_names = list(listed_indexes.names())
        else:
            index_names = [idx.get("name") for idx in listed_indexes]

        if self.index_name not in index_names:
            print(f"  → Index not found, creating new one...")
            print(f"    • Name: {self.index_name}")
            print(f"    • Dimension: 384 (all-MiniLM-L6-v2)")
            print(f"    • Metric: cosine")
            self.pc.create_index(
                name=self.index_name,
                dimension=384,  # all-MiniLM-L6-v2 produces 384-dimensional embeddings
                metric="cosine",
                spec=ServerlessSpec(
                    cloud=os.getenv("PINECONE_CLOUD", "aws"),
                    region=os.getenv("PINECONE_REGION", "us-east-1"),
                ),
            )
            print(f"  ✓ INDEX CREATED: {self.index_name}\n")
        else:
            print(f"  ✓ INDEX CONNECTED: {self.index_name}\n")

        self.index = self.pc.Index(self.index_name)

        # Upsert vectors
        print(f"  → Uploading {len(embedding_records)} vectors to Pinecone...")
        upsert_response = self.index.upsert(vectors=embedding_records)
        print(f"  ✓ VECTORS UPLOADED\n")

        # Verify upload
        print("  → Verifying upload...")
        stats = self.index.describe_index_stats()
        if isinstance(stats, dict):
            total_vectors = stats.get("total_vector_count")
        else:
            total_vectors = getattr(stats, "total_vector_count", None)
        print(f"  ✓ STORAGE VERIFIED: Index contains {total_vectors:,} total vectors")

        return True

    def search(self, question: str, top_k: int = 5) -> dict:
        """Semantic search for a question."""
        if not self.index:
            self.index = self.pc.Index(self.index_name)

        self._load_model()

        # Embed the question
        query_vector = self.model.encode([question])[0].tolist()

        # Query Pinecone
        results = self.index.query(
            vector=query_vector,
            top_k=top_k,
            include_metadata=True,
        )

        return results

    async def run_full_pipeline(self, chat_url: str) -> None:
        """Run the complete pipeline: extract -> embed -> store."""
        print("\n")
        print("╔" + "=" * 78 + "╗")
        print("║" + " ChatGPT Extraction → Embeddings → Pinecone Vector Store Pipeline ".center(78) + "║")
        print("╚" + "=" * 78 + "╝")

        try:
            # Extract
            chat_id = chat_url.split("/")[-1] if "/" in chat_url else None
            chat_text = await self.extract_chat(chat_url)

            # Create embeddings
            embedding_records = self.create_embeddings(chat_text, chat_id=chat_id)

            # Store
            self.store_embeddings(embedding_records)

            # Summary
            print("\n" + "=" * 80)
            print("✓✓✓ PIPELINE COMPLETED SUCCESSFULLY! ✓✓✓".center(80))
            print("=" * 80)
            print(f"\n📊 SUMMARY:")
            print(f"   ✓ Text scraped from ChatGPT conversation")
            print(f"   ✓ {len(embedding_records)} embeddings created")
            print(f"   ✓ Embeddings stored in Pinecone index: {self.index_name}")
            print(f"   ✓ Chat ID: {chat_id}")
            print("\n" + "=" * 80 + "\n")

        except Exception as e:
            print("\n" + "=" * 80)
            print("✗✗✗ PIPELINE FAILED! ✗✗✗".center(80))
            print("=" * 80)
            print(f"\n❌ Error: {e}\n")
            print("=" * 80 + "\n")
            raise
