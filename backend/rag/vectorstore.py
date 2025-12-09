"""
FAISS Vector Store for RAG
Manages embeddings and similarity search
"""
import logging
import pickle
from pathlib import Path
from typing import List, Dict, Optional
import numpy as np
import faiss
from openai import OpenAI

logger = logging.getLogger(__name__)


class FAISSVectorStore:
    """FAISS-based vector store with OpenAI embeddings"""
    
    def __init__(self, embedding_model: str = "text-embedding-3-small"):
        """
        Initialize vector store
        
        Args:
            embedding_model: OpenAI embedding model name
        """
        self.client = OpenAI()
        self.embedding_model = embedding_model
        self.dimension = 1536  # text-embedding-3-small dimension
        self.index: Optional[faiss.Index] = None
        self.chunks: List[Dict] = []
    
    def _embed(self, text: str) -> np.ndarray:
        """
        Generate embedding using OpenAI API
        
        Args:
            text: Text to embed
        
        Returns:
            Embedding vector as numpy array
        """
        try:
            response = self.client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            embedding = np.array(response.data[0].embedding, dtype=np.float32)
            return embedding
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            # Return zero vector on error
            return np.zeros(self.dimension, dtype=np.float32)
    
    def build_index(self, chunks: List[Dict], show_progress: bool = True):
        """
        Build FAISS index from document chunks
        
        Args:
            chunks: List of chunk dictionaries with 'text' key
            show_progress: Show progress during embedding generation
        """
        self.chunks = chunks
        logger.info(f"🔨 Building FAISS index for {len(chunks)} chunks...")
        
        # Generate embeddings
        embeddings = []
        for i, chunk in enumerate(chunks):
            if show_progress and (i + 1) % 100 == 0:
                logger.info(f"  Generated embeddings: {i + 1}/{len(chunks)}")
            
            emb = self._embed(chunk['text'])
            embeddings.append(emb)
        
        # Create FAISS index (L2 distance)
        embeddings_matrix = np.vstack(embeddings)
        self.index = faiss.IndexFlatL2(self.dimension)
        self.index.add(embeddings_matrix)
        
        logger.info(f"✅ FAISS index built with {self.index.ntotal} vectors")
    
    def search(self, query: str, top_k: int = 3) -> List[Dict]:
        """
        Search for most relevant chunks
        
        Args:
            query: Search query
            top_k: Number of top results to return
        
        Returns:
            List of relevant chunks with similarity scores
        """
        if self.index is None or len(self.chunks) == 0:
            logger.warning("Vector store not initialized")
            return []
        
        # Generate query embedding
        query_emb = self._embed(query).reshape(1, -1)
        
        # Search FAISS
        distances, indices = self.index.search(query_emb, min(top_k, len(self.chunks)))
        
        # Build results
        results = []
        for distance, idx in zip(distances[0], indices[0]):
            if idx < len(self.chunks):  # Valid index
                chunk = self.chunks[idx].copy()
                chunk['distance'] = float(distance)
                chunk['similarity'] = 1.0 / (1.0 + distance)  # Convert distance to similarity
                results.append(chunk)
        
        return results
    
    def save(self, path: Path):
        """
        Save index and chunks to disk
        
        Args:
            path: Directory path to save files
        """
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)
        
        # Save FAISS index
        faiss.write_index(self.index, str(path / "faiss.index"))
        
        # Save chunks metadata
        with open(path / "chunks.pkl", 'wb') as f:
            pickle.dump(self.chunks, f)
        
        # Save config
        config = {
            'embedding_model': self.embedding_model,
            'dimension': self.dimension,
            'num_chunks': len(self.chunks)
        }
        with open(path / "config.pkl", 'wb') as f:
            pickle.dump(config, f)
        
        logger.info(f"✅ Vector store saved to {path}")
    
    def load(self, path: Path):
        """
        Load index and chunks from disk
        
        Args:
            path: Directory path containing saved files
        """
        path = Path(path)
        
        # Load FAISS index
        self.index = faiss.read_index(str(path / "faiss.index"))
        
        # Load chunks
        with open(path / "chunks.pkl", 'rb') as f:
            self.chunks = pickle.load(f)
        
        # Load config
        with open(path / "config.pkl", 'rb') as f:
            config = pickle.load(f)
            self.embedding_model = config['embedding_model']
            self.dimension = config['dimension']
        
        logger.info(f"✅ Vector store loaded: {len(self.chunks)} chunks")
