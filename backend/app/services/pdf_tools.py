import io
import os
import html
import shutil
import subprocess
import tempfile
import zipfile
from typing import List, Dict, Any, Optional
import pypdf
import pikepdf
import docx
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY


def validate_pdf_bytes(file_bytes: bytes, max_size_mb: int = 20) -> None:
    """Validates PDF file size and PDF magic bytes within header."""
    if not file_bytes:
        raise ValueError("File is empty.")
    if len(file_bytes) > max_size_mb * 1024 * 1024:
        raise ValueError(f"File size exceeds maximum limit of {max_size_mb}MB.")
    if b"%PDF" not in file_bytes[:1024]:
        raise ValueError("Invalid file format. The file is not a valid PDF document.")


def validate_docx_bytes(file_bytes: bytes, max_size_mb: int = 20) -> None:
    """Validates Word (.docx) file size and header magic bytes."""
    if not file_bytes:
        raise ValueError("File is empty.")
    if len(file_bytes) > max_size_mb * 1024 * 1024:
        raise ValueError(f"File size exceeds maximum limit of {max_size_mb}MB.")
    if not (file_bytes.startswith(b"PK\x03\x04") or zipfile.is_zipfile(io.BytesIO(file_bytes))):
        raise ValueError("Invalid file format. The file is not a valid Word (.docx) document.")



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


def convert_word_to_pdf(docx_bytes: bytes) -> bytes:
    """
    Converts Word (.docx) byte stream into PDF byte stream.

    Strategy:
    1. Attempts LibreOffice headless conversion CLI (`libreoffice --headless --convert-to pdf`)
       if LibreOffice is installed on the host system.
    2. Falls back to pure-Python conversion using `python-docx` + `reportlab` to reconstruct
       headings, paragraphs, text formatting (bold, italic, underline), lists, and tables.

    System Dependency Note:
    - For highest fidelity rendering (complex layouts, custom fonts), LibreOffice should be installed
      on the host server (e.g. `apt-get install -y libreoffice` on Linux).
    """
    validate_docx_bytes(docx_bytes)

    # 1. Try LibreOffice headless CLI if available
    soffice_path = shutil.which("libreoffice") or shutil.which("soffice")
    if not soffice_path and os.name == "nt":
        win_paths = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe"
        ]
        for p in win_paths:
            if os.path.exists(p):
                soffice_path = p
                break

    if soffice_path:
        with tempfile.TemporaryDirectory() as tmp_dir:
            in_file = os.path.join(tmp_dir, "input.docx")
            with open(in_file, "wb") as f:
                f.write(docx_bytes)
            try:
                subprocess.run(
                    [soffice_path, "--headless", "--convert-to", "pdf", "--outdir", tmp_dir, in_file],
                    check=True,
                    timeout=60,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                out_file = os.path.join(tmp_dir, "input.pdf")
                if os.path.exists(out_file):
                    with open(out_file, "rb") as f:
                        return f.read()
            except Exception:
                pass  # Fallback to python-docx + reportlab

    # 2. Pure Python fallback using python-docx + reportlab
    try:
        doc = Document(io.BytesIO(docx_bytes))
    except Exception as err:
        raise ValueError(f"Unable to parse Word (.docx) document: {str(err)}")

    out_stream = io.BytesIO()
    pdf_doc = SimpleDocTemplate(
        out_stream,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    normal_style = styles["Normal"]

    align_map = {
        WD_ALIGN_PARAGRAPH.LEFT: TA_LEFT,
        WD_ALIGN_PARAGRAPH.CENTER: TA_CENTER,
        WD_ALIGN_PARAGRAPH.RIGHT: TA_RIGHT,
        WD_ALIGN_PARAGRAPH.JUSTIFY: TA_JUSTIFY,
    }

    story = []

    def get_formatted_text(paragraph) -> str:
        text_parts = []
        for run in paragraph.runs:
            t = html.escape(run.text)
            if not t:
                continue
            if run.bold:
                t = f"<b>{t}</b>"
            if run.italic:
                t = f"<i>{t}</i>"
            if run.underline:
                t = f"<u>{t}</u>"
            text_parts.append(t)
        return "".join(text_parts) if text_parts else html.escape(paragraph.text or "")

    for element in doc.element.body:
        if element.tag.endswith("p"):
            p = docx.text.paragraph.Paragraph(element, doc)
            formatted_text = get_formatted_text(p)
            if not formatted_text.strip():
                story.append(Spacer(1, 6))
                continue

            style_name = p.style.name.lower() if p.style and p.style.name else ""

            p_style = ParagraphStyle(
                name=f"CustomP_{len(story)}",
                parent=normal_style,
                alignment=align_map.get(p.alignment, TA_LEFT),
                fontSize=10,
                leading=13,
                spaceAfter=4
            )

            if "heading 1" in style_name:
                p_style.fontSize = 18
                p_style.leading = 22
                p_style.spaceBefore = 12
                p_style.spaceAfter = 6
                p_style.textColor = colors.HexColor("#1e293b")
            elif "heading 2" in style_name:
                p_style.fontSize = 14
                p_style.leading = 18
                p_style.spaceBefore = 10
                p_style.spaceAfter = 4
                p_style.textColor = colors.HexColor("#334155")
            elif "heading 3" in style_name:
                p_style.fontSize = 12
                p_style.leading = 15
                p_style.spaceBefore = 8
                p_style.spaceAfter = 4

            if "bullet" in style_name or p.text.strip().startswith("•"):
                if not formatted_text.startswith("•"):
                    formatted_text = f"&bull; {formatted_text}"

            story.append(Paragraph(formatted_text, p_style))

        elif element.tag.endswith("tbl"):
            table = docx.table.Table(element, doc)
            table_data = []
            for row in table.rows:
                row_data = []
                for cell in row.cells:
                    cell_text = cell.text.strip()
                    cell_p = Paragraph(html.escape(cell_text), ParagraphStyle(
                        name=f"TableCell_{len(story)}_{len(row_data)}",
                        parent=normal_style,
                        fontSize=9,
                        leading=11
                    ))
                    row_data.append(cell_p)
                if row_data:
                    table_data.append(row_data)

            if table_data:
                t = Table(table_data)
                t.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ]))
                story.append(t)
                story.append(Spacer(1, 10))


    if not story:
        story.append(Paragraph("Empty Document", normal_style))

    pdf_doc.build(story)
    return out_stream.getvalue()


# ---------------------------------------------------------------------------
# Tool 1: Rotate Pages
# ---------------------------------------------------------------------------

def _parse_page_set(page_range: str, total_pages: int) -> List[int]:
    """Parse a page range string like '1-3,5' into a 0-indexed list of page indices."""
    pages: List[int] = []
    for part in page_range.split(","):
        part = part.strip()
        if "-" in part:
            try:
                s, e = part.split("-", 1)
                start = max(1, int(s.strip()))
                end = min(total_pages, int(e.strip()))
                for p in range(start, end + 1):
                    if (p - 1) not in pages:
                        pages.append(p - 1)
            except ValueError:
                pass
        elif part.isdigit():
            p = int(part)
            if 1 <= p <= total_pages and (p - 1) not in pages:
                pages.append(p - 1)
    return pages


def rotate_pdf_pages(pdf_bytes: bytes, angle: int, page_range: Optional[str] = None) -> bytes:
    """
    Rotate all pages or a specific page range of a PDF by the given angle (90/180/270).
    angle must be a multiple of 90.
    """
    validate_pdf_bytes(pdf_bytes)
    if angle not in (90, 180, 270):
        raise ValueError("Rotation angle must be 90, 180, or 270 degrees.")

    reader = get_clean_pdf_reader(pdf_bytes)
    total_pages = len(reader.pages)
    writer = pypdf.PdfWriter()

    if page_range and page_range.strip():
        pages_to_rotate = set(_parse_page_set(page_range, total_pages))
    else:
        pages_to_rotate = set(range(total_pages))

    for i, page in enumerate(reader.pages):
        if i in pages_to_rotate:
            page.rotate(angle)
        writer.add_page(page)

    out = io.BytesIO()
    writer.write(out)
    writer.close()
    return out.getvalue()


# ---------------------------------------------------------------------------
# Tool 2: Add Watermark
# ---------------------------------------------------------------------------

def add_watermark(
    pdf_bytes: bytes,
    watermark_text: str,
    opacity: float = 0.3,
    position: str = "diagonal",
) -> bytes:
    """
    Overlay watermark text on every page of a PDF using reportlab + pypdf.
    position: 'diagonal' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    opacity: 0.0-1.0
    """
    from reportlab.pdfgen import canvas as rl_canvas

    validate_pdf_bytes(pdf_bytes)
    if not watermark_text or not watermark_text.strip():
        raise ValueError("Watermark text cannot be empty.")
    opacity = max(0.05, min(1.0, float(opacity)))

    reader = get_clean_pdf_reader(pdf_bytes)
    writer = pypdf.PdfWriter()

    for page in reader.pages:
        mb = page.mediabox
        page_w = float(mb.width)
        page_h = float(mb.height)

        wm_buf = io.BytesIO()
        c = rl_canvas.Canvas(wm_buf, pagesize=(page_w, page_h))
        c.setFillColorRGB(0.5, 0.5, 0.5, alpha=opacity)
        font_size = min(36, max(12, int(page_w / 12)))
        c.setFont("Helvetica-Bold", font_size)

        if position == "diagonal":
            c.saveState()
            c.translate(page_w / 2, page_h / 2)
            c.rotate(45)
            c.drawCentredString(0, 0, watermark_text)
            c.restoreState()
        elif position == "center":
            c.drawCentredString(page_w / 2, page_h / 2, watermark_text)
        elif position == "top-left":
            c.drawString(20, page_h - font_size - 10, watermark_text)
        elif position == "top-right":
            c.drawRightString(page_w - 20, page_h - font_size - 10, watermark_text)
        elif position == "bottom-left":
            c.drawString(20, 20, watermark_text)
        elif position == "bottom-right":
            c.drawRightString(page_w - 20, 20, watermark_text)
        else:
            c.drawCentredString(page_w / 2, page_h / 2, watermark_text)

        c.save()
        wm_buf.seek(0)

        wm_reader = pypdf.PdfReader(wm_buf)
        page.merge_page(wm_reader.pages[0])
        writer.add_page(page)

    out = io.BytesIO()
    writer.write(out)
    writer.close()
    return out.getvalue()


# ---------------------------------------------------------------------------
# Tool 3: Add / Remove Password
# ---------------------------------------------------------------------------

def add_pdf_password(pdf_bytes: bytes, password: str) -> bytes:
    """Encrypt a PDF with the given user password using AES-256 via pikepdf."""
    validate_pdf_bytes(pdf_bytes)
    if not password:
        raise ValueError("Password cannot be empty.")

    pdf = pikepdf.open(io.BytesIO(pdf_bytes))
    out = io.BytesIO()
    pdf.save(
        out,
        encryption=pikepdf.Encryption(owner=password, user=password, R=6)
    )
    pdf.close()
    return out.getvalue()


def remove_pdf_password(pdf_bytes: bytes, current_password: str) -> bytes:
    """
    Remove password protection from a PDF.
    Raises a clear ValueError if the password is wrong, not a generic 500.
    """
    validate_pdf_bytes(pdf_bytes)
    if not current_password:
        raise ValueError("Current password cannot be empty.")
    try:
        pdf = pikepdf.open(io.BytesIO(pdf_bytes), password=current_password)
    except pikepdf.PasswordError:
        raise ValueError("Incorrect password. Please enter the correct password for this PDF.")
    except Exception as err:
        raise ValueError(f"Unable to open PDF: {str(err)}")

    out = io.BytesIO()
    pdf.save(out)
    pdf.close()
    return out.getvalue()


# ---------------------------------------------------------------------------
# Tool 4: Reorder / Delete Pages
# ---------------------------------------------------------------------------

def reorder_pdf_pages(pdf_bytes: bytes, page_order: List[int]) -> bytes:
    """
    Reorder pages of a PDF.
    page_order is a 1-indexed list specifying the new order, e.g. [3, 1, 2].
    """
    validate_pdf_bytes(pdf_bytes)
    reader = get_clean_pdf_reader(pdf_bytes)
    total = len(reader.pages)

    if not page_order:
        raise ValueError("Page order list cannot be empty.")
    for p in page_order:
        if not (1 <= p <= total):
            raise ValueError(f"Page number {p} is out of range (document has {total} pages).")

    writer = pypdf.PdfWriter()
    for p in page_order:
        writer.add_page(reader.pages[p - 1])

    out = io.BytesIO()
    writer.write(out)
    writer.close()
    return out.getvalue()


def delete_pdf_pages(pdf_bytes: bytes, pages_to_delete: List[int]) -> bytes:
    """
    Delete specified pages from a PDF.
    pages_to_delete is 1-indexed.
    """
    validate_pdf_bytes(pdf_bytes)
    reader = get_clean_pdf_reader(pdf_bytes)
    total = len(reader.pages)

    if not pages_to_delete:
        raise ValueError("Pages-to-delete list cannot be empty.")

    delete_set = set()
    for p in pages_to_delete:
        if not (1 <= p <= total):
            raise ValueError(f"Page number {p} is out of range (document has {total} pages).")
        delete_set.add(p - 1)

    remaining = [i for i in range(total) if i not in delete_set]
    if not remaining:
        raise ValueError("Cannot delete all pages from a PDF.")

    writer = pypdf.PdfWriter()
    for i in remaining:
        writer.add_page(reader.pages[i])

    out = io.BytesIO()
    writer.write(out)
    writer.close()
    return out.getvalue()


# ---------------------------------------------------------------------------
# Tool 5: Images to PDF
# ---------------------------------------------------------------------------

def validate_image_bytes(file_bytes: bytes, filename: str, max_size_mb: int = 20) -> None:
    """Validates an image file by size and magic bytes (JPEG / PNG)."""
    if not file_bytes:
        raise ValueError(f"File '{filename}' is empty.")
    if len(file_bytes) > max_size_mb * 1024 * 1024:
        raise ValueError(f"File '{filename}' exceeds {max_size_mb}MB limit.")
    # JPEG: FF D8 FF   PNG: 89 50 4E 47
    if not (file_bytes[:3] == b"\xff\xd8\xff" or file_bytes[:4] == b"\x89PNG"):
        raise ValueError(f"File '{filename}' is not a valid JPEG or PNG image.")


def images_to_pdf(image_list: List[tuple]) -> bytes:
    """
    Convert one or more JPEG/PNG images into a single PDF (one image per page, A4, centered).
    image_list: list of (filename, bytes) tuples in desired order.
    """
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.utils import ImageReader

    if not image_list:
        raise ValueError("No images provided.")

    page_w, page_h = A4
    margin = 72  # 1 inch

    out = io.BytesIO()
    c_obj = rl_canvas.Canvas(out, pagesize=A4)

    for filename, img_bytes in image_list:
        validate_image_bytes(img_bytes, filename)
        img_reader = ImageReader(io.BytesIO(img_bytes))
        img_w, img_h = img_reader.getSize()

        avail_w = page_w - 2 * margin
        avail_h = page_h - 2 * margin
        scale = min(avail_w / img_w, avail_h / img_h)
        draw_w = img_w * scale
        draw_h = img_h * scale
        x = margin + (avail_w - draw_w) / 2
        y = margin + (avail_h - draw_h) / 2

        c_obj.drawImage(img_reader, x, y, width=draw_w, height=draw_h)
        c_obj.showPage()

    c_obj.save()
    return out.getvalue()
