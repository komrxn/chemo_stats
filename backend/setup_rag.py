#!/usr/bin/env python3
"""
Setup RAG Vector Database
Processes reference materials and builds FAISS index

Usage:
    python setup_rag.py
"""
import logging
from pathlib import Path
import sys
from dotenv import load_dotenv

# Load environment variables from project root .env
PROJECT_ROOT = Path(__file__).parents[1]
load_dotenv(PROJECT_ROOT / ".env")

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from rag.document_processor import process_documents
from rag.vectorstore import FAISSVectorStore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Paths
BACKEND_DIR = Path(__file__).parent
MATERIALS_DIR = BACKEND_DIR.parent.parent / "uploaded files 2"  # Dad's/uploaded files 2
RAG_DB_PATH = BACKEND_DIR / "rag_db" / "faiss_index"


def main():
    """Main indexation workflow"""
    logger.info("=" * 70)
    logger.info("🚀 RAG Setup: Building Vector Database")
    logger.info("=" * 70)
    
    # Check materials directory
    if not MATERIALS_DIR.exists():
        logger.error(f"❌ Materials directory not found: {MATERIALS_DIR}")
        logger.error("   Please ensure 'uploaded files 2/' exists")
        return False  
    
    logger.info(f"📂 Materials directory: {MATERIALS_DIR}")
    logger.info(f"💾 Output path: {RAG_DB_PATH}")
    logger.info("")
    
    try:
        # Step 1: Process documents
        logger.info("Step 1/3: Processing documents...")
        chunks = process_documents(MATERIALS_DIR)
        
        if not chunks:
            logger.error("❌ No chunks extracted! Check if PDFs/DOCX are readable.")
            return False
        
        logger.info(f"✅ Extracted {len(chunks)} text chunks")
        logger.info("")
        
        # Step 2: Build vector index
        logger.info("Step 2/3: Building FAISS index...")
        logger.info("⚠️  This will make OpenAI API calls for embeddings (~$0.025 cost)")
        
        vectorstore = FAISSVectorStore()
        vectorstore.build_index(chunks, show_progress=True)
        logger.info("")
        
        # Step 3: Save to disk
        logger.info("Step 3/3: Saving vector database...")
        vectorstore.save(RAG_DB_PATH)
        logger.info("")
        
        # Summary
        logger.info("=" * 70)
        logger.info("🎉 RAG Setup Complete!")
        logger.info(f"   - Chunks indexed: {len(chunks)}")
        logger.info(f"   - Vector dimension: {vectorstore.dimension}")
        logger.info(f"   - Saved to: {RAG_DB_PATH}")
        logger.info("=" * 70)
        logger.info("")
        logger.info("✅ AI Assistant is now ready with enhanced ANOVA knowledge!")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Setup failed: {e}", exc_info=True)
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
