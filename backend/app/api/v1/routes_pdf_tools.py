import json
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
    convert_word_to_pdf,
    extract_text,
    validate_pdf_bytes,
    validate_docx_bytes,
    rotate_pdf_pages,
    add_watermark,
    add_pdf_password,
    remove_pdf_password,
    reorder_pdf_pages,
    delete_pdf_pages,
    images_to_pdf,
    validate_image_bytes,
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
        raise HTTPException(status_code=500, detail="Failed to merge PDFs. Please check the uploaded files and try again.")


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
        raise HTTPException(status_code=500, detail="Failed to split PDF. Please check the file and page range.")


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
        raise HTTPException(status_code=500, detail="Failed to compress PDF.")


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
        raise HTTPException(status_code=500, detail="Failed to convert PDF to Word.")


@router.post("/word-to-pdf")
async def api_word_to_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Convert Word (.docx) document to PDF format."""
    try:
        content = await file.read()
        validate_docx_bytes(content, max_size_mb=MAX_FILE_SIZE_MB)

        pdf_bytes = convert_word_to_pdf(content)
        filename = (file.filename or "document").rsplit(".", 1)[0] + ".pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error converting Word to PDF")
        raise HTTPException(status_code=500, detail="Failed to convert Word document to PDF.")


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
        raise HTTPException(status_code=500, detail="Failed to extract text from PDF.")


# ---------------------------------------------------------------------------
# New Tool 1: Rotate Pages
# ---------------------------------------------------------------------------

@router.post("/rotate")
async def api_rotate_pdf(
    file: UploadFile = File(...),
    angle: int = Form(...),
    page_range: Optional[str] = Form(default=""),
    current_user: User = Depends(get_current_user)
):
    """Rotate all pages or a specified page range of a PDF by 90/180/270 degrees."""
    try:
        content = await file.read()
        validate_pdf_bytes(content, max_size_mb=MAX_FILE_SIZE_MB)

        result = rotate_pdf_pages(content, angle=angle, page_range=page_range or None)
        filename = (file.filename or "document").rsplit(".", 1)[0] + "_rotated.pdf"
        return Response(
            content=result,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error rotating PDF pages")
        raise HTTPException(status_code=500, detail="Failed to rotate PDF pages.")


# ---------------------------------------------------------------------------
# New Tool 2: Add Watermark
# ---------------------------------------------------------------------------

@router.post("/watermark")
async def api_add_watermark(
    file: UploadFile = File(...),
    watermark_text: str = Form(...),
    opacity: float = Form(default=0.3),
    position: str = Form(default="diagonal"),
    current_user: User = Depends(get_current_user)
):
    """Overlay a text watermark on every page of a PDF."""
    try:
        content = await file.read()
        validate_pdf_bytes(content, max_size_mb=MAX_FILE_SIZE_MB)

        result = add_watermark(content, watermark_text=watermark_text, opacity=opacity, position=position)
        filename = (file.filename or "document").rsplit(".", 1)[0] + "_watermarked.pdf"
        return Response(
            content=result,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error adding watermark to PDF")
        raise HTTPException(status_code=500, detail="Failed to add watermark to PDF.")


# ---------------------------------------------------------------------------
# New Tool 3: Add / Remove Password
# ---------------------------------------------------------------------------

@router.post("/add-password")
async def api_add_password(
    file: UploadFile = File(...),
    password: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Encrypt a PDF with a user password (AES-256)."""
    try:
        content = await file.read()
        validate_pdf_bytes(content, max_size_mb=MAX_FILE_SIZE_MB)

        result = add_pdf_password(content, password=password)
        filename = (file.filename or "document").rsplit(".", 1)[0] + "_protected.pdf"
        return Response(
            content=result,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error adding password to PDF")
        raise HTTPException(status_code=500, detail="Failed to add password to PDF.")


@router.post("/remove-password")
async def api_remove_password(
    file: UploadFile = File(...),
    password: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Remove password protection from a PDF. Returns a clear 400 error if the password is wrong."""
    try:
        content = await file.read()
        validate_pdf_bytes(content, max_size_mb=MAX_FILE_SIZE_MB)

        result = remove_pdf_password(content, current_password=password)
        filename = (file.filename or "document").rsplit(".", 1)[0] + "_unlocked.pdf"
        return Response(
            content=result,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ValueError as ve:
        # Includes wrong-password errors — always 400, never 500
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error removing password from PDF")
        raise HTTPException(status_code=500, detail="Failed to unlock PDF.")


# ---------------------------------------------------------------------------
# New Tool 4: Organize Pages (Reorder / Delete)
# ---------------------------------------------------------------------------

@router.post("/organize")
async def api_organize_pdf(
    file: UploadFile = File(...),
    operation: str = Form(...),          # "reorder" | "delete"
    page_data: str = Form(...),          # JSON array: [3,1,2] for reorder or [2,4] for delete
    current_user: User = Depends(get_current_user)
):
    """Reorder or delete pages from a PDF. page_data is a JSON array of 1-indexed page numbers."""
    try:
        content = await file.read()
        validate_pdf_bytes(content, max_size_mb=MAX_FILE_SIZE_MB)

        try:
            pages = json.loads(page_data)
            if not isinstance(pages, list) or not all(isinstance(p, int) for p in pages):
                raise ValueError("page_data must be a JSON array of integers.")
        except (json.JSONDecodeError, TypeError):
            raise ValueError("page_data must be a valid JSON array of integers, e.g. [3,1,2].")

        if operation == "reorder":
            result = reorder_pdf_pages(content, page_order=pages)
            suffix = "_reordered.pdf"
        elif operation == "delete":
            result = delete_pdf_pages(content, pages_to_delete=pages)
            suffix = "_pages_deleted.pdf"
        else:
            raise ValueError("operation must be 'reorder' or 'delete'.")

        filename = (file.filename or "document").rsplit(".", 1)[0] + suffix
        return Response(
            content=result,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error organizing PDF pages")
        raise HTTPException(status_code=500, detail="Failed to organize PDF pages.")


# ---------------------------------------------------------------------------
# New Tool 5: Image to PDF
# ---------------------------------------------------------------------------

@router.post("/image-to-pdf")
async def api_image_to_pdf(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    """Convert one or more JPEG/PNG images into a single PDF (one image per page)."""
    if not files:
        raise HTTPException(status_code=400, detail="Please upload at least one image file.")

    try:
        image_list = []
        for file in files:
            content = await file.read()
            fname = file.filename or "image"
            validate_image_bytes(content, fname, max_size_mb=MAX_FILE_SIZE_MB)
            image_list.append((fname, content))

        result = images_to_pdf(image_list)
        return Response(
            content=result,
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="images_combined.pdf"'}
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception("Error converting images to PDF")
        raise HTTPException(status_code=500, detail="Failed to convert images to PDF.")
