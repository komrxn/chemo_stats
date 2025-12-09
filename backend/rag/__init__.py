"""
RAG (Retrieval Augmented Generation) Module
Provides vector database functionality for AI assistant
"""
from .document_processor import process_documents
from .vectorstore import FAISSVectorStore

__all__ = ['process_documents', 'FAISSVectorStore']
