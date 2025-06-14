"""
Data models for atproto-rag
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ChunkMetadata(BaseModel):
    """Metadata for a code/documentation chunk"""
    type: str = Field(..., description="Type of chunk: class, function, documentation, lexicon, json")
    name: str = Field(..., description="Name of the item")
    file_path: str = Field(..., description="Path to the source file")
    signature: str = Field(..., description="Function/class signature or section title")
    code: str = Field(default="", description="Actual code content")
    line_start: Optional[int] = Field(None, description="Starting line number")
    line_end: Optional[int] = Field(None, description="Ending line number")


class DocumentChunk(BaseModel):
    """A chunk of documentation or code for vectorization"""
    type: str = Field(..., description="Type: class, function, documentation, lexicon, json")
    name: str = Field(..., description="Name of the item")
    file_path: str = Field(..., description="Relative path from repository root")
    documentation: str = Field(default="", description="Documentation text")
    code: str = Field(default="", description="Code content")
    signature: str = Field(..., description="Method signature or title")
    metadata: ChunkMetadata = Field(..., description="Additional metadata")
    
    def get_embedding_text(self) -> str:
        """Get text to be used for embedding generation"""
        parts = [self.signature]
        
        if self.documentation.strip():
            parts.append(self.documentation)
            
        if self.name and self.name not in self.signature:
            parts.append(self.name)
            
        return " ".join(parts)
    
    def get_information_text(self) -> str:
        """Get information text for Claude consumption"""
        return f"{self.signature}: {self.documentation}"


class VectorizationConfig(BaseModel):
    """Configuration for vectorization process with Qdrant"""
    # Qdrant configuration
    qdrant_url: str = Field(default="http://localhost:6333", description="Qdrant server URL")
    collection_name: str = Field(default="atproto-dart")
    
    # FastEmbed configuration
    embedding_model: str = Field(default="BAAI/bge-small-en-v1.5", description="FastEmbed model")
    embedding_dimensions: int = Field(default=384, description="BAAI/bge-small-en-v1.5 dimensions")
    
    # Performance optimization settings
    batch_size: int = Field(default=100, description="Batch size for embedding requests")
    max_doc_length: int = Field(default=1000)
    max_code_length: int = Field(default=1500)
    
    # Processing filters
    include_tests: bool = Field(default=False)
    include_generated: bool = Field(default=False)
    
    # Memory management
    max_memory_percent: int = Field(default=75, description="Maximum memory usage percentage")
    store_batch_size: int = Field(default=100, description="Batch size for Qdrant storage")


class RepositoryInfo(BaseModel):
    """Information about the processed repository"""
    url: str = Field(..., description="Repository URL")
    local_path: str = Field(..., description="Local clone path")
    branch: str = Field(default="main", description="Branch to process")
    commit_hash: Optional[str] = Field(None, description="Current commit hash")
    total_files: int = Field(default=0, description="Total files processed")
    total_chunks: int = Field(default=0, description="Total chunks created")
    dart_files: int = Field(default=0, description="Number of Dart files")
    md_files: int = Field(default=0, description="Number of Markdown files")
    json_files: int = Field(default=0, description="Number of JSON files")


class ProcessingStats(BaseModel):
    """Statistics from the processing operation"""
    repository: RepositoryInfo
    config: VectorizationConfig
    chunks_created: int = Field(default=0)
    chunks_uploaded: int = Field(default=0)
    processing_time: float = Field(default=0.0)
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)