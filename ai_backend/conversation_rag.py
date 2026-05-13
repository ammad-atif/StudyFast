import os
import re
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from groq import Groq


class ConversationRAG:
    """Unified class for conversation retrieval, semantic search, summary, and quiz generation."""

    def __init__(self, pipeline):
        self.pipeline = pipeline
        self._load_environment()

    def _load_environment(self) -> None:
        current_dir = Path(__file__).resolve().parent
        env_path = current_dir / ".env"
        if env_path.exists():
            load_dotenv(dotenv_path=env_path, override=False)
        else:
            load_dotenv(override=False)

    def _get_groq_client(self) -> tuple[Groq, str]:
        groq_key = os.getenv("GROQ_API_KEY")
        groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        if not groq_key:
            raise ValueError("GROQ_API_KEY must be set in the environment")
        return Groq(api_key=groq_key), groq_model

    def _fetch_vectors_by_ids(self, index, vector_ids: list[str]) -> list[dict]:
        if not vector_ids:
            return []

        resp = index.fetch(ids=vector_ids)
        vectors = getattr(resp, "vectors", None)
        if vectors is None and isinstance(resp, dict):
            vectors = resp.get("vectors", {})

        normalized = []
        if isinstance(vectors, dict):
            for vector_id, vector in vectors.items():
                metadata = vector.get("metadata") if isinstance(vector, dict) else getattr(vector, "metadata", {})
                normalized.append({"id": vector_id, "metadata": metadata or {}})

        return normalized

    def _fetch_post_chunks(self, index, post_id: str) -> list[str]:
        """Fetch all chunks for a given post_id by stored chunk IDs."""
        first_vectors = self._fetch_vectors_by_ids(index, [f"{post_id}_chunk_0"])
        if not first_vectors:
            first_vectors = self._fetch_vectors_by_ids(index, ["chunk_0"])

        if not first_vectors:
            return []

        matched_metadata = first_vectors[0].get("metadata") or {}
        chat_id = matched_metadata.get("chat_id") or post_id
        total_chunks = matched_metadata.get("total_chunks") or matched_metadata.get("total_vector_count")
        if not isinstance(total_chunks, int) or total_chunks <= 0:
            total_chunks = 1

        vector_ids = [f"{chat_id}_chunk_{i}" for i in range(total_chunks)]
        fetched_vectors = self._fetch_vectors_by_ids(index, vector_ids)
        metadata_list = [item.get("metadata") or {} for item in fetched_vectors]

        chunks = []
        for md in metadata_list:
            text = md.get("text") or ""
            chunk_index = md.get("chunk_index")
            chunks.append((chunk_index if isinstance(chunk_index, int) else 0, text))

        chunks.sort(key=lambda x: x[0])
        return [c[1] for c in chunks if c[1]]

    def _query_post_chunks_by_similarity(self, index, post_id: str, question: str, top_k: int = 5) -> list[dict]:
        """Fetch the most relevant chunks for a post_id using question similarity."""
        self.pipeline._load_model()
        question_vector = self.pipeline.model.encode([question])[0].tolist()

        filter_obj = {"chat_id": {"$eq": post_id}}

        try:
            response = index.query(
                vector=question_vector,
                top_k=top_k,
                include_metadata=True,
                filter=filter_obj,
            )
        except Exception:
            response = index.query(
                vector=question_vector,
                top_k=top_k,
                include_metadata=True,
            )

        matches = getattr(response, "matches", None)
        if matches is None and isinstance(response, dict):
            matches = response.get("matches", [])

        relevant_chunks: list[dict] = []
        for match in matches or []:
            if isinstance(match, dict):
                metadata = match.get("metadata") or {}
                score = match.get("score")
                vector_id = match.get("id")
            else:
                metadata = getattr(match, "metadata", {}) or {}
                score = getattr(match, "score", None)
                vector_id = getattr(match, "id", None)

            # Accept match if metadata.chat_id matches post_id
            chat_id_meta = metadata.get("chat_id") if isinstance(metadata, dict) else None
            accepted = False
            if chat_id_meta == post_id:
                accepted = True

            # Fallback: accept if vector id starts with post_id (pattern: {chat_id}_chunk_{i})
            if not accepted and isinstance(vector_id, str) and vector_id.startswith(f"{post_id}_chunk_"):
                accepted = True

            if not accepted:
                continue

            relevant_chunks.append({
                "score": score,
                "chunk_index": metadata.get("chunk_index") if isinstance(metadata.get("chunk_index"), int) else 0,
                "text": metadata.get("text") or "",
                "metadata": metadata,
            })

        relevant_chunks.sort(key=lambda item: item["score"] if item["score"] is not None else 0, reverse=True)
        return relevant_chunks

    def has_embeddings(self, post_id: str) -> bool:
        """Return True only if Pinecone has at least one vector for this post_id."""
        if not self.pipeline.pc:
            raise ValueError("Pinecone client not initialized on pipeline")

        # If the index does not exist yet, treat it as "no embeddings yet"
        # so embedding creation can proceed and create the index later.
        try:
            index = self.pipeline.pc.Index(self.pipeline.index_name)
        except Exception as exc:
            if "not found" in str(exc).lower() or "404" in str(exc):
                return False
            raise

        filter_obj = {"chat_id": {"$eq": post_id}}

        # Preferred path: ask Pinecone directly how many vectors match the filter.
        try:
            stats = index.describe_index_stats(filter=filter_obj)
            if isinstance(stats, dict):
                total_vectors = stats.get("total_vector_count")
                if total_vectors is None:
                    namespaces = stats.get("namespaces", {})
                    total_vectors = sum(ns.get("vector_count", 0) for ns in namespaces.values()) if namespaces else 0
                return int(total_vectors or 0) > 0

            total_vectors = getattr(stats, "total_vector_count", None)
            if total_vectors is not None:
                return int(total_vectors) > 0
        except Exception as exc:
            # Missing index should not fail idempotency check.
            if "not found" in str(exc).lower() or "404" in str(exc):
                return False

        # Fallback for older records or SDKs: fetch by known chunk IDs.
        try:
            fetched = self._fetch_vectors_by_ids(index, [f"{post_id}_chunk_0", "chunk_0"])
            if fetched:
                return True
        except Exception as exc:
            if "not found" in str(exc).lower() or "404" in str(exc):
                return False

        return False

    def semantic_search(self, question: str, top_k: int = 50) -> list[dict]:
        """Perform weighted semantic search across stored posts."""
        search_results = self.pipeline.search(question, top_k=top_k)
        matches = search_results.get("matches", []) if isinstance(search_results, dict) else getattr(search_results, "matches", [])

        if not matches:
            return []

        post_chunks: dict[str, list[dict]] = {}
        for match in matches:
            score = match.get("score") if isinstance(match, dict) else getattr(match, "score", None)
            metadata = match.get("metadata") if isinstance(match, dict) else getattr(match, "metadata", {})
            post_id = metadata.get("chat_id") if isinstance(metadata, dict) else None
            if not post_id:
                continue
            post_chunks.setdefault(post_id, []).append({
                "score": score,
                "metadata": metadata,
                "match": match,
            })

        results = []
        for post_id, chunks in post_chunks.items():
            chunks_sorted = sorted(chunks, key=lambda x: x["score"], reverse=True)
            best = chunks_sorted[0]
            best_score = best["score"]
            if len(chunks_sorted) > 1:
                other_scores = [c["score"] for c in chunks_sorted[1:]]
                avg_other = sum(other_scores) / len(other_scores)
            else:
                avg_other = 0.0

            weighted = (best_score * 0.7) + (avg_other * 0.3)

            metadata = best["metadata"]
            text = metadata.get("text") if isinstance(metadata, dict) else ""
            chunk_index = metadata.get("chunk_index") if isinstance(metadata, dict) else None

            results.append({
                "post_id": post_id,
                "weighted_score": float(weighted),
            })

        results.sort(key=lambda r: r["weighted_score"], reverse=True)
        return [r for r in results if r["weighted_score"] > 0]

    def summarize_post(self, post_id: str, max_tokens: int = 300) -> str:
        client, groq_model = self._get_groq_client()
        if not self.pipeline.pc:
            raise ValueError("Pinecone client not initialized on pipeline")

        index = self.pipeline.pc.Index(self.pipeline.index_name)
        texts = self._fetch_post_chunks(index, post_id)
        if not texts:
            raise ValueError(f"No chunks found for post_id={post_id}")

        full_text = "\n\n".join(texts)
        prompt = (
            "Summarize the following conversation into a concise post summary. "
            "Keep the key points, decisions, action items, and any important context.\n\n"
            f"Conversation:\n{full_text}"
        )

        completion = client.chat.completions.create(
            model=groq_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=1,
            max_completion_tokens=max_tokens,
            top_p=1,
            reasoning_effort="medium",
            stream=True,
            stop=None,
        )

        summary_parts: list[str] = []
        for chunk in completion:
            delta = getattr(chunk.choices[0], "delta", None)
            content = getattr(delta, "content", None) if delta else None
            if content:
                summary_parts.append(content)

        summary_text = "".join(summary_parts).strip()
        if not summary_text:
            raise RuntimeError("Groq returned an empty summary")

        return summary_text

    def generate_quiz(self, post_id: str, num_questions: int = 10, max_tokens: int = 600) -> dict:
        client, groq_model = self._get_groq_client()
        if not self.pipeline.pc:
            raise ValueError("Pinecone client not initialized on pipeline")

        index = self.pipeline.pc.Index(self.pipeline.index_name)
        texts = self._fetch_post_chunks(index, post_id)
        if not texts:
            raise ValueError(f"No chunks found for post_id={post_id}")

        full_text = "\n\n".join(texts)
        prompt = (
            "Create a student-friendly quiz from the conversation below. "
            f"Generate exactly {num_questions} multiple-choice questions that help a learner prepare. "
            "Use this plain-text format exactly:\n"
            "Quiz Title: <short title>\n\n"
            "1. <question>\n"
            "A) <option>\n"
            "B) <option>\n"
            "C) <option>\n"
            "D) <option>\n"
            "Answer: <A/B/C/D>\n"
            "Explanation: <brief explanation>\n\n"
            "Repeat for each question. Do not use JSON, code fences, or markdown tables.\n\n"
            f"Conversation:\n{full_text}"
        )

        response = client.chat.completions.create(
            model=groq_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=1,
            max_completion_tokens=max_tokens,
            top_p=1,
            reasoning_effort="medium",
            stream=False,
            stop=None,
        )

        choice = response.choices[0] if getattr(response, "choices", None) else None
        message = getattr(choice, "message", None) if choice else None
        quiz_text = (getattr(message, "content", None) or "").strip()
        if not quiz_text:
            raise RuntimeError("Groq returned an empty quiz")

        lines = [line.strip() for line in quiz_text.splitlines() if line.strip()]
        title = f"Quiz for {post_id}"
        questions: list[dict[str, Any]] = []
        current = None

        def _flush_current() -> None:
            nonlocal current
            if current and current.get("question"):
                questions.append(current)
            current = None

        for line in lines:
            if line.lower().startswith("quiz title:"):
                title = line.split(":", 1)[1].strip() or title
                continue

            if re.match(r"^\d+\.\s+", line):
                _flush_current()
                current = {
                    "question": re.sub(r"^\d+\.\s+", "", line).strip(),
                    "choices": [],
                    "answer": [],
                    "explanation": "",
                }
                continue

            if current is None:
                continue

            if re.match(r"^[A-Da-d][\)\.]\s+", line):
                current["choices"].append(re.sub(r"^[A-Da-d][\)\.]\s+", "", line).strip())
                continue

            if line.lower().startswith("answer:"):
                current["answer"] = line.split(":", 1)[1].strip()
                continue

            if line.lower().startswith("explanation:"):
                current["explanation"] = line.split(":", 1)[1].strip()
                continue

            if current["choices"] and not current["explanation"] and not current["answer"]:
                current["question"] += f" {line}"
            elif current["explanation"]:
                current["explanation"] += f" {line}"

        _flush_current()
        return {"title": title, "questions": questions, "raw_output": quiz_text}

    def conversation_rag_answer(self, post_id: str, question: str, top_k: int = 5, max_tokens: int = 600) -> dict:
        client, groq_model = self._get_groq_client()
        if not self.pipeline.pc:
            raise ValueError("Pinecone client not initialized on pipeline")

        index = self.pipeline.pc.Index(self.pipeline.index_name)
        relevant_chunks = self._query_post_chunks_by_similarity(index, post_id, question, top_k=top_k)
        # If similarity search returned nothing, fall back to fetching all chunks
        if not relevant_chunks:
            # Try to fetch all chunks for this post and use them as context
            texts = self._fetch_post_chunks(index, post_id)
            if not texts:
                raise ValueError(f"No relevant chunks found for post_id={post_id}")

            # Build pseudo-chunks list from full texts
            relevant_chunks = []
            for i, t in enumerate(texts):
                relevant_chunks.append({
                    "score": None,
                    "chunk_index": i,
                    "text": t,
                    "metadata": {"chunk_index": i, "text": t},
                })

        context = "\n\n".join(
            f"[chunk {chunk['chunk_index']}] {chunk['text']}"
            for chunk in relevant_chunks
            if chunk.get("text")
        )

        prompt = (
            "You are a conversational RAG assistant. Answer the question using only the retrieved chunks from the post. "
            "If the chunks do not contain enough information, say that clearly. "
            "Keep the answer concise and useful for a student.\n\n"
            f"Post ID: {post_id}\n"
            f"Question: {question}\n\n"
            f"Retrieved Chunks:\n{context}"
        )

        response = client.chat.completions.create(
            model=groq_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=1,
            max_completion_tokens=max_tokens,
            top_p=1,
            reasoning_effort="medium",
            stream=False,
            stop=None,
        )

        choice = response.choices[0] if getattr(response, "choices", None) else None
        message = getattr(choice, "message", None) if choice else None
        answer_text = (getattr(message, "content", None) or "").strip()
        if not answer_text:
            raise RuntimeError("Groq returned an empty RAG answer")

        return {
            "post_id": post_id,
            "question": question,
            "answer": answer_text,
            "chunks_used": len(relevant_chunks),
            "chunks": relevant_chunks,
        }

    # Backwards-compatible wrappers expected by app.py
    def answer_question(self, post_id: str, question: str, top_k: int = 5, max_tokens: int = 600) -> dict:
        return self.conversation_rag_answer(post_id, question, top_k=top_k, max_tokens=max_tokens)

    def generate_summary(self, post_id: str, max_tokens: int = 2000) -> str:
        return self.summarize_post(post_id, max_tokens=max_tokens)
