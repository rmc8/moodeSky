"""
atproto-rag: AT Protocol repository vectorization for RAG with Qdrant MCP

This package provides tools to clone, process, and vectorize AT Protocol repositories
for use with Retrieval-Augmented Generation (RAG) through Qdrant MCP.
"""

__version__ = "0.1.0"
__author__ = "MoodeSky Team"
__description__ = "AT Protocol repository vectorization for RAG with Qdrant MCP"

from .models import VectorizationConfig, DocumentChunk, ProcessingStats
from .vectorizer import AtprotoVectorizer

__all__ = [
    "VectorizationConfig",
    "DocumentChunk", 
    "ProcessingStats",
    "AtprotoVectorizer"
]