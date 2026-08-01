from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np


class EmbeddingsService:
    def __init__(self):
        # Initialize the all-MiniLM-L6-v2 model (384 dimensions, runs locally)
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.embedding_dim = 384

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate a 384-dimensional embedding for the given text.
        
        Args:
            text: The text to embed
            
        Returns:
            List of 384 float values representing the embedding
        """
        # Generate embedding
        embedding = self.model.encode(text, convert_to_numpy=True)
        
        # Convert to list of floats
        embedding_list = embedding.tolist()
        
        return embedding_list
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts at once.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding lists (each 384 dimensions)
        """
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        
        # Convert to list of lists
        embeddings_list = embeddings.tolist()
        
        return embeddings_list
