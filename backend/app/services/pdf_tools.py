import io
import os
import tempfile
import zipfile
from typing import List, Dict, Any, Optional
import pypdf
import pikepdf


def validate_pdf_bytes(file_bytes: bytes, max_size_mb: int = 20) -> None:
    """Validates PDF file size and PDF magic bytes within header."""
    if not file_bytes:
        raise ValueError("File is empty.")
    if len(file_bytes) > max_size_mb * 1024 * 1024:
        raise ValueError(f"File size exceeds maximum limit of {max_size_mb}MB.")
    if b"%PDF" not in file_bytes[:1024]:
        raise ValueError("Invalid file format. The file is not a valid PDF document.")


def get_clean_pdf_reader(pdf_bytes: bytes) -> pypdf.PdfReader:
    """Returns a pypdf.PdfReader, repairing broken cross-reference streams with pikepdf if needed."""
    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        # Touch pages to test if encrypted/corrupt
        _ = len(reader.pages)
        return reader
    except Exception:
        try:
            pdf = pikepdf.open(io.BytesIO(pdf_bytes))
            buf = io.BytesIO()
            pdf.save(buf)
            pdf.close()
            buf.seek(0)
            return pypdf.PdfReader(buf)
        except Exception as err:
            raise ValueError(f"Unable to read or parse PDF: {str(err)}")


def merge_pdfs(pdf_list: List[bytes]) -> bytes:
    """Merges multiple PDF byte streams into a single PDF byte stream."""
    writer = pypdf.PdfWriter()
    for pdf_bytes in pdf_list:
        validate_pdf_bytes(pdf_bytes)
        reader = get_clean_pdf_reader(pdf_bytes)
        for page in reader.pages:
            writer.add_page(page)
    
    output_stream = io.BytesIO()
    writer.write(output_stream)
    writer.close()
    return output_stream.getvalue()


def split_pdf(pdf_bytes: bytes, page_range: Optional[str] = None) -> bytes:
    """
    Extracts specified pages from PDF.
    page_range format example: '1-3, 5' (1-indexed).
    If no range provided, extracts all pages as individual PDFs inside a ZIP archive.
    """
    validate_pdf_bytes(pdf_bytes)
    reader = get_clean_pdf_reader(pdf_bytes)
    total_pages = len(reader.pages)

    if page_range and page_range.strip():
        pages_to_keep = []
        parts = page_range.split(",")
        for part in parts:
            part = part.strip()
            if "-" in part:
                start_str, end_str = part.split("-", 1)
                try:
                    start = max(1, int(start_str.strip()))
                    end = min(total_pages, int(end_str.strip()))
                    for p in range(start, end + 1):
                        if (p - 1) not in pages_to_keep:
                            pages_to_keep.append(p - 1)
                except ValueError:
                    pass
            elif part.isdigit():
                p = int(part)
                if 1 <= p <= total_pages and (p - 1) not in pages_to_keep:
                    pages_to_keep.append(p - 1)

        if not pages_to_keep:
            pages_to_keep = list(range(total_pages))

        writer = pypdf.PdfWriter()
        for idx in pages_to_keep:
            writer.add_page(reader.pages[idx])

        output_stream = io.BytesIO()
        writer.write(output_stream)
        writer.close()
        return output_stream.getvalue()
    else:
        # Split all pages into separate PDFs in a ZIP archive
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for i, page in enumerate(reader.pages):
                writer = pypdf.PdfWriter()
                writer.add_page(page)
                page_buffer = io.BytesIO()
                writer.write(page_buffer)
                writer.close()
                zip_file.writestr(f"page_{i + 1}.pdf", page_buffer.getvalue())

        return zip_buffer.getvalue()


def compress_pdf(pdf_bytes: bytes) -> bytes:
    """Compresses PDF stream using pikepdf linearize & object compression."""
    validate_pdf_bytes(pdf_bytes)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as in_tmp:
        in_tmp.write(pdf_bytes)
        in_path = in_tmp.name

    out_path = in_path + "_compressed.pdf"
    try:
        pdf = pikepdf.open(in_path)
        pdf.save(out_path, compress_streams=True, linearize=True)
        pdf.close()

        with open(out_path, "rb") as f:
            compressed_data = f.read()
        return compressed_data
    except Exception:
        reader = get_clean_pdf_reader(pdf_bytes)
        writer = pypdf.PdfWriter()
        for page in reader.pages:
            page.compress_content_streams()
            writer.add_page(page)
        output_stream = io.BytesIO()
        writer.write(output_stream)
        writer.close()
        return output_stream.getvalue()
    finally:
        if os.path.exists(in_path):
            try:
                os.remove(in_path)
            except OSError:
                pass
        if os.path.exists(out_path):
            try:
                os.remove(out_path)
            except OSError:
                pass


def pdf_to_word(pdf_bytes: bytes) -> bytes:
    """Converts PDF bytes into Word (.docx) byte stream using pdf2docx."""
    from pdf2docx import Converter
    validate_pdf_bytes(pdf_bytes)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as in_tmp:
        in_tmp.write(pdf_bytes)
        in_path = in_tmp.name

    docx_path = in_path + ".docx"
    try:
        cv = Converter(in_path)
        cv.convert(docx_path, start=0, end=None)
        cv.close()

        with open(docx_path, "rb") as f:
            docx_data = f.read()
        return docx_data
    finally:
        if os.path.exists(in_path):
            try:
                os.remove(in_path)
            except OSError:
                pass
        if os.path.exists(docx_path):
            try:
                os.remove(docx_path)
            except OSError:
                pass


def extract_text(pdf_bytes: bytes) -> Dict[str, Any]:
    """Extracts text page by page from PDF stream."""
    validate_pdf_bytes(pdf_bytes)
    reader = get_clean_pdf_reader(pdf_bytes)
    pages_text = []
    full_text = []

    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages_text.append({"page": i + 1, "text": text})
        full_text.append(text)

    return {
        "total_pages": len(reader.pages),
        "full_text": "\n\n".join(full_text),
        "pages": pages_text
    }


