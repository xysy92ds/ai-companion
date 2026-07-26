"""Knowledge base API routes: document upload, search, and management."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

from app.config import UPLOAD_DIR
from app.services.kb_service import (
    delete_document,
    get_kb_stats,
    list_documents,
    search_knowledge,
    upload_document,
)

router = APIRouter(prefix="/api/kb", tags=["knowledge-base"])


class SearchRequest(BaseModel):
    query: str
    limit: int = 5


@router.get("/documents")
async def get_documents():
    """List all knowledge base documents."""
    return {"documents": await list_documents()}


@router.post("/upload")
async def upload_document_api(file: UploadFile = File(...)):
    """Upload a document to the knowledge base."""
    if not file.filename:
        return {"error": "No filename provided"}

    # Determine file type
    ext = Path(file.filename).suffix.lower().lstrip(".")
    if ext not in ("txt", "md", "pdf"):
        return {"error": f"Unsupported file type: .{ext}. Supported: txt, md, pdf"}

    # Save file to upload directory
    safe_name = file.filename.replace("/", "_").replace("\\", "_")
    file_path = UPLOAD_DIR / safe_name

    content = await file.read()
    file_path.write_bytes(content)

    # Process the document
    result = await upload_document(file.filename, file_path, ext)
    return result


@router.delete("/documents/{doc_id}")
async def delete_document_api(doc_id: int):
    """Delete a document and all its chunks."""
    return await delete_document(doc_id)


@router.post("/search")
async def search_api(req: SearchRequest):
    """Search the knowledge base."""
    return await search_knowledge(req.query, req.limit)


@router.get("/stats")
async def kb_stats():
    """Get knowledge base statistics."""
    return await get_kb_stats()
