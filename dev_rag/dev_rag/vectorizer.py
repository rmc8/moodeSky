"""
Development documentation vectorizer with Qdrant + FastEmbed
"""

import asyncio
import hashlib
import json
import os
import re
import time
from pathlib import Path
from typing import Dict, List, Optional, Any

import git
import psutil
import yaml
from fastembed import TextEmbedding
from qdrant_client import QdrantClient
from qdrant_client.http import models
from rich.console import Console
from rich.progress import Progress, TaskID, SpinnerColumn, TextColumn, BarColumn, TimeRemainingColumn
from rich.table import Table
from rich.panel import Panel
from rich.live import Live
from tenacity import retry, stop_after_attempt, wait_exponential

from .models import (
    ChunkMetadata,
    DocumentChunk,
    ProcessingStats,
    RepositoryInfo,
    VectorizationConfig,
)

console = Console()


class DevVectorizer:
    """Vectorizer for development documentation repositories using Qdrant + FastEmbed"""
    
    def __init__(self, config: VectorizationConfig):
        self.config = config
        self.stats = None
        
        # Initialize Qdrant client
        self.client = QdrantClient(url=config.qdrant_url)
        
        # Initialize FastEmbed
        console.print("[cyan]Initializing FastEmbed model...[/cyan]")
        self.embedding_model = TextEmbedding(
            model_name=config.embedding_model,
            cache_dir="./.cache/fastembed"
        )
        console.print(f"[green]✓ FastEmbed model loaded: {config.embedding_model}[/green]")
        
    def setup_collection(self) -> bool:
        """Setup or recreate Qdrant collection"""
        try:
            # Check if collection exists
            collections = self.client.get_collections().collections
            collection_exists = any(c.name == self.config.collection_name for c in collections)
            
            if collection_exists:
                console.print(f"[yellow]Collection '{self.config.collection_name}' already exists[/yellow]")
                # Get collection info
                collection_info = self.client.get_collection(self.config.collection_name)
                console.print(f"[dim]Current vectors count: {collection_info.vectors_count}[/dim]")
                return True
            
            # Create new collection
            self.client.create_collection(
                collection_name=self.config.collection_name,
                vectors_config={
                    "fast-bge-small-en-v1.5": models.VectorParams(
                        size=self.config.embedding_dimensions,
                        distance=models.Distance.COSINE,
                    )
                },
            )
            
            console.print(f"[green]✓ Created collection '{self.config.collection_name}'[/green]")
            console.print(f"[dim]Vector dimensions: {self.config.embedding_dimensions}[/dim]")
            console.print(f"[dim]Distance metric: COSINE[/dim]")
            return True
            
        except Exception as e:
            console.print(f"[red]Failed to setup collection: {e}[/red]")
            return False
    
    async def run_full_process(self, repo_url: str, local_path: Path) -> ProcessingStats:
        """Run the full vectorization process"""
        start_time = time.time()
        
        # Initialize repository info
        repo_info = RepositoryInfo(
            url=repo_url,
            local_path=str(local_path),
            branch="main"
        )
        
        self.stats = ProcessingStats(
            repository=repo_info,
            config=self.config
        )
        
        # Display process header
        console.print(Panel.fit(
            f"[bold blue]AT Protocol Repository Vectorization[/bold blue]\n"
            f"[cyan]Repository:[/cyan] {repo_url}\n"
            f"[cyan]Target:[/cyan] Qdrant @ {self.config.qdrant_url}",
            title="🚀 Starting Vectorization",
            border_style="blue"
        ))
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            "[progress.percentage]{task.percentage:>3.0f}%",
            TimeRemainingColumn(),
            console=console
        ) as progress:
            
            # Clone/update repository
            clone_task = progress.add_task("[cyan]Cloning/updating repository...", total=None)
            repo = await self._clone_or_update_repo(repo_url, local_path)
            progress.update(clone_task, completed=True, description="[green]✓ Repository ready")
            
            # Update repository info
            repo_info.commit_hash = repo.head.commit.hexsha[:8]
            
            # Setup collection
            setup_task = progress.add_task("[cyan]Setting up Qdrant collection...", total=None)
            if not self.setup_collection():
                self.stats.errors.append("Failed to setup Qdrant collection")
                return self.stats
            progress.update(setup_task, completed=True, description="[green]✓ Qdrant collection ready")
            
            # Extract chunks with detailed progress
            extract_task = progress.add_task("[cyan]Extracting code chunks...", total=100)
            chunks = await self._extract_chunks_with_progress(local_path, progress, extract_task)
            self.stats.chunks_created = len(chunks)
            self._extracted_chunks = chunks  # Store chunks for summary display
            progress.update(extract_task, completed=True, description=f"[green]✓ Extracted {len(chunks)} chunks")
            
            # Display extraction summary
            self._display_extraction_summary()
            
            # Generate embeddings and upload
            if chunks:
                upload_task = progress.add_task(
                    "[cyan]Generating embeddings and uploading...", 
                    total=len(chunks)
                )
                await self._vectorize_and_upload_with_details(chunks, progress, upload_task)
        
        self.stats.processing_time = time.time() - start_time
        
        # Display final summary
        self._display_final_summary()
        
        return self.stats

    async def run_flutter_process(self, flutter_path: Path) -> ProcessingStats:
        """Run the Flutter project vectorization process"""
        start_time = time.time()
        
        # Initialize repository info for Flutter project
        repo_info = RepositoryInfo(
            url=f"file://{flutter_path}",
            local_path=str(flutter_path),
            branch="local"
        )
        
        self.stats = ProcessingStats(
            repository=repo_info,
            config=self.config
        )
        
        # Display process header
        console.print(Panel.fit(
            f"[bold blue]Flutter Project Vectorization[/bold blue]\n"
            f"[cyan]Project Path:[/cyan] {flutter_path}\n"
            f"[cyan]Target:[/cyan] Qdrant @ {self.config.qdrant_url}",
            title="🚀 Starting Flutter Vectorization",
            border_style="blue"
        ))
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            "[progress.percentage]{task.percentage:>3.0f}%",
            TimeRemainingColumn(),
            console=console
        ) as progress:
            
            # Verify Flutter project
            verify_task = progress.add_task("[cyan]Verifying Flutter project...", total=None)
            pubspec_path = flutter_path / "pubspec.yaml"
            if not pubspec_path.exists():
                self.stats.errors.append("Not a valid Flutter project - pubspec.yaml not found")
                return self.stats
            progress.update(verify_task, completed=True, description="[green]✓ Flutter project verified")
            
            # Setup collection
            setup_task = progress.add_task("[cyan]Setting up Qdrant collection...", total=None)
            if not self.setup_collection():
                self.stats.errors.append("Failed to setup Qdrant collection")
                return self.stats
            progress.update(setup_task, completed=True, description="[green]✓ Qdrant collection ready")
            
            # Extract chunks with detailed progress
            extract_task = progress.add_task("[cyan]Extracting code chunks...", total=100)
            chunks = await self._extract_chunks_with_progress(flutter_path, progress, extract_task)
            self.stats.chunks_created = len(chunks)
            self._extracted_chunks = chunks  # Store chunks for summary display
            progress.update(extract_task, completed=True, description=f"[green]✓ Extracted {len(chunks)} chunks")
            
            # Display extraction summary
            self._display_extraction_summary()
            
            # Generate embeddings and upload
            if chunks:
                upload_task = progress.add_task(
                    "[cyan]Generating embeddings and uploading...", 
                    total=len(chunks)
                )
                await self._vectorize_and_upload_with_details(chunks, progress, upload_task)
        
        self.stats.processing_time = time.time() - start_time
        
        # Display final summary
        self._display_final_summary()
        
        return self.stats
    
    async def _clone_or_update_repo(self, repo_url: str, local_path: Path) -> git.Repo:
        """Clone repository or update if exists"""
        if local_path.exists() and (local_path / ".git").exists():
            console.print(f"[yellow]Repository exists at {local_path}[/yellow]")
            console.print("[dim]Pulling latest changes...[/dim]")
            repo = git.Repo(local_path)
            
            # Show current commit
            current_commit = repo.head.commit
            console.print(f"[dim]Current commit: {current_commit.hexsha[:8]} - {current_commit.summary}[/dim]")
            
            # Pull changes
            origin = repo.remotes.origin
            fetch_info = origin.pull()
            
            if fetch_info:
                new_commit = repo.head.commit
                if current_commit != new_commit:
                    console.print(f"[green]Updated to: {new_commit.hexsha[:8]} - {new_commit.summary}[/green]")
                else:
                    console.print("[dim]Already up to date[/dim]")
        else:
            console.print(f"[cyan]Cloning repository to {local_path}...[/cyan]")
            repo = git.Repo.clone_from(repo_url, local_path, progress=GitProgress())
            console.print("[green]✓ Repository cloned successfully[/green]")
            
            # Show clone info
            commit = repo.head.commit
            console.print(f"[dim]Cloned at: {commit.hexsha[:8]} - {commit.summary}[/dim]")
        
        # Show repository stats
        total_commits = len(list(repo.iter_commits()))
        console.print(f"[dim]Total commits: {total_commits}[/dim]")
        
        return repo
    
    async def _extract_chunks_with_progress(self, repo_path: Path, progress: Progress, task_id: TaskID) -> List[DocumentChunk]:
        """Extract documentation and code chunks from repository with detailed progress"""
        chunks = []
        
        # Count files first
        console.print("\n[cyan]Scanning repository structure...[/cyan]")
        dart_files = list(repo_path.glob("**/*.dart"))
        md_files = list(repo_path.glob("**/*.md"))
        mdx_files = list(repo_path.glob("**/*.mdx"))
        json_files = list(repo_path.glob("**/*.json"))
        yaml_files = list(repo_path.glob("**/*.yaml")) + list(repo_path.glob("**/*.yml"))
        
        # Additional file types for dev documentation
        rust_files = list(repo_path.glob("**/*.rs"))
        js_files = list(repo_path.glob("**/*.js"))
        ts_files = list(repo_path.glob("**/*.ts"))
        svelte_files = list(repo_path.glob("**/*.svelte"))
        html_files = list(repo_path.glob("**/*.html"))
        
        # Filter files (apply filtering to all file types)
        dart_files = [f for f in dart_files if self._should_process_file(f)]
        json_files = [f for f in json_files if self._should_process_file(f)]
        yaml_files = [f for f in yaml_files if self._should_process_file(f)]
        rust_files = [f for f in rust_files if self._should_process_file(f)]
        js_files = [f for f in js_files if self._should_process_file(f)]
        ts_files = [f for f in ts_files if self._should_process_file(f)]
        svelte_files = [f for f in svelte_files if self._should_process_file(f)]
        html_files = [f for f in html_files if self._should_process_file(f)]
        
        total_files = (len(dart_files) + len(md_files) + len(mdx_files) + len(json_files) + len(yaml_files) + 
                      len(rust_files) + len(js_files) + len(ts_files) + len(svelte_files) + len(html_files))
        
        # Display file counts
        file_table = Table(title="Files to Process", show_header=True)
        file_table.add_column("Type", style="cyan")
        file_table.add_column("Count", justify="right")
        file_table.add_column("Status", style="dim")
        
        file_table.add_row("Dart files", str(len(dart_files)), "✓ Ready")
        file_table.add_row("Markdown files", str(len(md_files)), "✓ Ready")
        file_table.add_row("MDX files", str(len(mdx_files)), "✓ Ready")
        file_table.add_row("JSON files", str(len(json_files)), "✓ Ready")
        file_table.add_row("YAML files", str(len(yaml_files)), "✓ Ready")
        file_table.add_row("Rust files", str(len(rust_files)), "✓ Ready")
        file_table.add_row("JavaScript files", str(len(js_files)), "✓ Ready")
        file_table.add_row("TypeScript files", str(len(ts_files)), "✓ Ready")
        file_table.add_row("Svelte files", str(len(svelte_files)), "✓ Ready")
        file_table.add_row("HTML files", str(len(html_files)), "✓ Ready")
        file_table.add_row("[bold]Total", f"[bold]{total_files}", "[bold]✓ Ready")
        
        console.print(file_table)
        console.print()
        
        # Update progress task
        progress.update(task_id, total=total_files)
        
        # Process files with sub-progress
        processed = 0
        
        # Process Dart files
        console.print("[cyan]Processing Dart files...[/cyan]")
        for i, file_path in enumerate(dart_files):
            try:
                progress.update(task_id, description=f"[cyan]Processing: {file_path.name}")
                file_chunks = await self._extract_dart_chunks(file_path, repo_path)
                chunks.extend(file_chunks)
                
                if file_chunks:
                    console.print(f"  [green]✓[/green] {file_path.relative_to(repo_path)} → {len(file_chunks)} chunks")
                
                processed += 1
                progress.update(task_id, advance=1)
                
            except Exception as e:
                self.stats.warnings.append(f"Failed to process {file_path}: {e}")
                console.print(f"  [red]✗[/red] {file_path.relative_to(repo_path)} → Error: {str(e)[:50]}...")
        
        # Process Markdown files
        console.print("\n[cyan]Processing Markdown files...[/cyan]")
        for file_path in md_files:
            try:
                progress.update(task_id, description=f"[cyan]Processing: {file_path.name}")
                file_chunks = await self._extract_markdown_chunks(file_path, repo_path)
                chunks.extend(file_chunks)
                
                if file_chunks:
                    console.print(f"  [green]✓[/green] {file_path.relative_to(repo_path)} → {len(file_chunks)} sections")
                
                processed += 1
                progress.update(task_id, advance=1)
                
            except Exception as e:
                self.stats.warnings.append(f"Failed to process {file_path}: {e}")
                console.print(f"  [red]✗[/red] {file_path.relative_to(repo_path)} → Error: {str(e)[:50]}...")
        
        # Process MDX files
        if mdx_files:
            console.print("\n[cyan]Processing MDX files...[/cyan]")
            for file_path in mdx_files:
                try:
                    progress.update(task_id, description=f"[cyan]Processing: {file_path.name}")
                    file_chunks = await self._extract_markdown_chunks(file_path, repo_path)  # MDX can be processed as markdown
                    chunks.extend(file_chunks)
                    
                    if file_chunks:
                        console.print(f"  [green]✓[/green] {file_path.relative_to(repo_path)} → {len(file_chunks)} sections")
                    
                    processed += 1
                    progress.update(task_id, advance=1)
                    
                except Exception as e:
                    self.stats.warnings.append(f"Failed to process {file_path}: {e}")
                    console.print(f"  [red]✗[/red] {file_path.relative_to(repo_path)} → Error: {str(e)[:50]}...")
        
        # Process JSON files
        if json_files:
            console.print("\n[cyan]Processing JSON files...[/cyan]")
            for file_path in json_files:
                try:
                    progress.update(task_id, description=f"[cyan]Processing: {file_path.name}")
                    file_chunks = await self._extract_json_chunks(file_path, repo_path)
                    chunks.extend(file_chunks)
                    
                    if file_chunks:
                        console.print(f"  [green]✓[/green] {file_path.relative_to(repo_path)} → {len(file_chunks)} definitions")
                    
                    processed += 1
                    progress.update(task_id, advance=1)
                    
                except Exception as e:
                    self.stats.warnings.append(f"Failed to process {file_path}: {e}")
                    console.print(f"  [red]✗[/red] {file_path.relative_to(repo_path)} → Error: {str(e)[:50]}...")
        
        # Process YAML files
        if yaml_files:
            console.print("\n[cyan]Processing YAML files...[/cyan]")
            for file_path in yaml_files:
                try:
                    progress.update(task_id, description=f"[cyan]Processing: {file_path.name}")
                    file_chunks = await self._extract_yaml_chunks(file_path, repo_path)
                    chunks.extend(file_chunks)
                    
                    if file_chunks:
                        console.print(f"  [green]✓[/green] {file_path.relative_to(repo_path)} → {len(file_chunks)} sections")
                    
                    processed += 1
                    progress.update(task_id, advance=1)
                    
                except Exception as e:
                    self.stats.warnings.append(f"Failed to process {file_path}: {e}")
                    console.print(f"  [red]✗[/red] {file_path.relative_to(repo_path)} → Error: {str(e)[:50]}...")
        
        # Process Rust files
        if rust_files:
            console.print("\n[cyan]Processing Rust files...[/cyan]")
            for file_path in rust_files:
                try:
                    progress.update(task_id, description=f"[cyan]Processing: {file_path.name}")
                    file_chunks = await self._extract_rust_chunks(file_path, repo_path)
                    chunks.extend(file_chunks)
                    
                    if file_chunks:
                        console.print(f"  [green]✓[/green] {file_path.relative_to(repo_path)} → {len(file_chunks)} chunks")
                    
                    processed += 1
                    progress.update(task_id, advance=1)
                    
                except Exception as e:
                    self.stats.warnings.append(f"Failed to process {file_path}: {e}")
                    console.print(f"  [red]✗[/red] {file_path.relative_to(repo_path)} → Error: {str(e)[:50]}...")
        
        # Process JavaScript files
        if js_files:
            console.print("\n[cyan]Processing JavaScript files...[/cyan]")
            for file_path in js_files:
                try:
                    progress.update(task_id, description=f"[cyan]Processing: {file_path.name}")
                    file_chunks = await self._extract_js_chunks(file_path, repo_path)
                    chunks.extend(file_chunks)
                    
                    if file_chunks:
                        console.print(f"  [green]✓[/green] {file_path.relative_to(repo_path)} → {len(file_chunks)} chunks")
                    
                    processed += 1
                    progress.update(task_id, advance=1)
                    
                except Exception as e:
                    self.stats.warnings.append(f"Failed to process {file_path}: {e}")
                    console.print(f"  [red]✗[/red] {file_path.relative_to(repo_path)} → Error: {str(e)[:50]}...")
        
        # Process TypeScript files
        if ts_files:
            console.print("\n[cyan]Processing TypeScript files...[/cyan]")
            for file_path in ts_files:
                try:
                    progress.update(task_id, description=f"[cyan]Processing: {file_path.name}")
                    file_chunks = await self._extract_ts_chunks(file_path, repo_path)
                    chunks.extend(file_chunks)
                    
                    if file_chunks:
                        console.print(f"  [green]✓[/green] {file_path.relative_to(repo_path)} → {len(file_chunks)} chunks")
                    
                    processed += 1
                    progress.update(task_id, advance=1)
                    
                except Exception as e:
                    self.stats.warnings.append(f"Failed to process {file_path}: {e}")
                    console.print(f"  [red]✗[/red] {file_path.relative_to(repo_path)} → Error: {str(e)[:50]}...")
        
        # Process Svelte files
        if svelte_files:
            console.print("\n[cyan]Processing Svelte files...[/cyan]")
            for file_path in svelte_files:
                try:
                    progress.update(task_id, description=f"[cyan]Processing: {file_path.name}")
                    file_chunks = await self._extract_svelte_chunks(file_path, repo_path)
                    chunks.extend(file_chunks)
                    
                    if file_chunks:
                        console.print(f"  [green]✓[/green] {file_path.relative_to(repo_path)} → {len(file_chunks)} chunks")
                    
                    processed += 1
                    progress.update(task_id, advance=1)
                    
                except Exception as e:
                    self.stats.warnings.append(f"Failed to process {file_path}: {e}")
                    console.print(f"  [red]✗[/red] {file_path.relative_to(repo_path)} → Error: {str(e)[:50]}...")
        
        # Process HTML files
        if html_files:
            console.print("\n[cyan]Processing HTML files...[/cyan]")
            for file_path in html_files:
                try:
                    progress.update(task_id, description=f"[cyan]Processing: {file_path.name}")
                    file_chunks = await self._extract_html_chunks(file_path, repo_path)
                    chunks.extend(file_chunks)
                    
                    if file_chunks:
                        console.print(f"  [green]✓[/green] {file_path.relative_to(repo_path)} → {len(file_chunks)} chunks")
                    
                    processed += 1
                    progress.update(task_id, advance=1)
                    
                except Exception as e:
                    self.stats.warnings.append(f"Failed to process {file_path}: {e}")
                    console.print(f"  [red]✗[/red] {file_path.relative_to(repo_path)} → Error: {str(e)[:50]}...")
        
        # Update stats
        self.stats.repository.dart_files = len(dart_files) + len(rust_files) + len(js_files) + len(ts_files) + len(svelte_files)
        self.stats.repository.md_files = len(md_files) + len(mdx_files)  # Combined MD and MDX
        self.stats.repository.json_files = len(json_files)
        self.stats.repository.total_files = processed
        
        return chunks
    
    def _should_process_file(self, file_path: Path) -> bool:
        """Check if file should be processed"""
        # Skip test files unless explicitly included
        if not self.config.include_tests and "test" in str(file_path):
            return False
            
        # Skip generated files unless explicitly included
        if not self.config.include_generated and file_path.suffix == ".g.dart":
            return False
            
        # Skip example files if they're in example directories
        if "example" in str(file_path) and not self.config.include_tests:
            return False
            
        return True
    
    async def _extract_dart_chunks(self, file_path: Path, repo_path: Path) -> List[DocumentChunk]:
        """Extract chunks from Dart files"""
        chunks = []
        
        content = file_path.read_text(encoding="utf-8")
        relative_path = str(file_path.relative_to(repo_path))
        
        # Count elements
        class_count = len(re.findall(r'(?:abstract\s+)?class\s+\w+', content))
        function_count = len(re.findall(r'(?:Future<[\w<>\?,]+>\s+|[\w<>\?]+\s+)?\w+\s*\([^)]*\)\s*(?:async\s*)?{', content))
        
        # Extract classes
        class_pattern = r'(?:\/\/\/.*\n)*(?:@\w+\n)*(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?(?:\s+with\s+[\w,\s]+)?\s*{'
        for match in re.finditer(class_pattern, content):
            class_name = match.group(1)
            start = match.start()
            
            # Find class documentation
            doc_start = start
            while doc_start > 0 and content[doc_start-1:doc_start] != '\n':
                doc_start -= 1
            
            # Extract documentation comments
            doc_lines = []
            for line in content[doc_start:start].split('\n'):
                if line.strip().startswith('///'):
                    doc_lines.append(line.strip()[3:].strip())
            
            documentation = '\n'.join(doc_lines)
            
            # Find class end
            brace_count = 1
            pos = match.end()
            class_end = pos
            
            while brace_count > 0 and pos < len(content):
                if content[pos] == '{':
                    brace_count += 1
                elif content[pos] == '}':
                    brace_count -= 1
                pos += 1
                if brace_count == 0:
                    class_end = pos
            
            # Get class code (limited)
            code = content[start:min(class_end, start + self.config.max_code_length)]
            if class_end > start + self.config.max_code_length:
                code += "\n// ... (truncated)"
            
            metadata = ChunkMetadata(
                type="class",
                name=class_name,
                file_path=relative_path,
                signature=f"class {class_name}",
                code=code,
                line_start=content[:start].count('\n') + 1,
                line_end=content[:class_end].count('\n') + 1
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
        
        # Extract functions
        function_pattern = r'(?:\/\/\/.*\n)*(?:@\w+\n)*(?:static\s+)?(?:Future<[\w<>\?,]+>\s+|[\w<>\?]+\s+)?(\w+)\s*\([^)]*\)\s*(?:async\s*)?{'
        for match in re.finditer(function_pattern, content):
            func_name = match.group(1)
            
            # Skip constructors and common methods
            if func_name in ['build', 'initState', 'dispose', 'setState']:
                continue
            
            start = match.start()
            
            # Extract documentation
            doc_start = start
            while doc_start > 0 and content[doc_start-1:doc_start] != '\n':
                doc_start -= 1
            
            doc_lines = []
            for line in content[doc_start:start].split('\n'):
                if line.strip().startswith('///'):
                    doc_lines.append(line.strip()[3:].strip())
            
            documentation = '\n'.join(doc_lines)
            
            # Extract signature
            sig_match = re.search(r'[^\n]+\s+' + re.escape(func_name) + r'\s*\([^)]*\)', content[start:])
            signature = sig_match.group(0) if sig_match else f"function {func_name}"
            
            metadata = ChunkMetadata(
                type="function",
                name=func_name,
                file_path=relative_path,
                signature=signature.strip(),
                code="",
                line_start=content[:start].count('\n') + 1
            )
            
            chunk = DocumentChunk(
                type="function",
                name=func_name,
                file_path=relative_path,
                documentation=documentation[:self.config.max_doc_length],
                code="",
                signature=signature.strip(),
                metadata=metadata
            )
            
            chunks.append(chunk)
        
        return chunks
    
    async def _extract_markdown_chunks(self, file_path: Path, repo_path: Path) -> List[DocumentChunk]:
        """Extract chunks from Markdown files"""
        chunks = []
        
        content = file_path.read_text(encoding="utf-8")
        relative_path = str(file_path.relative_to(repo_path))
        
        # Extract sections
        section_pattern = r'^(#{1,3})\s+(.+)$'
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            match = re.match(section_pattern, line)
            if match:
                level = len(match.group(1))
                title = match.group(2).strip()
                
                # Find section content
                section_lines = []
                j = i + 1
                while j < len(lines):
                    next_match = re.match(section_pattern, lines[j])
                    if next_match and len(next_match.group(1)) <= level:
                        break
                    section_lines.append(lines[j])
                    j += 1
                
                documentation = '\n'.join(section_lines).strip()
                
                # Skip empty sections
                if not documentation:
                    continue
                
                metadata = ChunkMetadata(
                    type="documentation",
                    name=title,
                    file_path=relative_path,
                    signature=title,
                    code="",
                    line_start=i + 1,
                    line_end=j
                )
                
                chunk = DocumentChunk(
                    type="documentation",
                    name=title,
                    file_path=relative_path,
                    documentation=documentation[:self.config.max_doc_length],
                    code="",
                    signature=title,
                    metadata=metadata
                )
                
                chunks.append(chunk)
        
        return chunks
    
    async def _extract_json_chunks(self, file_path: Path, repo_path: Path) -> List[DocumentChunk]:
        """Extract chunks from JSON lexicon files"""
        chunks = []
        
        try:
            content = json.loads(file_path.read_text(encoding="utf-8"))
            relative_path = str(file_path.relative_to(repo_path))
            
            # Extract lexicon ID and description
            lexicon_id = content.get('id', file_path.stem)
            description = content.get('description', '')
            
            # Create main lexicon chunk
            metadata = ChunkMetadata(
                type="lexicon",
                name=lexicon_id,
                file_path=relative_path,
                signature=f"Lexicon: {lexicon_id}",
                code=json.dumps(content, indent=2)[:self.config.max_code_length]
            )
            
            chunk = DocumentChunk(
                type="lexicon",
                name=lexicon_id,
                file_path=relative_path,
                documentation=description,
                code=json.dumps(content, indent=2)[:self.config.max_code_length],
                signature=f"Lexicon: {lexicon_id}",
                metadata=metadata
            )
            
            chunks.append(chunk)
            
            # Extract method definitions if present
            if 'defs' in content:
                for def_name, def_content in content['defs'].items():
                    if isinstance(def_content, dict) and 'description' in def_content:
                        method_metadata = ChunkMetadata(
                            type="lexicon",
                            name=f"{lexicon_id}#{def_name}",
                            file_path=relative_path,
                            signature=f"{lexicon_id}#{def_name}",
                            code=json.dumps(def_content, indent=2)[:self.config.max_code_length]
                        )
                        
                        method_chunk = DocumentChunk(
                            type="lexicon",
                            name=f"{lexicon_id}#{def_name}",
                            file_path=relative_path,
                            documentation=def_content.get('description', ''),
                            code=json.dumps(def_content, indent=2)[:self.config.max_code_length],
                            signature=f"{lexicon_id}#{def_name}",
                            metadata=method_metadata
                        )
                        
                        chunks.append(method_chunk)
        
        except Exception as e:
            self.stats.warnings.append(f"Failed to parse JSON {file_path}: {e}")
        
        return chunks
    
    async def _extract_yaml_chunks(self, file_path: Path, repo_path: Path) -> List[DocumentChunk]:
        """Extract chunks from YAML configuration files"""
        chunks = []
        
        try:
            content_str = file_path.read_text(encoding="utf-8")
            content = yaml.safe_load(content_str)
            relative_path = str(file_path.relative_to(repo_path))
            
            # Get file name without extension as the main identifier
            file_id = file_path.stem
            
            # Create main YAML file chunk
            metadata = ChunkMetadata(
                type="yaml_config",
                name=file_id,
                file_path=relative_path,
                signature=f"YAML Config: {file_id}",
                code=content_str[:self.config.max_code_length]
            )
            
            chunk = DocumentChunk(
                type="yaml_config",
                name=file_id,
                file_path=relative_path,
                documentation=f"YAML configuration file: {file_path.name}",
                code=content_str[:self.config.max_code_length],
                signature=f"YAML Config: {file_id}",
                metadata=metadata
            )
            
            chunks.append(chunk)
            
            # If it's a structured YAML (like pubspec.yaml), extract sections
            if isinstance(content, dict):
                for section_name, section_content in content.items():
                    if isinstance(section_content, (dict, list)) and section_content:
                        section_metadata = ChunkMetadata(
                            type="yaml_section",
                            name=f"{file_id}.{section_name}",
                            file_path=relative_path,
                            signature=f"{file_id}.{section_name}",
                            code=yaml.dump({section_name: section_content}, default_flow_style=False)[:self.config.max_code_length]
                        )
                        
                        section_chunk = DocumentChunk(
                            type="yaml_section",
                            name=f"{file_id}.{section_name}",
                            file_path=relative_path,
                            documentation=f"Configuration section: {section_name}",
                            code=yaml.dump({section_name: section_content}, default_flow_style=False)[:self.config.max_code_length],
                            signature=f"{file_id}.{section_name}",
                            metadata=section_metadata
                        )
                        
                        chunks.append(section_chunk)
        
        except Exception as e:
            self.stats.warnings.append(f"Failed to parse YAML {file_path}: {e}")
        
        return chunks
    
    async def _vectorize_and_upload_with_details(self, chunks: List[DocumentChunk], progress: Progress, task_id: TaskID):
        """Generate embeddings and upload to Qdrant with detailed progress"""
        total_uploaded = 0
        total_batches = (len(chunks) + self.config.batch_size - 1) // self.config.batch_size
        
        console.print(f"\n[cyan]Processing {len(chunks)} chunks in {total_batches} batches[/cyan]")
        console.print(f"[dim]Batch size: {self.config.batch_size}[/dim]")
        console.print(f"[dim]Embedding model: {self.config.embedding_model}[/dim]\n")
        
        # Process in batches
        for batch_idx in range(0, len(chunks), self.config.batch_size):
            batch = chunks[batch_idx:batch_idx + self.config.batch_size]
            batch_num = batch_idx // self.config.batch_size + 1
            
            # Update progress description
            progress.update(task_id, description=f"[cyan]Batch {batch_num}/{total_batches}: Generating embeddings...")
            
            # Check memory usage
            memory_percent = psutil.virtual_memory().percent
            if memory_percent > self.config.max_memory_percent:
                console.print(f"[yellow]⚠ Memory usage high ({memory_percent:.1f}%), waiting...[/yellow]")
                await asyncio.sleep(5)
            
            try:
                # Generate embeddings
                texts = [chunk.get_embedding_text() for chunk in batch]
                
                start_embed = time.time()
                embeddings = list(self.embedding_model.embed(texts))
                embed_time = time.time() - start_embed
                
                
                progress.update(task_id, description=f"[cyan]Batch {batch_num}/{total_batches}: Uploading to Qdrant...")
                
                # Prepare points for Qdrant
                points = []
                for j, (chunk, embedding) in enumerate(zip(batch, embeddings)):
                    try:
                        point_id = hashlib.md5(
                            f"{chunk.file_path}:{chunk.name}:{chunk.type}".encode()
                        ).hexdigest()
                        
                        payload = {
                            "document": chunk.get_embedding_text(),  # この行を追加
                            "type": chunk.type,
                            "name": chunk.name,
                            "file_path": chunk.file_path,
                            "signature": chunk.signature,
                            "documentation": chunk.documentation,
                            "code": chunk.code,
                            "information": chunk.get_information_text(),
                            "metadata": chunk.metadata.model_dump()
                        }

                        # Convert embedding to list with error handling
                        if hasattr(embedding, 'tolist'):
                            vector = embedding.tolist()
                        elif hasattr(embedding, '__iter__'):
                            vector = list(embedding)
                        else:
                            raise ValueError(f"Cannot convert embedding to list: type={type(embedding)}")
                        
                        points.append(models.PointStruct(
                            id=point_id,
                            vector={"fast-bge-small-en-v1.5": vector},
                            payload=payload
                        ))
                    except Exception as inner_e:
                        console.print(f"[red]Error processing chunk {j}: {inner_e}[/red]")
                        raise
                
                # Upload to Qdrant
                start_upload = time.time()
                await self._upload_batch(points)
                upload_time = time.time() - start_upload
                
                total_uploaded += len(points)
                
                # Update progress
                progress.update(task_id, advance=len(batch))
                
                # Display batch summary
                console.print(
                    f"  [green]✓[/green] Batch {batch_num}/{total_batches}: "
                    f"{len(batch)} chunks | "
                    f"Embed: {embed_time:.2f}s | "
                    f"Upload: {upload_time:.2f}s | "
                    f"Total: {total_uploaded}/{len(chunks)}"
                )
                
            except Exception as e:
                self.stats.errors.append(f"Failed to process batch {batch_num}: {e}")
                console.print(f"  [red]✗ Batch {batch_num} failed: {str(e)}[/red]")
        
        self.stats.chunks_uploaded = total_uploaded
        console.print(f"\n[green]✓ Upload complete: {total_uploaded} chunks uploaded to Qdrant[/green]")
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def _upload_batch(self, points: List[models.PointStruct]):
        """Upload batch of points to Qdrant with retry logic"""
        self.client.upsert(
            collection_name=self.config.collection_name,
            points=points
        )
    
    def _display_extraction_summary(self):
        """Display summary of extraction phase"""
        summary_table = Table(title="Extraction Summary", show_header=True)
        summary_table.add_column("Type", style="cyan")
        summary_table.add_column("Count", justify="right")
        
        # Count chunk types (we need access to the actual chunks, not just the count)
        chunk_types = {}
        if hasattr(self, '_extracted_chunks') and self._extracted_chunks:
            for chunk in self._extracted_chunks:
                chunk_types[chunk.type] = chunk_types.get(chunk.type, 0) + 1
        
        for chunk_type, count in chunk_types.items():
            summary_table.add_row(chunk_type.capitalize(), str(count))
        
        if chunk_types:
            summary_table.add_row("[bold]Total Chunks", f"[bold]{sum(chunk_types.values())}")
        else:
            summary_table.add_row("No chunks", "0")
        
        console.print(summary_table)
    
    def _display_final_summary(self):
        """Display final processing summary"""
        console.print("\n" + "=" * 80)
        
        # Create summary panel
        summary_text = f"""[bold green]✓ Vectorization Complete![/bold green]

[cyan]Repository:[/cyan] {self.stats.repository.url}
[cyan]Commit:[/cyan] {self.stats.repository.commit_hash}
[cyan]Processing Time:[/cyan] {self.stats.processing_time:.2f} seconds

[bold]Files Processed:[/bold]
  • Dart files: {self.stats.repository.dart_files}
  • Markdown files: {self.stats.repository.md_files}
  • JSON files: {self.stats.repository.json_files}
  • Total: {self.stats.repository.total_files}

[bold]Results:[/bold]
  • Chunks created: {self.stats.chunks_created}
  • Chunks uploaded: {self.stats.chunks_uploaded}
  • Errors: {len(self.stats.errors)}
  • Warnings: {len(self.stats.warnings)}"""
        
        console.print(Panel(
            summary_text,
            title="📊 Vectorization Summary",
            border_style="green"
        ))
        
        # Show errors if any
        if self.stats.errors:
            console.print("\n[bold red]Errors:[/bold red]")
            for error in self.stats.errors[:5]:  # Show first 5 errors
                console.print(f"  [red]• {error}[/red]")
            if len(self.stats.errors) > 5:
                console.print(f"  [dim]... and {len(self.stats.errors) - 5} more errors[/dim]")
        
        # Show warnings if any
        if self.stats.warnings:
            console.print("\n[bold yellow]Warnings:[/bold yellow]")
            for warning in self.stats.warnings[:5]:  # Show first 5 warnings
                console.print(f"  [yellow]• {warning}[/yellow]")
            if len(self.stats.warnings) > 5:
                console.print(f"  [dim]... and {len(self.stats.warnings) - 5} more warnings[/dim]")
    
    async def test_search(self, query: str, limit: int = 5):
        """Test search functionality"""
        try:
            console.print(f"\n[cyan]Searching for: '{query}'...[/cyan]")
            
            # Generate query embedding
            start_time = time.time()
            query_embedding = list(self.embedding_model.embed([query]))[0]
            embed_time = time.time() - start_time
            
            console.print(f"[dim]Embedding generated in {embed_time:.3f}s[/dim]")
            
            # Search in Qdrant
            start_time = time.time()
            results = self.client.search(
                collection_name=self.config.collection_name,
                query_vector=query_embedding.tolist(),
                limit=limit
            )
            search_time = time.time() - start_time
            
            console.print(f"[dim]Search completed in {search_time:.3f}s[/dim]\n")
            
            # Display results
            console.print(Panel.fit(
                f"[bold]Search Results[/bold]\nQuery: '{query}'\nResults: {len(results)}",
                border_style="cyan"
            ))
            
            for i, result in enumerate(results):
                payload = result.payload
                
                # Create result panel
                result_text = f"""[yellow]Type:[/yellow] {payload.get('type', 'N/A')}
[yellow]Name:[/yellow] {payload.get('name', 'N/A')}
[yellow]File:[/yellow] {payload.get('file_path', 'N/A')}
[yellow]Score:[/yellow] {result.score:.4f}

[yellow]Signature:[/yellow]
{payload.get('signature', 'N/A')}"""
                
                if payload.get('documentation'):
                    doc = payload['documentation']
                    if len(doc) > 200:
                        doc = doc[:200] + "..."
                    result_text += f"\n\n[yellow]Documentation:[/yellow]\n{doc}"
                
                console.print(Panel(
                    result_text,
                    title=f"Result {i+1}",
                    border_style="blue" if i == 0 else "dim"
                ))
        
        except Exception as e:
            console.print(f"[red]Search failed: {e}[/red]")

    async def _extract_rust_chunks(self, file_path: Path, repo_path: Path) -> List[DocumentChunk]:
        """Extract chunks from Rust files"""
        chunks = []
        try:
            content = file_path.read_text(encoding='utf-8')
            relative_path = str(file_path.relative_to(repo_path))
            
            # Simple function/struct/impl extraction for Rust
            patterns = [
                (r'pub\s+fn\s+(\w+)\s*\([^{]*\)\s*(?:->\s*[^{]+)?\s*{', 'function'),
                (r'fn\s+(\w+)\s*\([^{]*\)\s*(?:->\s*[^{]+)?\s*{', 'function'),
                (r'pub\s+struct\s+(\w+)', 'struct'),
                (r'struct\s+(\w+)', 'struct'),
                (r'impl\s+(?:<[^>]*>\s+)?(\w+)', 'implementation'),
                (r'pub\s+enum\s+(\w+)', 'enum'),
                (r'enum\s+(\w+)', 'enum'),
            ]
            
            for pattern, chunk_type in patterns:
                for match in re.finditer(pattern, content, re.MULTILINE):
                    name = match.group(1)
                    start_pos = match.start()
                    
                    # Find the end of the function/struct/impl
                    brace_count = 0
                    end_pos = start_pos
                    found_opening = False
                    
                    for i in range(start_pos, len(content)):
                        if content[i] == '{':
                            if not found_opening:
                                found_opening = True
                            brace_count += 1
                        elif content[i] == '}':
                            brace_count -= 1
                            if found_opening and brace_count == 0:
                                end_pos = i + 1
                                break
                    
                    if found_opening:
                        code_block = content[start_pos:end_pos]
                        
                        # Extract documentation (preceding comments)
                        doc_lines = []
                        lines = content[:start_pos].split('\n')
                        for line in reversed(lines[-10:]):
                            stripped = line.strip()
                            if stripped.startswith('///') or stripped.startswith('//!'):
                                doc_lines.insert(0, stripped[3:].strip())
                            elif stripped.startswith('/*') or stripped.startswith('*/'):
                                continue
                            elif stripped == '':
                                continue
                            else:
                                break
                        
                        documentation = '\n'.join(doc_lines)
                        
                        # Create chunk
                        metadata = ChunkMetadata(
                            type=chunk_type,
                            name=name,
                            file_path=relative_path,
                            signature=match.group(0),
                            code=code_block,
                            line_start=content[:start_pos].count('\n') + 1,
                            line_end=content[:end_pos].count('\n') + 1
                        )
                        
                        chunk = DocumentChunk(
                            type=chunk_type,
                            name=name,
                            file_path=relative_path,
                            documentation=documentation,
                            code=code_block,
                            signature=match.group(0),
                            metadata=metadata
                        )
                        chunks.append(chunk)
                        
        except Exception as e:
            console.print(f"[red]Error processing Rust file {file_path}: {e}[/red]")
            
        return chunks

    async def _extract_js_chunks(self, file_path: Path, repo_path: Path) -> List[DocumentChunk]:
        """Extract chunks from JavaScript files"""
        chunks = []
        try:
            content = file_path.read_text(encoding='utf-8')
            relative_path = str(file_path.relative_to(repo_path))
            
            # Simple function/class extraction for JavaScript
            patterns = [
                (r'export\s+function\s+(\w+)\s*\([^{]*\)\s*{', 'function'),
                (r'function\s+(\w+)\s*\([^{]*\)\s*{', 'function'),
                (r'const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*{', 'arrow_function'),
                (r'export\s+class\s+(\w+)', 'class'),
                (r'class\s+(\w+)', 'class'),
                (r'export\s+const\s+(\w+)\s*=', 'constant'),
            ]
            
            for pattern, chunk_type in patterns:
                for match in re.finditer(pattern, content, re.MULTILINE):
                    name = match.group(1)
                    start_pos = match.start()
                    
                    # Find the end of the function/class
                    brace_count = 0
                    end_pos = start_pos
                    found_opening = False
                    
                    for i in range(start_pos, len(content)):
                        if content[i] == '{':
                            if not found_opening:
                                found_opening = True
                            brace_count += 1
                        elif content[i] == '}':
                            brace_count -= 1
                            if found_opening and brace_count == 0:
                                end_pos = i + 1
                                break
                    
                    if found_opening:
                        code_block = content[start_pos:end_pos]
                        
                        # Extract JSDoc comments
                        doc_lines = []
                        lines = content[:start_pos].split('\n')
                        for line in reversed(lines[-10:]):
                            stripped = line.strip()
                            if stripped.startswith('*') and not stripped.startswith('*/'):
                                doc_lines.insert(0, stripped[1:].strip())
                            elif stripped.startswith('/**'):
                                break
                            elif stripped == '':
                                continue
                            else:
                                break
                        
                        documentation = '\n'.join(doc_lines)
                        
                        metadata = ChunkMetadata(
                            type=chunk_type,
                            name=name,
                            file_path=relative_path,
                            signature=match.group(0),
                            code=code_block,
                            line_start=content[:start_pos].count('\n') + 1,
                            line_end=content[:end_pos].count('\n') + 1
                        )
                        
                        chunk = DocumentChunk(
                            type=chunk_type,
                            name=name,
                            file_path=relative_path,
                            documentation=documentation,
                            code=code_block,
                            signature=match.group(0),
                            metadata=metadata
                        )
                        chunks.append(chunk)
                        
        except Exception as e:
            console.print(f"[red]Error processing JavaScript file {file_path}: {e}[/red]")
            
        return chunks

    async def _extract_ts_chunks(self, file_path: Path, repo_path: Path) -> List[DocumentChunk]:
        """Extract chunks from TypeScript files"""
        chunks = []
        try:
            content = file_path.read_text(encoding='utf-8')
            relative_path = str(file_path.relative_to(repo_path))
            
            # TypeScript patterns with type annotations
            patterns = [
                (r'export\s+function\s+(\w+)\s*\([^{]*\)\s*:\s*[^{]+\s*{', 'function'),
                (r'function\s+(\w+)\s*\([^{]*\)\s*:\s*[^{]+\s*{', 'function'),
                (r'export\s+function\s+(\w+)\s*\([^{]*\)\s*{', 'function'),
                (r'function\s+(\w+)\s*\([^{]*\)\s*{', 'function'),
                (r'export\s+class\s+(\w+)', 'class'),
                (r'class\s+(\w+)', 'class'),
                (r'export\s+interface\s+(\w+)', 'interface'),
                (r'interface\s+(\w+)', 'interface'),
                (r'export\s+type\s+(\w+)', 'type'),
                (r'type\s+(\w+)', 'type'),
            ]
            
            for pattern, chunk_type in patterns:
                for match in re.finditer(pattern, content, re.MULTILINE):
                    name = match.group(1)
                    start_pos = match.start()
                    
                    # For interfaces and types, look for the end differently
                    if chunk_type in ['interface', 'type']:
                        # Find end by looking for the closing brace or semicolon
                        brace_count = 0
                        end_pos = start_pos
                        found_opening = False
                        
                        for i in range(start_pos, len(content)):
                            if content[i] == '{':
                                if not found_opening:
                                    found_opening = True
                                brace_count += 1
                            elif content[i] == '}':
                                brace_count -= 1
                                if found_opening and brace_count == 0:
                                    end_pos = i + 1
                                    break
                            elif content[i] == ';' and not found_opening:
                                end_pos = i + 1
                                break
                    else:
                        # Functions and classes
                        brace_count = 0
                        end_pos = start_pos
                        found_opening = False
                        
                        for i in range(start_pos, len(content)):
                            if content[i] == '{':
                                if not found_opening:
                                    found_opening = True
                                brace_count += 1
                            elif content[i] == '}':
                                brace_count -= 1
                                if found_opening and brace_count == 0:
                                    end_pos = i + 1
                                    break
                    
                    if end_pos > start_pos:
                        code_block = content[start_pos:end_pos]
                        
                        # Extract TSDoc comments
                        doc_lines = []
                        lines = content[:start_pos].split('\n')
                        for line in reversed(lines[-10:]):
                            stripped = line.strip()
                            if stripped.startswith('*') and not stripped.startswith('*/'):
                                doc_lines.insert(0, stripped[1:].strip())
                            elif stripped.startswith('/**'):
                                break
                            elif stripped == '':
                                continue
                            else:
                                break
                        
                        documentation = '\n'.join(doc_lines)
                        
                        metadata = ChunkMetadata(
                            type=chunk_type,
                            name=name,
                            file_path=relative_path,
                            signature=match.group(0),
                            code=code_block,
                            line_start=content[:start_pos].count('\n') + 1,
                            line_end=content[:end_pos].count('\n') + 1
                        )
                        
                        chunk = DocumentChunk(
                            type=chunk_type,
                            name=name,
                            file_path=relative_path,
                            documentation=documentation,
                            code=code_block,
                            signature=match.group(0),
                            metadata=metadata
                        )
                        chunks.append(chunk)
                        
        except Exception as e:
            console.print(f"[red]Error processing TypeScript file {file_path}: {e}[/red]")
            
        return chunks

    async def _extract_svelte_chunks(self, file_path: Path, repo_path: Path) -> List[DocumentChunk]:
        """Extract chunks from Svelte files"""
        chunks = []
        try:
            content = file_path.read_text(encoding='utf-8')
            relative_path = str(file_path.relative_to(repo_path))
            
            # Extract script section
            script_match = re.search(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
            if script_match:
                script_content = script_match.group(1)
                
                # Extract functions from script section
                function_patterns = [
                    (r'export\s+function\s+(\w+)\s*\([^{]*\)\s*{', 'function'),
                    (r'function\s+(\w+)\s*\([^{]*\)\s*{', 'function'),
                    (r'const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*{', 'arrow_function'),
                ]
                
                for pattern, chunk_type in function_patterns:
                    for match in re.finditer(pattern, script_content, re.MULTILINE):
                        name = match.group(1)
                        
                        metadata = ChunkMetadata(
                            type=chunk_type,
                            name=name,
                            file_path=relative_path,
                            signature=match.group(0),
                            code=match.group(0)
                        )
                        
                        chunk = DocumentChunk(
                            type=chunk_type,
                            name=name,
                            file_path=relative_path,
                            documentation=f"Svelte component function: {name}",
                            code=match.group(0),
                            signature=match.group(0),
                            metadata=metadata
                        )
                        chunks.append(chunk)
            
            # Extract component as a whole
            component_name = file_path.stem
            metadata = ChunkMetadata(
                type='component',
                name=component_name,
                file_path=relative_path,
                signature=f"<{component_name}>",
                code=content
            )
            
            chunk = DocumentChunk(
                type='component',
                name=component_name,
                file_path=relative_path,
                documentation=f"Svelte component: {component_name}",
                code=content[:500] + "..." if len(content) > 500 else content,
                signature=f"<{component_name}>",
                metadata=metadata
            )
            chunks.append(chunk)
                        
        except Exception as e:
            console.print(f"[red]Error processing Svelte file {file_path}: {e}[/red]")
            
        return chunks

    async def _extract_html_chunks(self, file_path: Path, repo_path: Path) -> List[DocumentChunk]:
        """Extract chunks from HTML files"""
        chunks = []
        try:
            content = file_path.read_text(encoding='utf-8')
            relative_path = str(file_path.relative_to(repo_path))
            
            # Extract script sections
            script_matches = re.finditer(r'<script[^>]*>(.*?)</script>', content, re.DOTALL)
            for i, match in enumerate(script_matches):
                script_content = match.group(1).strip()
                if script_content:
                    metadata = ChunkMetadata(
                        type='script',
                        name=f"script_{i+1}",
                        file_path=relative_path,
                        signature="<script>",
                        code=script_content
                    )
                    
                    chunk = DocumentChunk(
                        type='script',
                        name=f"script_{i+1}",
                        file_path=relative_path,
                        documentation=f"JavaScript code from HTML file",
                        code=script_content,
                        signature="<script>",
                        metadata=metadata
                    )
                    chunks.append(chunk)
            
            # Extract the overall HTML structure
            html_name = file_path.stem
            metadata = ChunkMetadata(
                type='html',
                name=html_name,
                file_path=relative_path,
                signature=f"{html_name}.html",
                code=content
            )
            
            chunk = DocumentChunk(
                type='html',
                name=html_name,
                file_path=relative_path,
                documentation=f"HTML file: {html_name}",
                code=content[:500] + "..." if len(content) > 500 else content,
                signature=f"{html_name}.html",
                metadata=metadata
            )
            chunks.append(chunk)
                        
        except Exception as e:
            console.print(f"[red]Error processing HTML file {file_path}: {e}[/red]")
            
        return chunks


class GitProgress(git.RemoteProgress):
    """Git progress reporter for Rich console"""
    
    def update(self, op_code, cur_count, max_count=None, message=''):
        if message:
            console.print(f"[dim]Git: {message}[/dim]")