"""
dev-rag: Development documentation vectorization for RAG with Qdrant MCP

This package provides tools to clone, process, and vectorize development documentation
repositories for use with Retrieval-Augmented Generation (RAG) through Qdrant MCP.
"""

__version__ = "0.1.0"
__author__ = "moodeSky Team"
__description__ = "Development documentation vectorization for RAG with Qdrant MCP"

from .models import VectorizationConfig, DocumentChunk, ProcessingStats
from .vectorizer import DevVectorizer

__all__ = [
    "VectorizationConfig",
    "DocumentChunk", 
    "ProcessingStats",
    "DevVectorizer"
]