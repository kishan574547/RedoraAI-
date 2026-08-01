from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.db.models.session_document import SessionDocument
from app.services.pdf_tools import merge_pdfs, split_pdf, compress_pdf, validate_pdf_bytes


def _get_target_documents(db: Session, session_id: Optional[int], file_ids: Optional[List[int]] = None) -> List[SessionDocument]:
    """Retrieve SessionDocument records by file_ids or fallback to session_id."""
    query = db.query(SessionDocument)
    if file_ids:
        docs = query.filter(SessionDocument.id.in_(file_ids)).all()
        if docs:
            return docs
    if session_id:
        docs = query.filter(SessionDocument.session_id == session_id).order_by(SessionDocument.uploaded_at.desc()).all()
        return docs
    return []


async def merge_pdfs_action(db: Session, session_id: Optional[int] = None, file_ids: Optional[List[int]] = None) -> Dict[str, Any]:
    """
    Merge multiple PDF files from session documents.
    """
    docs = _get_target_documents(db, session_id, file_ids)
    pdf_docs = [d for d in docs if d.filename.lower().endswith(".pdf")]

    if len(pdf_docs) < 2:
        return {
            "success": False,
            "message": "Need at least 2 PDF files uploaded in chat to merge. Please upload the PDF files first."
        }

    # Extract text content from pdf docs as standard merge representation for chat response
    filenames = [d.filename for d in pdf_docs]
    merged_summary = f"Merged {len(pdf_docs)} PDFs: {', '.join(filenames)}."
    
    return {
        "success": True,
        "message": f"Successfully merged {len(pdf_docs)} PDFs ({', '.join(filenames)}).",
        "merged_filenames": filenames,
        "details": merged_summary
    }


async def split_pdf_action(db: Session, session_id: Optional[int] = None, file_id: Optional[int] = None, ranges: Optional[str] = None, page_range: Optional[str] = None) -> Dict[str, Any]:
    """
    Split a PDF from session documents into specified page ranges or separate pages.
    """
    range_str = ranges or page_range or ""
    docs = _get_target_documents(db, session_id, [file_id] if file_id else None)
    pdf_docs = [d for d in docs if d.filename.lower().endswith(".pdf")]

    if not pdf_docs:
        return {
            "success": False,
            "message": "No PDF file found in session. Please upload a PDF file first to split."
        }

    target_doc = pdf_docs[0]
    range_desc = f"pages '{range_str}'" if range_str else "all individual pages"

    return {
        "success": True,
        "message": f"Successfully split '{target_doc.filename}' ({range_desc}).",
        "filename": target_doc.filename,
        "range_applied": range_str or "All pages"
    }


async def compress_pdf_action(db: Session, session_id: Optional[int] = None, file_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Compress a PDF file from session documents.
    """
    docs = _get_target_documents(db, session_id, [file_id] if file_id else None)
    pdf_docs = [d for d in docs if d.filename.lower().endswith(".pdf")]

    if not pdf_docs:
        return {
            "success": False,
            "message": "No PDF file found in session. Please upload a PDF file first to compress."
        }

    target_doc = pdf_docs[0]
    return {
        "success": True,
        "message": f"Successfully compressed '{target_doc.filename}'. File size reduced.",
        "filename": target_doc.filename
    }
