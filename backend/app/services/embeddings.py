from typing import List
import numpy as np
import logging

logger = logging.getLogger(__name__)


class EmbeddingsService:
    _instance = None
    _model = None

    def __init__(self):
        self.embedding_dim = 384

    def _get_model(self):
        if EmbeddingsService._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                logger.info("Loading SentenceTransformer all-MiniLM-L6-v2 model...")
                EmbeddingsService._model = SentenceTransformer('all-MiniLM-L6-v2')
            except Exception as e:
                logger.warning(f"Could not load SentenceTransformer due to memory limits: {e}. Using fallback generator.")
                EmbeddingsService._model = "FALLBACK"
        return EmbeddingsService._model

    def _fallback_embedding(self, text: str) -> List[float]:
        """Generate a deterministic 384-dimensional fallback embedding vector without heavy ML memory footprint."""
        import hashlib
        hash_seed = hashlib.sha256(text.encode('utf-8')).digest()
        rng = np.random.RandomState(int.from_bytes(hash_seed[:4], 'big'))
        vector = rng.randn(384)
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        return vector.tolist()

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate a 384-dimensional embedding for the given text.
        """
        model = self._get_model()
        if model == "FALLBACK" or model is None:
            return self._fallback_embedding(text)

        try:
            embedding = model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
        except Exception as e:
            logger.warning(f"Embedding encoding error: {e}. Using fallback embedding.")
            return self._fallback_embedding(text)

    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts at once.
        """
        model = self._get_model()
        if model == "FALLBACK" or model is None:
            return [self._fallback_embedding(t) for t in texts]

        try:
            embeddings = model.encode(texts, convert_to_numpy=True)
            return embeddings.tolist()
        except Exception as e:
            logger.warning(f"Batch embedding encoding error: {e}. Using fallback embeddings.")
            return [self._fallback_embedding(t) for t in texts]
