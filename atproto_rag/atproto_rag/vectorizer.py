"""
AT Protocol Dart repository vectorizer
"""

import hashlib
import json
import re
import time
from pathlib import Path
from typing import Dict, List, Optional

import git
from fastembed import TextEmbedding
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
from rich.console import Console
from rich.progress import Progress, TaskID

from .models import (
    ChunkMetadata,
    DocumentChunk,
    ProcessingStats,
    RepositoryInfo,
    VectorizationConfig,
)

console = Console()


class AtprotoVectorizer:
    """Vectorizer for AT Protocol Dart repositories"""
    
    def __init__(self, config: VectorizationConfig):
        self.config = config
        self.client = QdrantClient(url=config.qdrant_url)
        self.embedding_model = None
        self.stats = None
        
    def _init_embedding_model(self):
        """Initialize embedding model lazily"""
        if self.embedding_model is None:
            console.print(f"[blue]Loading embedding model: {self.config.embedding_model}[/blue]")
            self.embedding_model = TextEmbedding(model_name=self.config.embedding_model)
    
    def setup_collection(self) -> bool:
        """Create or verify Qdrant collection"""
        try:
            collections = [c.name for c in self.client.get_collections().collections]
            
            if self.config.collection_name not in collections:
                console.print(f"[yellow]Creating collection: {self.config.collection_name}[/yellow]")
                self.client.create_collection(
                    collection_name=self.config.collection_name,
                    vectors_config=VectorParams(
                        size=384,  # BAAI/bge-small-en-v1.5 dimension
                        distance=Distance.COSINE
                    )
                )
                console.print(f"[green]✓ Collection created: {self.config.collection_name}[/green]")
            else:
                console.print(f"[green]✓ Collection exists: {self.config.collection_name}[/green]")
            
            return True
        except Exception as e:
            console.print(f"[red]✗ Failed to setup collection: {e}[/red]")
            return False
    
    def clone_repository(self, repo_url: str, target_path: Path) -> Optional[RepositoryInfo]:
        """Clone repository if not exists, or update if exists"""
        try:
            if target_path.exists():
                console.print(f"[yellow]Repository exists, updating: {target_path}[/yellow]")
                repo = git.Repo(target_path)
                repo.remotes.origin.pull()
            else:
                console.print(f"[blue]Cloning repository: {repo_url}[/blue]")
                repo = git.Repo.clone_from(repo_url, target_path)
            
            # Get repository info
            commit_hash = repo.head.commit.hexsha
            console.print(f"[green]✓ Repository ready at commit: {commit_hash[:8]}[/green]")
            
            return RepositoryInfo(
                url=repo_url,
                local_path=str(target_path),
                commit_hash=commit_hash
            )
        except Exception as e:
            console.print(f"[red]✗ Failed to clone repository: {e}[/red]")
            return None
    
    def extract_dart_chunks(self, file_path: Path) -> List[DocumentChunk]:
        """Extract meaningful chunks from Dart files"""
        chunks = []
        relative_path = str(file_path.relative_to(self.stats.repository.local_path))
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            console.print(f"[yellow]Warning: Could not decode {relative_path}[/yellow]")
            self.stats.warnings.append(f"Could not decode {relative_path}")
            return chunks
        
        # Extract classes
        class_pattern = r'((?:///.*\n)*)\s*(?:abstract\s+)?class\s+(\w+)(?:[^{]*)?{([^{}]*(?:{[^{}]*}[^{}]*)*)'
        for match in re.finditer(class_pattern, content, re.MULTILINE | re.DOTALL):
            doc_comment = match.group(1) or ""
            class_name = match.group(2)
            class_body = match.group(0)
            
            # Clean documentation
            doc_lines = [
                line.strip().replace('///', '').strip()
                for line in doc_comment.split('\n')
                if line.strip()
            ]
            documentation = ' '.join(doc_lines)
            
            # Limit code length
            code = class_body[:self.config.max_code_length]
            
            metadata = ChunkMetadata(
                type="class",
                name=class_name,
                file_path=relative_path,
                signature=f"class {class_name}",
                code=code
            )
            
            chunk = DocumentChunk(
                type="class",
                name=class_name,
                file_path=relative_path,
                documentation=documentation[:self.config.max_doc_length],
                code=code,
                signature=f"class {class_name}",
                metadata=metadata
            )
            chunks.append(chunk)
        
        # Extract functions and methods
        function_pattern = r'((?:///.*\n)*)\s*(?:static\s+)?(?:Future<[\w\?<>]+>|[\w\?<>]+)\s+(\w+)\s*\([^)]*\)(?:\s*async)?\s*(?:{[^}]*}|=>.*?;)'
        for match in re.finditer(function_pattern, content, re.MULTILINE | re.DOTALL):
            doc_comment = match.group(1) or ""
            func_name = match.group(2)
            func_body = match.group(0)
            
            # Skip certain patterns
            if func_name in ['get', 'set'] or func_name[0].isupper():
                continue
            
            doc_lines = [
                line.strip().replace('///', '').strip()
                for line in doc_comment.split('\n')
                if line.strip()
            ]
            documentation = ' '.join(doc_lines)
            
            code = func_body[:self.config.max_code_length]
            
            metadata = ChunkMetadata(
                type="function",
                name=func_name,
                file_path=relative_path,
                signature=func_name,
                code=code
            )
            
            chunk = DocumentChunk(
                type="function",
                name=func_name,
                file_path=relative_path,
                documentation=documentation[:self.config.max_doc_length],
                code=code,
                signature=func_name,
                metadata=metadata
            )
            chunks.append(chunk)
        
        return chunks
    
    def extract_markdown_chunks(self, file_path: Path) -> List[DocumentChunk]:
        """Extract sections from Markdown files"""
        chunks = []
        relative_path = str(file_path.relative_to(self.stats.repository.local_path))
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            console.print(f"[yellow]Warning: Could not decode {relative_path}[/yellow]")
            self.stats.warnings.append(f"Could not decode {relative_path}")
            return chunks
        
        # Split by headers
        sections = re.split(r'\n(?=#)', content)
        
        for section in sections:
            if not section.strip():
                continue
            
            lines = section.strip().split('\n')
            header_match = re.match(r'^#+\s+(.+)', lines[0])
            
            if header_match:
                title = header_match.group(1)
                content_text = '\n'.join(lines[1:]).strip()
                
                # Extract code blocks
                code_blocks = re.findall(r'```[\w]*\n(.*?)\n```', content_text, re.DOTALL)
                code = '\n\n'.join(code_blocks) if code_blocks else ""
                
                metadata = ChunkMetadata(
                    type="documentation",
                    name=title,
                    file_path=relative_path,
                    signature=title,
                    code=code[:self.config.max_code_length] if code else ""
                )
                
                chunk = DocumentChunk(
                    type="documentation",
                    name=title,
                    file_path=relative_path,
                    documentation=content_text[:self.config.max_doc_length],
                    code=code[:self.config.max_code_length] if code else "",
                    signature=title,
                    metadata=metadata
                )
                chunks.append(chunk)
        
        return chunks
    
    def extract_json_chunks(self, file_path: Path) -> List[DocumentChunk]:
        """Extract schemas from JSON files (LEXICON files)"""
        chunks = []
        relative_path = str(file_path.relative_to(self.stats.repository.local_path))
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except (UnicodeDecodeError, json.JSONDecodeError) as e:
            console.print(f"[yellow]Warning: Could not parse JSON {relative_path}: {e}[/yellow]")
            self.stats.warnings.append(f"Could not parse JSON {relative_path}: {e}")
            return chunks
        
        # Check if this is a LEXICON file
        if isinstance(data, dict) and 'lexicon' in data:
            lexicon_data = data
            
            # Extract main definition
            lexicon_id = lexicon_data.get('id', 'unknown')
            description = lexicon_data.get('description', '')
            
            # Create a comprehensive description text
            documentation_parts = [description]
            
            # Add type information if available
            if 'defs' in lexicon_data:
                for def_name, def_data in lexicon_data['defs'].items():
                    if isinstance(def_data, dict):
                        def_type = def_data.get('type', 'unknown')
                        def_desc = def_data.get('description', '')
                        
                        documentation_parts.append(f"{def_name} ({def_type}): {def_desc}")
                        
                        # Add properties information for objects
                        if def_type == 'object' and 'properties' in def_data:
                            for prop_name, prop_data in def_data['properties'].items():
                                if isinstance(prop_data, dict):
                                    prop_type = prop_data.get('type', 'unknown')
                                    prop_desc = prop_data.get('description', '')
                                    documentation_parts.append(f"  - {prop_name} ({prop_type}): {prop_desc}")
            
            documentation = '\n'.join(filter(None, documentation_parts))
            
            # Format JSON for code field
            code = json.dumps(data, indent=2, ensure_ascii=False)
            
            metadata = ChunkMetadata(
                type="lexicon",
                name=lexicon_id,
                file_path=relative_path,
                signature=f"lexicon {lexicon_id}",
                code=code[:self.config.max_code_length]
            )
            
            chunk = DocumentChunk(
                type="lexicon",
                name=lexicon_id,
                file_path=relative_path,
                documentation=documentation[:self.config.max_doc_length],
                code=code[:self.config.max_code_length],
                signature=f"lexicon {lexicon_id}",
                metadata=metadata
            )
            chunks.append(chunk)
        
        # Handle other JSON files (configuration, data files, etc.)
        elif isinstance(data, dict):
            # Extract meaningful information from general JSON files
            file_name = file_path.stem
            
            # Create a description from the JSON structure
            description_parts = []
            
            if 'name' in data:
                description_parts.append(f"Name: {data['name']}")
            if 'description' in data:
                description_parts.append(f"Description: {data['description']}")
            if 'version' in data:
                description_parts.append(f"Version: {data['version']}")
            
            # Add key information
            keys = list(data.keys())[:10]  # Limit to first 10 keys
            description_parts.append(f"Keys: {', '.join(keys)}")
            
            documentation = '\n'.join(description_parts)
            code = json.dumps(data, indent=2, ensure_ascii=False)
            
            metadata = ChunkMetadata(
                type="json",
                name=file_name,
                file_path=relative_path,
                signature=f"json {file_name}",
                code=code[:self.config.max_code_length]
            )
            
            chunk = DocumentChunk(
                type="json",
                name=file_name,
                file_path=relative_path,
                documentation=documentation[:self.config.max_doc_length],
                code=code[:self.config.max_code_length],
                signature=f"json {file_name}",
                metadata=metadata
            )
            chunks.append(chunk)
        
        return chunks
    
    def generate_chunk_id(self, chunk: DocumentChunk) -> str:
        """Generate unique ID for chunk"""
        unique_string = f"{chunk.file_path}_{chunk.type}_{chunk.name}"
        return hashlib.md5(unique_string.encode()).hexdigest()
    
    def process_repository(self, repo_path: Path) -> List[DocumentChunk]:
        """Process entire repository and extract chunks"""
        all_chunks = []
        
        # Find files
        dart_files = list(repo_path.rglob("*.dart"))
        md_files = list(repo_path.rglob("*.md"))
        json_files = list(repo_path.rglob("*.json"))
        
        # Filter files
        if not self.config.include_tests:
            dart_files = [f for f in dart_files if 'test' not in str(f)]
        
        if not self.config.include_generated:
            dart_files = [f for f in dart_files if not f.name.endswith('.g.dart')]
        
        # Filter JSON files to include only meaningful ones
        # Keep LEXICON files, package.json, and other configuration files
        filtered_json_files = []
        for json_file in json_files:
            file_name = json_file.name.lower()
            file_path_str = str(json_file).lower()
            
            # Include LEXICON files (usually in lexicons directory)
            if 'lexicon' in file_path_str or file_name.endswith('.json'):
                # Skip common non-useful files
                if not any(skip in file_name for skip in ['package-lock.json', 'yarn.lock', 'node_modules']):
                    filtered_json_files.append(json_file)
        
        json_files = filtered_json_files
        
        self.stats.repository.dart_files = len(dart_files)
        self.stats.repository.md_files = len(md_files)
        self.stats.repository.json_files = len(json_files)
        self.stats.repository.total_files = len(dart_files) + len(md_files) + len(json_files)
        
        console.print(f"[blue]Processing {len(dart_files)} Dart files, {len(md_files)} Markdown files, and {len(json_files)} JSON files[/blue]")
        
        with Progress() as progress:
            task = progress.add_task("[green]Processing files...", total=len(dart_files) + len(md_files) + len(json_files))
            
            # Process Dart files
            for dart_file in dart_files:
                try:
                    chunks = self.extract_dart_chunks(dart_file)
                    all_chunks.extend(chunks)
                except Exception as e:
                    error_msg = f"Error processing {dart_file}: {e}"
                    console.print(f"[red]✗ {error_msg}[/red]")
                    self.stats.errors.append(error_msg)
                
                progress.advance(task)
            
            # Process Markdown files
            for md_file in md_files:
                try:
                    chunks = self.extract_markdown_chunks(md_file)
                    all_chunks.extend(chunks)
                except Exception as e:
                    error_msg = f"Error processing {md_file}: {e}"
                    console.print(f"[red]✗ {error_msg}[/red]")
                    self.stats.errors.append(error_msg)
                
                progress.advance(task)
            
            # Process JSON files
            for json_file in json_files:
                try:
                    chunks = self.extract_json_chunks(json_file)
                    all_chunks.extend(chunks)
                except Exception as e:
                    error_msg = f"Error processing {json_file}: {e}"
                    console.print(f"[red]✗ {error_msg}[/red]")
                    self.stats.errors.append(error_msg)
                
                progress.advance(task)
        
        self.stats.chunks_created = len(all_chunks)
        console.print(f"[green]✓ Extracted {len(all_chunks)} chunks[/green]")
        
        return all_chunks
    
    def vectorize_and_store(self, chunks: List[DocumentChunk]):
        """Vectorize chunks and store in Qdrant"""
        self._init_embedding_model()
        
        points = []
        total_batches = (len(chunks) + self.config.batch_size - 1) // self.config.batch_size
        
        console.print(f"[blue]Vectorizing {len(chunks)} chunks in {total_batches} batches[/blue]")
        
        with Progress() as progress:
            task = progress.add_task("[green]Vectorizing...", total=total_batches)
            
            for i in range(0, len(chunks), self.config.batch_size):
                batch = chunks[i:i + self.config.batch_size]
                
                # Prepare texts for embedding
                texts = [chunk.get_embedding_text() for chunk in batch]
                
                # Generate embeddings
                embeddings = list(self.embedding_model.embed(texts))
                
                # Create points
                for chunk, embedding in zip(batch, embeddings):
                    point_id = self.generate_chunk_id(chunk)
                    
                    point = PointStruct(
                        id=point_id,
                        vector=embedding.tolist(),
                        payload={
                            "information": chunk.get_information_text(),
                            "metadata": chunk.metadata.model_dump()
                        }
                    )
                    points.append(point)
                
                progress.advance(task)
        
        # Upload to Qdrant
        console.print(f"[blue]Uploading {len(points)} points to Qdrant...[/blue]")
        
        try:
            self.client.upsert(
                collection_name=self.config.collection_name,
                points=points
            )
            self.stats.chunks_uploaded = len(points)
            console.print(f"[green]✓ Upload complete! {len(points)} points stored[/green]")
        except Exception as e:
            error_msg = f"Failed to upload to Qdrant: {e}"
            console.print(f"[red]✗ {error_msg}[/red]")
            self.stats.errors.append(error_msg)
            raise
    
    def test_search(self, query: str, limit: int = 5):
        """Test search functionality"""
        self._init_embedding_model()
        
        console.print(f"\n[blue]Testing search: '{query}'[/blue]")
        
        try:
            query_embedding = next(self.embedding_model.embed([query])).tolist()
            
            results = self.client.search(
                collection_name=self.config.collection_name,
                query_vector=query_embedding,
                limit=limit
            )
            
            console.print(f"[green]Found {len(results)} results:[/green]")
            
            for i, result in enumerate(results):
                metadata = result.payload['metadata']
                console.print(f"\n{i+1}. [yellow]Score: {result.score:.4f}[/yellow]")
                console.print(f"   Type: {metadata['type']}")
                console.print(f"   Name: {metadata['name']}")
                console.print(f"   File: {metadata['file_path']}")
                console.print(f"   Info: {result.payload['information'][:200]}...")
            
        except Exception as e:
            console.print(f"[red]✗ Search failed: {e}[/red]")
    
    def run_full_process(self, repo_url: str, target_path: Path) -> ProcessingStats:
        """Run the complete vectorization process"""
        start_time = time.time()
        
        # Initialize stats
        self.stats = ProcessingStats(
            repository=RepositoryInfo(url=repo_url, local_path=str(target_path)),
            config=self.config
        )
        
        try:
            # Setup collection
            if not self.setup_collection():
                raise Exception("Failed to setup Qdrant collection")
            
            # Clone/update repository
            repo_info = self.clone_repository(repo_url, target_path)
            if not repo_info:
                raise Exception("Failed to clone repository")
            
            self.stats.repository = repo_info
            
            # Process repository
            chunks = self.process_repository(target_path)
            
            # Vectorize and store
            if chunks:
                self.vectorize_and_store(chunks)
            else:
                console.print("[yellow]No chunks to process[/yellow]")
            
            self.stats.processing_time = time.time() - start_time
            
            console.print(f"\n[green]✓ Process completed in {self.stats.processing_time:.2f} seconds[/green]")
            console.print(f"[green]✓ {self.stats.chunks_uploaded} chunks stored in collection '{self.config.collection_name}'[/green]")
            
            return self.stats
            
        except Exception as e:
            self.stats.processing_time = time.time() - start_time
            error_msg = f"Process failed: {e}"
            console.print(f"[red]✗ {error_msg}[/red]")
            self.stats.errors.append(error_msg)
            raise