import hashlib
import numpy as np
from typing import List
from app.core.logging import logger


class EmbeddingsService:
    def __init__(self):
        self.embedding_dim = 384
        self._model = None

    def _hash_vectorize(self, text: str) -> List[float]:
        """
        Lightweight, 0-RAM memory-safe 384-dimensional text embedding
        using token feature hashing + L2 normalization.
        """
        vec = np.zeros(self.embedding_dim, dtype=np.float32)
        words = text.lower().split()
        if not words:
            return vec.tolist()
        
        for i, word in enumerate(words):
            h1 = int(hashlib.md5(word.encode('utf-8')).hexdigest(), 16) % self.embedding_dim
            vec[h1] += 1.0
            
            if i < len(words) - 1:
                bigram = f"{word}_{words[i+1]}"
                h2 = int(hashlib.sha256(bigram.encode('utf-8')).hexdigest(), 16) % self.embedding_dim
                vec[h2] += 0.5

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
            
        return vec.tolist()

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate a 384-dimensional embedding for the given text.
        """
        if self._model is not None:
            try:
                embedding = self._model.encode(text, convert_to_numpy=True)
                return embedding.tolist()
            except Exception as e:
                logger.warning(f"SentenceTransformer encoding failed, using hash fallback: {str(e)}")

        try:
            from sentence_transformers import SentenceTransformer
            if self._model is None:
                self._model = SentenceTransformer('all-MiniLM-L6-v2')
            embedding = self._model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
        except Exception:
            return self._hash_vectorize(text)
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts at once.
        """
        return [await self.generate_embedding(t) for t in texts]

