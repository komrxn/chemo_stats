"""
Document Processor for RAG
Extracts and chunks text from PDF and DOCX files
"""
import logging
from pathlib import Path
from typing import List, Dict
import PyPDF2
from docx import Document
import tiktoken

logger = logging.getLogger(__name__)


def extract_pdf(pdf_path: Path) -> str:
    """Extract text from PDF file"""
    try:
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for page_num, page in enumerate(reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                except Exception as e:
                    logger.warning(f"Failed to extract page {page_num} from {pdf_path.name}: {e}")
            return text
    except Exception as e:
        logger.error(f"Failed to extract PDF {pdf_path.name}: {e}")
        return ""


def extract_docx(docx_path: Path) -> str:
    """Extract text from DOCX file"""
    try:
        doc = Document(docx_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)
    except Exception as e:
        logger.error(f"Failed to extract DOCX {docx_path.name}: {e}")
        return ""


def chunk_text(text: str, source: str, chunk_size: int = 500, overlap: int = 50) -> List[Dict]:
    """
    Split text into chunks of approximately chunk_size tokens with overlap
    
    Args:
        text: Text to chunk
        source: Source filename
        chunk_size: Target chunk size in tokens
        overlap: Overlap between chunks in tokens
    
    Returns:
        List of chunk dictionaries with 'text', 'source', and 'tokens' keys
    """
    try:
        encoding = tiktoken.encoding_for_model("gpt-4")
    except Exception:
        # Fallback to cl100k_base if model encoding fails
        encoding = tiktoken.get_encoding("cl100k_base")
    
    tokens = encoding.encode(text)
    chunks = []
    
    for i in range(0, len(tokens), chunk_size - overlap):
        chunk_tokens = tokens[i:i + chunk_size]
        chunk_text = encoding.decode(chunk_tokens)
        
        # Skip very short chunks (< 50 tokens)
        if len(chunk_tokens) < 50:
            continue
        
        chunks.append({
            'text': chunk_text,
            'source': source,
            'tokens': len(chunk_tokens),
            'start_token': i
        })
    
    return chunks


def process_documents(materials_dir: Path) -> List[Dict]:
    """
    Process all PDFs and DOCX files in directory
    
    Args:
        materials_dir: Path to directory containing reference materials
    
    Returns:
        List of all text chunks with metadata
    """
    materials_dir = Path(materials_dir)
    all_chunks = []
    
    logger.info(f"📚 Processing documents from {materials_dir}")
    
    # Process PDFs
    pdf_files = list(materials_dir.glob("*.pdf"))
    for pdf in pdf_files:
        logger.info(f"  📄 Processing {pdf.name}...")
        text = extract_pdf(pdf)
        
        if text:
            chunks = chunk_text(text, source=pdf.name)
            all_chunks.extend(chunks)
            logger.info(f"    ✅ Extracted {len(chunks)} chunks")
        else:
            logger.warning(f"    ⚠️ No text extracted from {pdf.name}")
    
    # Process DOCX files
    docx_files = list(materials_dir.glob("*.docx"))
    for docx in docx_files:
        logger.info(f"  📄 Processing {docx.name}...")
        text = extract_docx(docx)
        
        if text:
            chunks = chunk_text(text, source=docx.name)
            all_chunks.extend(chunks)
            logger.info(f"    ✅ Extracted {len(chunks)} chunks")
        else:
            logger.warning(f"    ⚠️ No text extracted from {docx.name}")
    
    logger.info(f"✅ Total chunks extracted: {len(all_chunks)}")
    
    return all_chunks
