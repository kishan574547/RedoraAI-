from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from app.db.models.memory import Memory
from app.core.logging import logger
import numpy as np


class VectorSearchService:
    def __init__(self):
        pass

    async def store_memory(
        self,
        db: Session,
        user_id: int,
        content: str,
        embedding: List[float]
    ) -> Memory:
        """
        Store a memory with its embedding in the database.
        
        Args:
            db: Database session
            user_id: ID of the user
            content: Text content of the memory
            embedding: 384-dimensional embedding vector
            
        Returns:
            The created Memory object
        """
        # Convert embedding to integer array for storage (multiply by 1000 for precision)
        embedding_int = [int(x * 1000) for x in embedding]
        
        memory = Memory(
            user_id=user_id,
            content=content,
            embedding=embedding_int
        )
        
        db.add(memory)
        db.commit()
        db.refresh(memory)
        
        logger.info(f"Stored memory {memory.id} for user {user_id}")
        return memory

    async def search_memories(
        self,
        db: Session,
        user_id: int,
        query_embedding: List[float],
        limit: int = 10,
        min_similarity: float = 0.5
    ) -> List[Memory]:
        """
        Search for similar memories using cosine similarity.
        
        Args:
            db: Database session
            user_id: ID of the user
            query_embedding: 384-dimensional query embedding
            limit: Maximum number of results to return
            min_similarity: Minimum similarity threshold (0-1)
            
        Returns:
            List of Memory objects sorted by similarity
        """
        # Convert query embedding to integer array (multiply by 1000 for precision)
        query_embedding_int = [int(x * 1000) for x in query_embedding]
        
        # Calculate cosine similarity using SQL
        # For arrays a and b: cosine_similarity = dot(a,b) / (||a|| * ||b||)
        # We'll use pgvector's cosine distance if available, or calculate manually
        
        try:
            # Try using pgvector's cosine distance if the extension is available
            similarity_query = text("""
                SELECT 
                    id, user_id, content, created_at,
                    1 - (embedding <=> :query_embedding::vector) as similarity
                FROM memories
                WHERE user_id = :user_id
                ORDER BY embedding <=> :query_embedding::vector
                LIMIT :limit
            """)
            
            result = db.execute(
                similarity_query,
                {
                    "query_embedding": str(query_embedding_int),
                    "user_id": user_id,
                    "limit": limit
                }
            )
            
        except Exception as e:
            # Fallback to manual cosine similarity calculation if pgvector not available
            logger.warning(f"pgvector not available, using manual calculation: {str(e)}")
            
            # Manual cosine similarity using array operations
            similarity_query = text("""
                SELECT 
                    id, user_id, content, created_at,
                    (
                        dot_product / 
                        (sqrt(array_length(embedding, 1)) * sqrt(:query_magnitude))
                    ) as similarity
                FROM (
                    SELECT 
                        id, user_id, content, created_at, embedding,
                        (
                            SELECT SUM(embedding[i] * :query_embedding[i-1])
                            FROM generate_series(1, array_length(embedding, 1)) i
                        ) as dot_product
                    FROM memories
                    WHERE user_id = :user_id
                ) sub
                WHERE dot_product / (sqrt(array_length(embedding, 1)) * sqrt(:query_magnitude)) >= :min_similarity
                ORDER BY similarity DESC
                LIMIT :limit
            """)
            
            # Calculate query magnitude
            query_magnitude = float(np.linalg.norm(query_embedding_int))
            
            result = db.execute(
                similarity_query,
                {
                    "query_embedding": query_embedding_int,
                    "user_id": user_id,
                    "limit": limit,
                    "min_similarity": min_similarity,
                    "query_magnitude": query_magnitude
                }
            )
        
        rows = result.fetchall()
        
        # Convert to Memory objects
        memories = []
        for row in rows:
            memory = db.query(Memory).filter(Memory.id == row[0]).first()
            if memory:
                memories.append(memory)
        
        logger.info(f"Found {len(memories)} similar memories for user {user_id}")
        return memories

    def chunk_text(self, text: str, chunk_size: int = 600, overlap: int = 100) -> List[str]:
        """Split text into overlapping chunks."""
        if not text:
            return []
        text = text.strip()
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            if chunk.strip():
                chunks.append(chunk.strip())
            start += chunk_size - overlap
        return chunks

    async def search_session_documents(
        self,
        db: Session,
        session_id: int,
        query: str,
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Search for most relevant chunks in attached documents for a session using vector similarity.
        """
        from app.db.models.session_document import SessionDocument
        from app.services.embeddings import EmbeddingsService
        
        docs = db.query(SessionDocument).filter(SessionDocument.session_id == session_id).all()
        if not docs:
            return []
        
        embeddings_service = EmbeddingsService()
        query_vec = await embeddings_service.generate_embedding(query)
        q_norm = np.linalg.norm(query_vec)
        if q_norm == 0:
            q_norm = 1.0

        all_scored_chunks = []

        for doc in docs:
            if not doc.embedding:
                # If single chunk / unchunked text
                if doc.extracted_text:
                    all_scored_chunks.append({
                        "filename": doc.filename,
                        "text": doc.extracted_text[:1000],
                        "score": 1.0
                    })
                continue

            chunks_data = doc.embedding if isinstance(doc.embedding, list) else []
            for item in chunks_data:
                chunk_text = item.get("text", "")
                vec = item.get("vector", [])
                if not vec or not chunk_text:
                    continue

                v_norm = np.linalg.norm(vec)
                if v_norm == 0:
                    v_norm = 1.0

                sim = float(np.dot(query_vec, vec) / (q_norm * v_norm))
                all_scored_chunks.append({
                    "filename": doc.filename,
                    "text": chunk_text,
                    "score": sim
                })

        # Sort by similarity descending
        all_scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        top_chunks = all_scored_chunks[:top_k]
        return top_chunks


vector_search_service = VectorSearchService()
