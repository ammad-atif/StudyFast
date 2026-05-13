"""
Unified Chat extraction, embedding, and semantic search pipeline.
Supports ChatGPT, Claude, and Gemini share links with robust Playwright extractors.
"""

import os
import asyncio
import sys
import tempfile
from pathlib import Path
from datetime import datetime
from importlib.metadata import PackageNotFoundError, version as package_version
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
import pinecone as pinecone_package
from playwright_stealth import Stealth
# Pinecone SDK compatibility
try:
    pinecone_package.__version__ = package_version("pinecone")
except PackageNotFoundError:
    pinecone_package.__version__ = "0.0.0"

from pinecone._client import Pinecone
from pinecone.control import ServerlessSpec


# Ensure Windows uses the ProactorEventLoop for Playwright subprocesses
if sys.platform.startswith("win"):
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass


EXTRACTION_TIMEOUT_MS = int(os.getenv("EXTRACTION_TIMEOUT_MS", "45000"))
EXTRACTION_NAV_TIMEOUT_MS = int(os.getenv("EXTRACTION_NAV_TIMEOUT_MS", "30000"))
EXTRACTION_WAIT_SELECTOR_TIMEOUT_MS = int(os.getenv("EXTRACTION_WAIT_SELECTOR_TIMEOUT_MS", "12000"))
EXTRACTION_MIN_TEXT_LENGTH = int(os.getenv("EXTRACTION_MIN_TEXT_LENGTH", "20"))


def _browser_launch_args() -> list[str]:
    return [
        "--disable-blink-features=AutomationControlled", # Removes navigator.webdriver
        "--no-sandbox",
        "--disable-infobars", # Removes the "Chrome is being controlled" banner
        "--window-size=1920,1080"
    ]


def _headless_enabled() -> bool:
    return os.getenv("EXTRACTION_HEADLESS", "1") != "0"


def _slow_mo_ms() -> int:
    return int(os.getenv("EXTRACTION_SLOWMO", "0"))


def _apply_user_agent(page) -> None:
    ua = os.getenv("EXTRACTION_USER_AGENT")
    if ua:
        try:
            page.set_extra_http_headers({"user-agent": ua})
        except Exception:
            pass


def _load_page(page, url: str) -> None:
    page.set_default_navigation_timeout(EXTRACTION_NAV_TIMEOUT_MS)
    page.set_default_timeout(EXTRACTION_TIMEOUT_MS)
    for wait_until in ("networkidle", "domcontentloaded", "load"):
        try:
            page.goto(url, wait_until=wait_until, timeout=EXTRACTION_NAV_TIMEOUT_MS)
            return
        except Exception:
            continue
    raise RuntimeError(f"Failed to load page: {url}")


def _looks_blocked(page) -> bool:
    try:
        body = page.inner_text("body")
    except Exception:
        try:
            body = page.content()
        except Exception:
            body = ""
    lowered = body.lower()
    return any(token in lowered for token in ("performing security verification", "security verification", "please enable javascript"))


def _save_blocked_artifacts(page, prefix: str) -> tuple[str, str]:
    timestamp = int(__import__("time").time())
    screenshot_path = os.path.join(tempfile.gettempdir(), f"{prefix}_{timestamp}.png")
    html_path = os.path.join(tempfile.gettempdir(), f"{prefix}_{timestamp}.html")
    try:
        page.screenshot(path=screenshot_path, full_page=True)
    except Exception:
        pass
    try:
        with open(html_path, "w", encoding="utf-8") as handle:
            handle.write(page.content())
    except Exception:
        pass
    return screenshot_path, html_path


def _normalize_text(text: str) -> str:
    lines = [line.rstrip() for line in text.splitlines()]
    cleaned_lines = [line for line in lines if line.strip()]
    return "\n".join(cleaned_lines).strip()


def _node_text(node) -> str:
    try:
        return node.inner_text()
    except Exception:
        try:
            return node.text_content() or ""
        except Exception:
            return ""


def _first_non_empty_selector_text(node, selectors: list[str]) -> str:
    for selector in selectors:
        try:
            child = node.query_selector(selector)
        except Exception:
            child = None
        if child is not None:
            text = _normalize_text(_node_text(child))
            if text:
                return text
    return ""


def _collect_blocks(page, selectors: list[str]) -> list:
    blocks = []
    seen = set()
    for selector in selectors:
        try:
            elements = page.query_selector_all(selector)
        except Exception:
            continue
        for element in elements:
            text = _normalize_text(_node_text(element))
            if len(text) < EXTRACTION_MIN_TEXT_LENGTH:
                continue
            try:
                fingerprint = element.evaluate("element => element.outerHTML")
            except Exception:
                fingerprint = text[:200]
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            blocks.append(element)
    return blocks


def _extract_ordered_messages(page, block_selectors: list[str], sender_rules: list[tuple[str, list[str]]]) -> list[str]:
    messages = []
    blocks = _collect_blocks(page, block_selectors)
    for block in blocks:
        sender = None
        text = ""
        for label, selectors in sender_rules:
            text = _first_non_empty_selector_text(block, selectors)
            if text:
                sender = label
                break
        if not text:
            text = _normalize_text(_node_text(block))
            if not text:
                continue
        if sender:
            messages.append(f"{sender}: {text}")
        else:
            messages.append(text)
    return messages


def _write_extracted_text(output_file: str, messages: list[str]) -> None:
    content = "\n\n".join(messages).strip()
    with open(output_file, "w", encoding="utf-8") as handle:
        handle.write(content)


def _sync_extract_chatgpt_conversation(url: str, output_file: str) -> None:
    """Synchronous Playwright extraction for ChatGPT share pages."""
    from playwright.sync_api import sync_playwright
    print(f"  → (sync) Starting browser for URL: {url}")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=_headless_enabled(), slow_mo=_slow_mo_ms(), args=_browser_launch_args())
        page = browser.new_page()
        _apply_user_agent(page)
        _load_page(page, url)

        if _looks_blocked(page):
            screenshot_path, html_path = _save_blocked_artifacts(page, "extraction_blocked_chatgpt")
            browser.close()
            raise RuntimeError(f"Protected by anti-bot. Screenshot: {screenshot_path}, HTML: {html_path}")

        try:
            page.wait_for_selector('[data-message-id]', timeout=EXTRACTION_WAIT_SELECTOR_TIMEOUT_MS)
        except Exception:
            pass

        messages = _extract_ordered_messages(page, ['[data-message-id]'], [("User", ['[data-message-author-role="user"]', '[data-message-role="user"]']), ("ChatGPT", ['[data-message-author-role="assistant"]', '[data-message-role="assistant"]'])])
        if not messages:
            messages = [_normalize_text(_node_text(page.locator("body"))) if hasattr(page, "locator") else _normalize_text(page.inner_text('body'))]

        _write_extracted_text(output_file, messages)

        browser.close()


async def extract_chatgpt_conversation(url: str, output_file: str) -> None:
    await asyncio.to_thread(_sync_extract_chatgpt_conversation, url, output_file)


def _sync_extract_claude_conversation(url: str, output_file: str) -> None:
    """Synchronous Playwright extraction for Claude share pages."""
    from playwright.sync_api import sync_playwright
    print(f"  → (sync) Starting browser for Claude URL: {url}")
    with Stealth().use_sync(sync_playwright()) as p:
        browser = p.chromium.launch(headless=_headless_enabled(), slow_mo=_slow_mo_ms(), args=_browser_launch_args())
        page = browser.new_page()

        _apply_user_agent(page)
        _load_page(page, url)

        if _looks_blocked(page):
            screenshot_path, html_path = _save_blocked_artifacts(page, "extraction_blocked_claude")
            browser.close()
            raise RuntimeError(f"Protected by anti-bot. Screenshot: {screenshot_path}, HTML: {html_path}")

        try:
            page.wait_for_selector('div[role="article"]', timeout=EXTRACTION_WAIT_SELECTOR_TIMEOUT_MS)
        except Exception:
            pass

        article_selector = 'div[role="article"]'
        article_blocks = []
        try:
            article_blocks = page.query_selector_all(article_selector)
        except Exception:
            article_blocks = []

        messages = []
        for article in article_blocks:
            try:
                sender_label = _first_non_empty_selector_text(article, ['.font-semibold'])
                message_text = _first_non_empty_selector_text(article, ['.font-claude-message'])

                if not message_text:
                    message_text = _normalize_text(_node_text(article))

                if sender_label:
                    lowered = sender_label.lower()
                    if 'human' in lowered or 'you' in lowered:
                        sender = 'User'
                    elif 'claude' in lowered or 'assistant' in lowered:
                        sender = 'Claude'
                    else:
                        sender = 'Claude'
                else:
                    sender = 'Claude'

                if message_text:
                    messages.append(f"{sender}: {message_text}")
            except Exception:
                continue

        if not messages:
            try:
                messages = [_normalize_text(page.inner_text('main'))]
            except Exception:
                messages = [_normalize_text(page.inner_text('body'))]

        _write_extracted_text(output_file, messages)

        browser.close()


async def extract_claude_conversation(url: str, output_file: str) -> None:
    await asyncio.to_thread(_sync_extract_claude_conversation, url, output_file)


def _sync_extract_gemini_conversation(url: str, output_file: str) -> None:
    """Synchronous Playwright extraction for Gemini share pages."""
    from playwright.sync_api import sync_playwright
    print(f"  → (sync) Starting browser for Gemini URL: {url}")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=_headless_enabled(), slow_mo=_slow_mo_ms(), args=_browser_launch_args())
        page = browser.new_page()
        _apply_user_agent(page)
        _load_page(page, url)

        if _looks_blocked(page):
            screenshot_path, html_path = _save_blocked_artifacts(page, "extraction_blocked_gemini")
            browser.close()
            raise RuntimeError(f"Protected by anti-bot. Screenshot: {screenshot_path}, HTML: {html_path}")

        try:
            page.wait_for_selector('div[role="article"], div.message-content, main[role="main"]', timeout=EXTRACTION_WAIT_SELECTOR_TIMEOUT_MS)
        except Exception:
            pass

        messages = _extract_ordered_messages(
            page,
            ['div[role="article"]', 'div.message-content', 'article', 'main[role="main"] > *'],
            [
                ("User", ['user-query', 'div.user-query', '.query-content', '[data-sender="user"]']),
                ("Gemini", ['model-response', 'div.model-response-text', '.markdown', '[data-sender="model"]']),
            ],
        )

        if not messages:
            try:
                messages = [_normalize_text(page.inner_text('body'))]
            except Exception:
                messages = [_normalize_text(page.content())]

        _write_extracted_text(output_file, messages)

        browser.close()


async def extract_gemini_conversation(url: str, output_file: str) -> None:
    await asyncio.to_thread(_sync_extract_gemini_conversation, url, output_file)


def detect_link_type(url: str) -> str:
    url_lower = url.lower()
    if 'claude.ai' in url_lower:
        return 'claude'
    if 'gemini.google.com' in url_lower or 'google.com/gemini' in url_lower:
        return 'gemini'
    if 'chatgpt.com' in url_lower or 'openai.com' in url_lower:
        return 'chatgpt'
    return 'unknown'


class ChatPipeline:
    """Unified pipeline for chat extraction, embedding, and semantic search."""

    def __init__(self, index_name: str = "post-embeddings"):
        self.index_name = index_name
        self.model_name = "all-MiniLM-L6-v2"
        self.chunk_size = 500
        self.model = None
        self.pc = None
        self.index = None
        self._load_environment()
        self._initialize_pinecone()

    def _load_environment(self) -> None:
        current_dir = Path(__file__).resolve().parent
        env_path = current_dir / ".env"
        if env_path.exists():
            load_dotenv(dotenv_path=env_path, override=False)
        else:
            load_dotenv(override=False)

    def _initialize_pinecone(self) -> None:
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("PINECONE_API_KEY environment variable not set")
        self.pc = Pinecone(api_key=api_key)

    def _load_model(self) -> None:
        if self.model is None:
            print(f"Loading SentenceTransformer model ({self.model_name})...")
            self.model = SentenceTransformer(self.model_name)
            print("✓ Model loaded successfully")

    def _split_into_chunks(self, text: str) -> list[str]:
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
        link_type = detect_link_type(url)
        print(f"STEP 1: EXTRACTING {link_type.upper()} CONVERSATION")
        temp_file = os.path.join(tempfile.gettempdir(), "extracted_chat_temp.txt")
        if link_type == 'claude':
            await extract_claude_conversation(url, temp_file)
        elif link_type == 'gemini':
            await extract_gemini_conversation(url, temp_file)
        else:
            await extract_chatgpt_conversation(url, temp_file)
        if not os.path.exists(temp_file):
            raise FileNotFoundError(f"Extraction failed: {temp_file} not created")
        with open(temp_file, "r", encoding="utf-8") as f:
            content = f.read()
        static_path = os.path.join(os.path.dirname(__file__), "text.txt")
        try:
            with open(static_path, "w", encoding="utf-8") as sf:
                sf.write(content)
        except Exception:
            pass
        os.remove(temp_file)
        return content

    def create_embeddings(self, text: str, chat_id: str = None) -> list[dict]:
        self._load_model()
        chunks = self._split_into_chunks(text)
        embeddings = self.model.encode(chunks, show_progress_bar=True)
        records = []
        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            vid = f"{chat_id}_chunk_{i}" if chat_id else f"chunk_{i}"
            records.append({
                "id": vid,
                "values": emb.tolist(),
                "metadata": {"chunk_index": i, "total_chunks": len(chunks), "text": chunk, "chat_id": chat_id, "created_at": datetime.now().isoformat()}
            })
        return records

    def store_embeddings(self, embedding_records: list[dict]) -> bool:
        listed_indexes = self.pc.list_indexes()
        if hasattr(listed_indexes, "names"):
            index_names = list(listed_indexes.names())
        else:
            index_names = [idx.get("name") for idx in listed_indexes]
        if self.index_name not in index_names:
            self.pc.create_index(name=self.index_name, dimension=384, metric="cosine", spec=ServerlessSpec(cloud=os.getenv("PINECONE_CLOUD", "aws"), region=os.getenv("PINECONE_REGION", "us-east-1")))
        self.index = self.pc.Index(self.index_name)
        self.index.upsert(vectors=embedding_records)
        return True

