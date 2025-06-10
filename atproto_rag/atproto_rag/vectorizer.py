"""
AT Protocol Dart repository vectorizer with ChromaDB + OpenAI optimizations
"""

import asyncio
import hashlib
import json
import os
import re
import time
from pathlib import Path
from typing import Dict, List, Optional

import chromadb
import git
import openai
import psutil
from chromadb.config import Settings
from rich.console import Console
from rich.progress import Progress, TaskID
from tenacity import retry, stop_after_attempt, wait_exponential

from .models import (
    ChunkMetadata,
    DocumentChunk,
    ProcessingStats,
    RepositoryInfo,
    VectorizationConfig,
)

console = Console()


class AtprotoVectorizer:
    """High-performance vectorizer for AT Protocol Dart repositories using ChromaDB + OpenAI"""
    
    def __init__(self, config: VectorizationConfig):
        self.config = config
        self.stats = None
        
        # Initialize OpenAI
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY environment variable is required")
        
        # Create async OpenAI client
        self.openai_client = openai.AsyncOpenAI(api_key=self.openai_api_key)
        
        # Initialize ChromaDB with persistent storage
        chroma_settings = Settings(
            anonymized_telemetry=False,
            allow_reset=True
        )
        
        self.chroma_client = chromadb.PersistentClient(
            path=config.chromadb_path,
            settings=chroma_settings
        )
        
        # Memory monitoring for M2 MacBook Air
        self.max_memory_percent = 75  # Stay under 75% memory usage
        
        console.print(f"[green]✓ ChromaDB initialized at: {config.chromadb_path}[/green]")
        
    @retry(wait=wait_exponential(min=1, max=10), stop=stop_after_attempt(3))
    async def _get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for a batch of texts with retry logic"""
        try:
            response = await self.openai_client.embeddings.create(
                input=texts,
                model=self.config.embedding_model
            )
            return [r.embedding for r in response.data]
        except Exception as e:
            console.print(f"[yellow]Retrying embedding batch due to: {e}[/yellow]")
            raise
    
    def _check_memory_usage(self) -> bool:
        """Check if memory usage is within safe limits"""
        memory_percent = psutil.virtual_memory().percent
        if memory_percent > self.max_memory_percent:
            console.print(f"[yellow]Warning: Memory usage at {memory_percent:.1f}%, waiting...[/yellow]")
            time.sleep(2)  # Brief pause to let system recover
            return False
        return True
    
    def _calculate_optimal_batch_size(self) -> int:
        """Calculate optimal batch size based on available memory"""
        available_memory = psutil.virtual_memory().available
        # More aggressive batch sizing for OpenAI API efficiency
        # Estimate: 0.5MB per text for processing (less conservative)
        base_batch_size = min(self.config.batch_size, int(available_memory / (512 * 1024)))
        return max(100, base_batch_size)  # Minimum batch size of 100 for efficiency
    
    def setup_collection(self) -> bool:
        """Create or verify ChromaDB collection"""
        try:
            # Check if collection already exists
            existing_collections = self.chroma_client.list_collections()
            collection_names = [c.name for c in existing_collections]
            
            if self.config.collection_name in collection_names:
                # Collection exists, get it
                self.collection = self.chroma_client.get_collection(
                    name=self.config.collection_name
                )
                console.print(f"[green]✓ Collection exists: {self.config.collection_name}[/green]")
            else:
                # Collection doesn't exist, create it
                console.print(f"[yellow]Creating collection: {self.config.collection_name}[/yellow]")
                self.collection = self.chroma_client.create_collection(
                    name=self.config.collection_name,
                    metadata={"hnsw:space": "cosine"}
                )
                console.print(f"[green]✓ Collection created: {self.config.collection_name}[/green]")
            
            return True
        except Exception as e:
            console.print(f"[red]✗ Failed to setup collection: {e}[/red]")
            console.print(f"[red]Error details: {type(e).__name__}: {str(e)}[/red]")
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
    
    async def vectorize_and_store(self, chunks: List[DocumentChunk]):
        """High-performance vectorization and storage with OpenAI + ChromaDB"""
        if not chunks:
            console.print("[yellow]No chunks to process[/yellow]")
            return
        
        # Dynamic batch sizing based on memory
        optimal_batch_size = self._calculate_optimal_batch_size()
        console.print(f"[blue]Using optimal batch size: {optimal_batch_size}[/blue]")
        
        total_batches = (len(chunks) + optimal_batch_size - 1) // optimal_batch_size
        console.print(f"[blue]Vectorizing {len(chunks)} chunks in {total_batches} batches[/blue]")
        
        all_embeddings = []
        all_documents = []
        all_metadatas = []
        all_ids = []
        
        with Progress() as progress:
            task = progress.add_task("[green]Vectorizing...", total=total_batches)
            
            for i in range(0, len(chunks), optimal_batch_size):
                # Memory check before processing each batch
                if not self._check_memory_usage():
                    # If memory is tight, reduce batch size
                    optimal_batch_size = max(5, optimal_batch_size // 2)
                    console.print(f"[yellow]Reducing batch size to {optimal_batch_size}[/yellow]")
                
                batch = chunks[i:i + optimal_batch_size]
                
                # Prepare texts for embedding
                texts = [chunk.get_embedding_text() for chunk in batch]
                
                try:
                    # Get embeddings using OpenAI (async)
                    embeddings = await self._get_embeddings_batch(texts)
                    
                    # Prepare data for ChromaDB
                    for chunk, embedding in zip(batch, embeddings):
                        chunk_id = self.generate_chunk_id(chunk)
                        
                        all_ids.append(chunk_id)
                        all_embeddings.append(embedding)
                        all_documents.append(chunk.get_information_text())
                        all_metadatas.append({
                            "type": chunk.type,
                            "name": chunk.name,
                            "file_path": chunk.file_path,
                            "signature": chunk.signature,
                            "code": chunk.code[:500] if chunk.code else "",  # Limit code size
                            "documentation": chunk.documentation[:1000] if chunk.documentation else ""
                        })
                    
                    progress.advance(task)
                    
                except Exception as e:
                    error_msg = f"Error processing batch {i//optimal_batch_size + 1}: {e}"
                    console.print(f"[red]✗ {error_msg}[/red]")
                    self.stats.errors.append(error_msg)
                    continue
        
        # Store in ChromaDB in smaller chunks to avoid memory issues
        console.print(f"[blue]Storing {len(all_ids)} chunks in ChromaDB...[/blue]")
        
        store_batch_size = 500  # Store in smaller batches
        
        with Progress() as progress:
            store_task = progress.add_task("[green]Storing...", total=len(all_ids))
            
            for i in range(0, len(all_ids), store_batch_size):
                try:
                    self.collection.add(
                        ids=all_ids[i:i + store_batch_size],
                        embeddings=all_embeddings[i:i + store_batch_size],
                        documents=all_documents[i:i + store_batch_size],
                        metadatas=all_metadatas[i:i + store_batch_size]
                    )
                    progress.advance(store_task, advance=min(store_batch_size, len(all_ids) - i))
                    
                    # Brief pause to prevent overwhelming the system
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    error_msg = f"Failed to store batch: {e}"
                    console.print(f"[red]✗ {error_msg}[/red]")
                    self.stats.errors.append(error_msg)
                    continue
        
        self.stats.chunks_uploaded = len(all_ids)
        console.print(f"[green]✓ Successfully stored {len(all_ids)} chunks in ChromaDB[/green]")
    
    async def test_search(self, query: str, limit: int = 5):
        """Test search functionality with ChromaDB"""
        console.print(f"\n[blue]Testing search: '{query}'[/blue]")
        
        try:
            # Get query embedding using the same method
            query_embeddings = await self._get_embeddings_batch([query])
            query_embedding = query_embeddings[0]
            
            # Search in ChromaDB
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=limit
            )
            
            if results['ids'] and len(results['ids'][0]) > 0:
                console.print(f"[green]Found {len(results['ids'][0])} results:[/green]")
                
                for i, (doc_id, document, metadata, distance) in enumerate(zip(
                    results['ids'][0],
                    results['documents'][0],
                    results['metadatas'][0],
                    results['distances'][0]
                )):
                    console.print(f"\n{i+1}. [yellow]Distance: {distance:.4f}[/yellow]")
                    console.print(f"   Type: {metadata.get('type', 'unknown')}")
                    console.print(f"   Name: {metadata.get('name', 'unknown')}")
                    console.print(f"   File: {metadata.get('file_path', 'unknown')}")
                    console.print(f"   Info: {document[:200]}...")
            else:
                console.print("[yellow]No results found[/yellow]")
            
        except Exception as e:
            console.print(f"[red]✗ Search failed: {e}[/red]")
    
    async def run_full_process(self, repo_url: str, target_path: Path) -> ProcessingStats:
        """Run the complete high-performance vectorization process"""
        start_time = time.time()
        
        # Initialize stats
        self.stats = ProcessingStats(
            repository=RepositoryInfo(url=repo_url, local_path=str(target_path)),
            config=self.config
        )
        
        # Show memory info
        memory_info = psutil.virtual_memory()
        console.print(f"[blue]System Memory: {memory_info.total / (1024**3):.1f}GB total, {memory_info.available / (1024**3):.1f}GB available[/blue]")
        
        try:
            # Setup ChromaDB collection
            if not self.setup_collection():
                raise Exception("Failed to setup ChromaDB collection")
            
            # Clone/update repository
            repo_info = self.clone_repository(repo_url, target_path)
            if not repo_info:
                raise Exception("Failed to clone repository")
            
            self.stats.repository = repo_info
            
            # Process repository
            chunks = self.process_repository(target_path)
            
            # Vectorize and store with high-performance async processing
            if chunks:
                await self.vectorize_and_store(chunks)
            else:
                console.print("[yellow]No chunks to process[/yellow]")
            
            self.stats.processing_time = time.time() - start_time
            
            console.print(f"\n[green]✓ Process completed in {self.stats.processing_time:.2f} seconds[/green]")
            console.print(f"[green]✓ {self.stats.chunks_uploaded} chunks stored in collection '{self.config.collection_name}'[/green]")
            
            # Show final memory usage
            final_memory = psutil.virtual_memory()
            console.print(f"[blue]Final memory usage: {final_memory.percent:.1f}%[/blue]")
            
            return self.stats
            
        except Exception as e:
            self.stats.processing_time = time.time() - start_time
            error_msg = f"Process failed: {e}"
            console.print(f"[red]✗ {error_msg}[/red]")
            self.stats.errors.append(error_msg)
            raise