from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Response
from fastapi.responses import JSONResponse

from app.db.models.user import User
from app.core.deps import get_current_user
from app.services.pdf_tools import (
    merge_pdfs,
    split_pdf,
    compress_pdf,
    pdf_to_word,
    extract_text,
    validate_pdf_bytes
)
from app.core.logging import logger

router = APIRouter()
MAX_FILE_SIZE_MB = 20


@router.post("/merge")
async def api_merge_pdfs(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    """Merge multiple PDF files into one."""
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="Please upload at least 2 PDF files to merge.")

    try:
        pdf_bytes_list = []
        for file in files:
            content = await file.read()
            validate_pdf_bytes(content, max_size_mb=MAX_FILE_SIZE_MB)
            pdf_bytes_list.append(content)

        merged_bytes = merge_pdfs(pdf_bytes_list)
        return Response(
            content=merged_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="merged_lifeos.pdf"'}
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error merging PDFs")
        raise HTTPException(status_code=500, detail=f"Failed to merge PDFs: {str(e)}")


@router.post("/split")
async def api_split_pdf(
    file: UploadFile = File(...),
    page_range: Optional[str] = Form(default=""),
    current_user: User = Depends(get_current_user)
):
    """Split PDF into selected pages or zip of individual pages."""
    try:
        content = await file.read()
        validate_pdf_bytes(content, max_size_mb=MAX_FILE_SIZE_MB)

        result_bytes = split_pdf(content, page_range=page_range)
        
        if page_range and page_range.strip():
            filename = "split_pages.pdf"
            media_type = "application/pdf"
        else:
            filename = "split_pages.zip"
            media_type = "application/zip"

        return Response(
            content=result_bytes,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error splitting PDF")
        raise HTTPException(status_code=500, detail=f"Failed to split PDF: {str(e)}")


@router.post("/compress")
async def api_compress_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Compress PDF file size."""
    try:
        content = await file.read()
        validate_pdf_bytes(content, max_size_mb=MAX_FILE_SIZE_MB)

        compressed_bytes = compress_pdf(content)
        return Response(
            content=compressed_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="compressed_lifeos.pdf"'}
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error compressing PDF")
        raise HTTPException(status_code=500, detail=f"Failed to compress PDF: {str(e)}")


@router.post("/to-word")
async def api_pdf_to_word(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Convert PDF to Word (.docx) format."""
    try:
        content = await file.read()
        validate_pdf_bytes(content, max_size_mb=MAX_FILE_SIZE_MB)

        docx_bytes = pdf_to_word(content)
        filename = (file.filename or "document").rsplit(".", 1)[0] + ".docx"
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error converting PDF to Word")
        raise HTTPException(status_code=500, detail=f"Failed to convert PDF to Word: {str(e)}")


@router.post("/extract-text")
async def api_extract_text(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Extract text page by page from PDF."""
    try:
        content = await file.read()
        validate_pdf_bytes(content, max_size_mb=MAX_FILE_SIZE_MB)

        extracted_data = extract_text(content)
        return JSONResponse(content=extracted_data)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error extracting text from PDF")
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")

