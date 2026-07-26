"""Knowledge base service: document upload, chunking, embedding, and retrieval.

Flow:
  1. User uploads a document (txt/md/pdf)
  2. Document is parsed to plain text
  3. Text is split into chunks (with overlap for context continuity)
  4. Each chunk is sent to the embedding API to get a vector
  5. On query: query is embedded, cosine similarity finds best chunks
  6. Optionally: memories are also embedded for combined retrieval
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Any

import httpx

from app.config import DEFAULT_EMBEDDING_CONFIG, KB_CHUNK_OVERLAP, KB_CHUNK_SIZE, KB_MAX_RESULTS, UPLOAD_DIR
from app.database import get_config, get_db


# --- Document parsing -------------------------------------------------------


def parse_file(file_path: Path, file_type: str) -> str:
    """Parse a file to plain text based on its type."""
    if file_type == "txt" or file_type == "md":
        return file_path.read_text(encoding="utf-8", errors="replace")

    if file_type == "pdf":
        # Try PyPDF2 or pdfplumber
        try:
            import PyPDF2

            text_parts: list[str] = []
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text_parts.append(page.extract_text() or "")
            return "\n".join(text_parts)
        except ImportError:
            try:
                import pdfplumber

                text_parts = []
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        text_parts.append(page.extract_text() or "")
                return "\n".join(text_parts)
            except ImportError:
                return "[PDF parsing not available. Install PyPDF2 or pdfplumber.]"

    return ""


def chunk_text(text: str, chunk_size: int = KB_CHUNK_SIZE, overlap: int = KB_CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks."""
    if not text.strip():
        return []

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = end - overlap
    return chunks


# --- Embedding API ----------------------------------------------------------


async def get_embedding_config() -> dict:
    """Retrieve embedding API configuration."""
    return await get_config("embedding_config", DEFAULT_EMBEDDING_CONFIG)


async def generate_embedding(text: str) -> list[float] | None:
    """Generate embedding vector for a text using the configured embedding API.

    Uses OpenAI-compatible /v1/embeddings endpoint.
    """
    config = await get_embedding_config()
    provider_url = config.get("provider_url", "").rstrip("/")
    api_key = config.get("api_key", "")
    model_name = config.get("model_name", "")

    if not provider_url or not api_key or not model_name:
        return None

    url = f"{provider_url}/embeddings"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {"model": model_name, "input": text[:8000]}  # Truncate very long text

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=body)
            if response.status_code != 200:
                return None
            data = response.json()
            embedding = data["data"][0]["embedding"]
            return embedding
    except Exception:
        return None


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


# --- Document management ----------------------------------------------------


async def upload_document(filename: str, file_path: Path, file_type: str) -> dict:
    """Upload, parse, chunk, and embed a document."""
    # Parse text
    text = parse_file(file_path, file_type)
    if not text.strip():
        return {"error": "Could not extract text from file"}

    # Chunk text
    chunks = chunk_text(text)
    if not chunks:
        return {"error": "No text chunks to process"}

    # Save document record
    db = await get_db()
    try:
        cursor = await db.execute(
            "INSERT INTO kb_documents (filename, file_path, file_type, file_size, chunk_count) "
            "VALUES (?, ?, ?, ?, ?)",
            (filename, str(file_path), file_type, file_path.stat().st_size, len(chunks)),
        )
        doc_id = cursor.lastrowid
        await db.commit()
    finally:
        await db.close()

    # Embed each chunk and save
    embedded_count = 0
    for i, chunk in enumerate(chunks):
        embedding = await generate_embedding(chunk)
        db = await get_db()
        try:
            await db.execute(
                "INSERT INTO kb_chunks (document_id, chunk_index, content, embedding) "
                "VALUES (?, ?, ?, ?)",
                (doc_id, i, chunk, json.dumps(embedding) if embedding else None),
            )
            await db.commit()
        finally:
            await db.close()
        if embedding:
            embedded_count += 1

    return {
        "id": doc_id,
        "filename": filename,
        "chunks": len(chunks),
        "embedded": embedded_count,
        "status": "uploaded",
    }


async def list_documents() -> list[dict]:
    """List all knowledge base documents."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM kb_documents ORDER BY created_at DESC"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def delete_document(doc_id: int) -> dict:
    """Delete a document and all its chunks."""
    db = await get_db()
    try:
        # Get file path before deletion
        cursor = await db.execute("SELECT file_path FROM kb_documents WHERE id = ?", (doc_id,))
        row = await cursor.fetchone()
        if row:
            try:
                os.unlink(row["file_path"])
            except OSError:
                pass

        await db.execute("DELETE FROM kb_chunks WHERE document_id = ?", (doc_id,))
        await db.execute("DELETE FROM kb_documents WHERE id = ?", (doc_id,))
        await db.commit()
        return {"status": "deleted", "id": doc_id}
    finally:
        await db.close()


async def search_knowledge(query: str, limit: int = KB_MAX_RESULTS) -> dict:
    """Search the knowledge base for relevant chunks.

    If embedding API is configured, uses semantic search (cosine similarity).
    Otherwise, falls back to simple text matching.
    """
    query_embedding = await generate_embedding(query)

    db = await get_db()
    try:
        if query_embedding:
            # Semantic search
            cursor = await db.execute(
                "SELECT c.id, c.content, c.document_id, d.filename, c.embedding "
                "FROM kb_chunks c JOIN kb_documents d ON c.document_id = d.id "
                "WHERE c.embedding IS NOT NULL"
            )
            rows = await cursor.fetchall()

            results: list[dict] = []
            for row in rows:
                emb = json.loads(row["embedding"])
                score = cosine_similarity(query_embedding, emb)
                results.append({
                    "chunk_id": row["id"],
                    "content": row["content"],
                    "document": row["filename"],
                    "document_id": row["document_id"],
                    "score": round(score, 4),
                })

            results.sort(key=lambda x: x["score"], reverse=True)
            results = results[:limit]
        else:
            # Fallback: simple text search
            cursor = await db.execute(
                "SELECT c.id, c.content, c.document_id, d.filename "
                "FROM kb_chunks c JOIN kb_documents d ON c.document_id = d.id "
                "WHERE c.content LIKE ? "
                "ORDER BY d.created_at DESC LIMIT ?",
                (f"%{query}%", limit),
            )
            rows = await cursor.fetchall()
            results = [
                {
                    "chunk_id": row["id"],
                    "content": row["content"],
                    "document": row["filename"],
                    "document_id": row["document_id"],
                    "score": 1.0 if query.lower() in row["content"].lower() else 0.5,
                }
                for row in rows
            ]

        # Optionally search memories too
        config = await get_embedding_config()
        if config.get("use_for_memory", False):
            memory_results = await _search_memories_embedding(query_embedding, query, limit)
            results.extend(memory_results)
            results.sort(key=lambda x: x["score"], reverse=True)
            results = results[:limit]

        return {
            "query": query,
            "results": results,
            "semantic": query_embedding is not None,
            "total": len(results),
        }
    finally:
        await db.close()


async def _search_memories_embedding(
    query_embedding: list[float] | None,
    query: str,
    limit: int,
) -> list[dict]:
    """Search memories by embedding or text match."""
    # For now, memories don't have embeddings stored.
    # We use the embedding API to embed memory content on the fly
    # if the embedding API is available.
    # This is a simplified implementation - in production you'd store
    # embeddings alongside memories.
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, title, content, importance, created_at FROM memories "
            "ORDER BY importance DESC LIMIT ?",
            (limit * 2,),
        )
        rows = await cursor.fetchall()

        results: list[dict] = []
        for row in rows:
            content = row["content"]
            if query.lower() in content.lower() or query.lower() in row["title"].lower():
                results.append({
                    "chunk_id": None,
                    "content": f"[Memory] {row['title']}: {content}",
                    "document": "memory",
                    "document_id": None,
                    "score": float(row["importance"]),
                })
        return results[:limit]
    finally:
        await db.close()


async def get_kb_stats() -> dict:
    """Get knowledge base statistics."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) as count FROM kb_documents")
        doc_count = (await cursor.fetchone())["count"]

        cursor = await db.execute("SELECT COUNT(*) as count FROM kb_chunks")
        chunk_count = (await cursor.fetchone())["count"]

        cursor = await db.execute(
            "SELECT COUNT(*) as count FROM kb_chunks WHERE embedding IS NOT NULL"
        )
        embedded_count = (await cursor.fetchone())["count"]

        return {
            "documents": doc_count,
            "chunks": chunk_count,
            "embedded": embedded_count,
            "embedding_configured": bool(
                (await get_embedding_config()).get("provider_url")
            ),
        }
    finally:
        await db.close()
