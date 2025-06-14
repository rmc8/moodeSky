"""
Main CLI application for atproto-rag with Qdrant + FastEmbed
"""

import asyncio
import os
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from atproto_rag import VectorizationConfig, AtprotoVectorizer

app = typer.Typer(
    name="atproto-rag",
    help="AT Protocol repository vectorization for RAG with Qdrant MCP",
    rich_markup_mode="rich"
)
console = Console()

# Default repository URLs
ATPROTO_DART_URL = "https://github.com/myConsciousness/atproto.dart.git"
FLUTTER_DOCS_URL = "https://github.com/flutter/website.git"
DEFAULT_CLONE_DIR = Path.home() / ".cache" / "atproto-rag" / "repos"


@app.command()
def vectorize(
    repo_url: str = typer.Option(
        ATPROTO_DART_URL,
        "--repo-url", "-r",
        help="Repository URL to clone and vectorize"
    ),
    clone_dir: Optional[Path] = typer.Option(
        None,
        "--clone-dir", "-d",
        help="Directory to clone repository into"
    ),
    qdrant_url: str = typer.Option(
        "http://localhost:6333",
        "--qdrant-url", "-q",
        help="Qdrant server URL"
    ),
    collection_name: str = typer.Option(
        "atproto-dart",
        "--collection", "-c",
        help="Qdrant collection name"
    ),
    embedding_model: str = typer.Option(
        "BAAI/bge-small-en-v1.5",
        "--model", "-m",
        help="FastEmbed model (BAAI/bge-small-en-v1.5, BAAI/bge-base-en-v1.5)"
    ),
    batch_size: int = typer.Option(
        100,
        "--batch-size", "-b",
        help="Batch size for embedding requests"
    ),
    include_tests: bool = typer.Option(
        False,
        "--include-tests",
        help="Include test files in vectorization"
    ),
    include_generated: bool = typer.Option(
        False,
        "--include-generated",
        help="Include generated files (.g.dart) in vectorization"
    ),
    force_update: bool = typer.Option(
        False,
        "--force-update", "-f",
        help="Force update even if repository exists"
    ),
):
    """
    Vectorize an AT Protocol Dart repository for RAG with Qdrant.
    
    This command will:
    1. Clone or update the specified repository
    2. Extract code chunks and documentation
    3. Generate embeddings using FastEmbed
    4. Store vectors in Qdrant for use with MCP
    """
    
    # Setup paths
    if clone_dir is None:
        clone_dir = DEFAULT_CLONE_DIR
    
    repo_name = repo_url.split('/')[-1].replace('.git', '')
    target_path = clone_dir / repo_name
    
    # Create clone directory
    clone_dir.mkdir(parents=True, exist_ok=True)
    
    # Create configuration
    config = VectorizationConfig(
        qdrant_url=qdrant_url,
        collection_name=collection_name,
        embedding_model=embedding_model,
        batch_size=batch_size,
        include_tests=include_tests,
        include_generated=include_generated
    )
    
    # Display configuration
    console.print("[bold blue]Configuration:[/bold blue]")
    config_table = Table(show_header=False)
    config_table.add_column("Setting", style="cyan")
    config_table.add_column("Value", style="white")
    
    config_table.add_row("Repository URL", repo_url)
    config_table.add_row("Clone Directory", str(target_path))
    config_table.add_row("Qdrant URL", config.qdrant_url)
    config_table.add_row("Collection", config.collection_name)
    config_table.add_row("Embedding Model", config.embedding_model)
    config_table.add_row("Batch Size", str(config.batch_size))
    config_table.add_row("Store Batch Size", str(config.store_batch_size))
    config_table.add_row("Include Tests", str(config.include_tests))
    config_table.add_row("Include Generated", str(config.include_generated))
    
    console.print(config_table)
    console.print()
    
    # Run vectorization
    try:
        vectorizer = AtprotoVectorizer(config)
        stats = asyncio.run(vectorizer.run_full_process(repo_url, target_path))
        
        # Display results
        console.print("\n[bold green]Vectorization Complete![/bold green]")
        
        results_table = Table(title="Results")
        results_table.add_column("Metric", style="cyan")
        results_table.add_column("Value", style="white")
        
        results_table.add_row("Repository", stats.repository.url)
        results_table.add_row("Commit Hash", stats.repository.commit_hash or "N/A")
        results_table.add_row("Total Files", str(stats.repository.total_files))
        results_table.add_row("Dart Files", str(stats.repository.dart_files))
        results_table.add_row("Markdown Files", str(stats.repository.md_files))
        results_table.add_row("Chunks Created", str(stats.chunks_created))
        results_table.add_row("Chunks Uploaded", str(stats.chunks_uploaded))
        results_table.add_row("Processing Time", f"{stats.processing_time:.2f}s")
        results_table.add_row("Errors", str(len(stats.errors)))
        results_table.add_row("Warnings", str(len(stats.warnings)))
        
        console.print(results_table)
        
        # Show errors if any
        if stats.errors:
            console.print("\n[bold red]Errors:[/bold red]")
            for error in stats.errors:
                console.print(f"[red]• {error}[/red]")
        
        # Show warnings if any
        if stats.warnings:
            console.print("\n[bold yellow]Warnings:[/bold yellow]")
            for warning in stats.warnings:
                console.print(f"[yellow]• {warning}[/yellow]")
        
        console.print(f"\n[green]✓ Ready for use with Claude Code MCP via Qdrant![/green]")
        console.print(f"[cyan]Run 'atproto-rag setup-mcp' to generate MCP configuration[/cyan]")
        
    except Exception as e:
        console.print(f"[bold red]✗ Vectorization failed: {e}[/bold red]")
        raise typer.Exit(1)


@app.command("vec-moode")
def vectorize_flutter(
    flutter_dir: Path = typer.Option(
        Path.cwd().parent,
        "--flutter-dir", "-f",
        help="Path to Flutter project directory"
    ),
    qdrant_url: str = typer.Option(
        "http://localhost:6333",
        "--qdrant-url", "-q",
        help="Qdrant server URL"
    ),
    collection_name: str = typer.Option(
        "moodeSky",
        "--collection", "-c",
        help="Qdrant collection name for Flutter project"
    ),
    embedding_model: str = typer.Option(
        "BAAI/bge-small-en-v1.5",
        "--model", "-m",
        help="FastEmbed model (BAAI/bge-small-en-v1.5, BAAI/bge-base-en-v1.5)"
    ),
    batch_size: int = typer.Option(
        100,
        "--batch-size", "-b",
        help="Batch size for embedding requests"
    ),
    include_tests: bool = typer.Option(
        False,
        "--include-tests",
        help="Include test files in vectorization"
    ),
    include_generated: bool = typer.Option(
        False,
        "--include-generated",
        help="Include generated files (.g.dart) in vectorization"
    ),
):
    """
    Vectorize a local Flutter project for RAG with Qdrant.
    
    This command will:
    1. Scan the Flutter project directory
    2. Extract code chunks and documentation from Dart files
    3. Generate embeddings using FastEmbed
    4. Store vectors in a separate Qdrant collection for the Flutter project
    """
    
    # Verify Flutter project directory exists
    if not flutter_dir.exists():
        console.print(f"[red]✗ Flutter directory does not exist: {flutter_dir}[/red]")
        raise typer.Exit(1)
    
    # Check if it's a Flutter project (look for pubspec.yaml)
    pubspec_path = flutter_dir / "pubspec.yaml"
    if not pubspec_path.exists():
        console.print(f"[red]✗ Not a Flutter project (no pubspec.yaml found): {flutter_dir}[/red]")
        raise typer.Exit(1)
    
    # Create configuration
    config = VectorizationConfig(
        qdrant_url=qdrant_url,
        collection_name=collection_name,
        embedding_model=embedding_model,
        batch_size=batch_size,
        include_tests=include_tests,
        include_generated=include_generated
    )
    
    # Display configuration
    console.print("[bold blue]Flutter Project Vectorization:[/bold blue]")
    config_table = Table(show_header=False)
    config_table.add_column("Setting", style="cyan")
    config_table.add_column("Value", style="white")
    
    config_table.add_row("Flutter Directory", str(flutter_dir))
    config_table.add_row("Qdrant URL", config.qdrant_url)
    config_table.add_row("Collection", config.collection_name)
    config_table.add_row("Embedding Model", config.embedding_model)
    config_table.add_row("Batch Size", str(config.batch_size))
    config_table.add_row("Include Tests", str(config.include_tests))
    config_table.add_row("Include Generated", str(config.include_generated))
    
    console.print(config_table)
    console.print()
    
    # Run vectorization on local Flutter project
    try:
        vectorizer = AtprotoVectorizer(config)
        stats = asyncio.run(vectorizer.run_flutter_process(flutter_dir))
        
        # Display results
        console.print("\n[bold green]Flutter Vectorization Complete![/bold green]")
        
        results_table = Table(title="Results")
        results_table.add_column("Metric", style="cyan")
        results_table.add_column("Value", style="white")
        
        results_table.add_row("Flutter Project", str(flutter_dir))
        results_table.add_row("Total Files", str(stats.repository.total_files))
        results_table.add_row("Dart Files", str(stats.repository.dart_files))
        results_table.add_row("Markdown Files", str(stats.repository.md_files))
        results_table.add_row("Chunks Created", str(stats.chunks_created))
        results_table.add_row("Chunks Uploaded", str(stats.chunks_uploaded))
        results_table.add_row("Processing Time", f"{stats.processing_time:.2f}s")
        results_table.add_row("Errors", str(len(stats.errors)))
        results_table.add_row("Warnings", str(len(stats.warnings)))
        
        console.print(results_table)
        
        # Show errors if any
        if stats.errors:
            console.print("\n[bold red]Errors:[/bold red]")
            for error in stats.errors:
                console.print(f"[red]• {error}[/red]")
        
        # Show warnings if any
        if stats.warnings:
            console.print("\n[bold yellow]Warnings:[/bold yellow]")
            for warning in stats.warnings:
                console.print(f"[yellow]• {warning}[/yellow]")
        
        console.print(f"\n[green]✓ Flutter project ready for use with Claude Code MCP via Qdrant![/green]")
        
    except Exception as e:
        console.print(f"[bold red]✗ Flutter vectorization failed: {e}[/bold red]")
        raise typer.Exit(1)


@app.command("vec-flutter")
def vectorize_flutter_docs(
    repo_url: str = typer.Option(
        FLUTTER_DOCS_URL,
        "--repo-url", "-r",
        help="Flutter documentation repository URL"
    ),
    clone_dir: Optional[Path] = typer.Option(
        None,
        "--clone-dir", "-d",
        help="Directory to clone repository into"
    ),
    qdrant_url: str = typer.Option(
        "http://localhost:6333",
        "--qdrant-url", "-q",
        help="Qdrant server URL"
    ),
    collection_name: str = typer.Option(
        "flutter-docs",
        "--collection", "-c",
        help="Qdrant collection name for Flutter documentation"
    ),
    embedding_model: str = typer.Option(
        "BAAI/bge-small-en-v1.5",
        "--model", "-m",
        help="FastEmbed model (BAAI/bge-small-en-v1.5, BAAI/bge-base-en-v1.5)"
    ),
    batch_size: int = typer.Option(
        100,
        "--batch-size", "-b",
        help="Batch size for embedding requests"
    ),
    include_tests: bool = typer.Option(
        False,
        "--include-tests",
        help="Include test files in vectorization"
    ),
    include_generated: bool = typer.Option(
        False,
        "--include-generated",
        help="Include generated files (.g.dart) in vectorization"
    ),
    force_update: bool = typer.Option(
        False,
        "--force-update", "-f",
        help="Force update even if repository exists"
    ),
):
    """
    Vectorize Flutter official documentation for RAG with Qdrant.
    
    This command will:
    1. Clone or update the Flutter documentation repository (https://github.com/flutter/website.git)
    2. Extract documentation chunks from .md, .mdx, .dart, .json, .yaml files
    3. Generate embeddings using FastEmbed
    4. Store vectors in Qdrant for use with MCP
    """
    
    # Setup paths
    if clone_dir is None:
        clone_dir = DEFAULT_CLONE_DIR
    
    repo_name = repo_url.split('/')[-1].replace('.git', '')
    target_path = clone_dir / repo_name
    
    # Create clone directory
    clone_dir.mkdir(parents=True, exist_ok=True)
    
    # Create configuration for Flutter docs
    config = VectorizationConfig(
        qdrant_url=qdrant_url,
        collection_name=collection_name,
        embedding_model=embedding_model,
        batch_size=batch_size,
        include_tests=include_tests,
        include_generated=include_generated
    )
    
    # Display configuration
    console.print("[bold blue]Flutter Documentation Vectorization:[/bold blue]")
    config_table = Table(show_header=False)
    config_table.add_column("Setting", style="cyan")
    config_table.add_column("Value", style="white")
    
    config_table.add_row("Repository URL", repo_url)
    config_table.add_row("Clone Directory", str(target_path))
    config_table.add_row("Qdrant URL", config.qdrant_url)
    config_table.add_row("Collection", config.collection_name)
    config_table.add_row("Embedding Model", config.embedding_model)
    config_table.add_row("Batch Size", str(config.batch_size))
    config_table.add_row("Store Batch Size", str(config.store_batch_size))
    config_table.add_row("Include Tests", str(config.include_tests))
    config_table.add_row("Include Generated", str(config.include_generated))
    config_table.add_row("Target File Types", ".md, .mdx, .dart, .json, .yaml/.yml")
    
    console.print(config_table)
    console.print()
    
    # Run vectorization
    try:
        vectorizer = AtprotoVectorizer(config)
        stats = asyncio.run(vectorizer.run_full_process(repo_url, target_path))
        
        # Display results
        console.print("\n[bold green]Flutter Documentation Vectorization Complete![/bold green]")
        
        results_table = Table(title="Results")
        results_table.add_column("Metric", style="cyan")
        results_table.add_column("Value", style="white")
        
        results_table.add_row("Repository", stats.repository.url)
        results_table.add_row("Commit Hash", stats.repository.commit_hash or "N/A")
        results_table.add_row("Total Files", str(stats.repository.total_files))
        results_table.add_row("Dart Files", str(stats.repository.dart_files))
        results_table.add_row("Markdown Files", str(stats.repository.md_files))
        results_table.add_row("Other Files", str(stats.repository.total_files - stats.repository.dart_files - stats.repository.md_files))
        results_table.add_row("Chunks Created", str(stats.chunks_created))
        results_table.add_row("Chunks Uploaded", str(stats.chunks_uploaded))
        results_table.add_row("Processing Time", f"{stats.processing_time:.2f}s")
        results_table.add_row("Errors", str(len(stats.errors)))
        results_table.add_row("Warnings", str(len(stats.warnings)))
        
        console.print(results_table)
        
        # Show errors if any
        if stats.errors:
            console.print("\n[bold red]Errors:[/bold red]")
            for error in stats.errors:
                console.print(f"[red]• {error}[/red]")
        
        # Show warnings if any
        if stats.warnings:
            console.print("\n[bold yellow]Warnings:[/bold yellow]")
            for warning in stats.warnings:
                console.print(f"[yellow]• {warning}[/yellow]")
        
        console.print(f"\n[green]✓ Flutter documentation ready for use with Claude Code MCP via Qdrant![/green]")
        console.print(f"[cyan]Collection: {collection_name}[/cyan]")
        console.print(f"[cyan]Run 'atproto-rag setup-mcp --collection {collection_name}' to generate MCP configuration[/cyan]")
        
    except Exception as e:
        console.print(f"[bold red]✗ Flutter documentation vectorization failed: {e}[/bold red]")
        raise typer.Exit(1)


@app.command()
def search(
    query: str = typer.Argument(..., help="Search query"),
    collection_name: str = typer.Option(
        "atproto-dart",
        "--collection", "-c",
        help="Qdrant collection name"
    ),
    qdrant_url: str = typer.Option(
        "http://localhost:6333",
        "--qdrant-url", "-q",
        help="Qdrant server URL"
    ),
    embedding_model: str = typer.Option(
        "BAAI/bge-small-en-v1.5",
        "--model", "-m",
        help="FastEmbed model"
    ),
    limit: int = typer.Option(
        5,
        "--limit", "-l",
        help="Number of results to show"
    )
):
    """
    Test search functionality against the vectorized repository using Qdrant.
    """
    
    config = VectorizationConfig(
        qdrant_url=qdrant_url,
        collection_name=collection_name,
        embedding_model=embedding_model
    )
    
    vectorizer = AtprotoVectorizer(config)
    if not vectorizer.setup_collection():
        console.print("[red]✗ Failed to access collection[/red]")
        raise typer.Exit(1)
    
    asyncio.run(vectorizer.test_search(query, limit))


@app.command()
def status(
    qdrant_url: str = typer.Option(
        "http://localhost:6333",
        "--qdrant-url", "-q",
        help="Qdrant server URL"
    ),
    collection_name: str = typer.Option(
        "atproto-dart",
        "--collection", "-c",
        help="Qdrant collection name"
    )
):
    """
    Show status of the Qdrant collection.
    """
    
    try:
        from qdrant_client import QdrantClient
        
        client = QdrantClient(url=qdrant_url)
        
        # Check if collection exists
        collections = client.get_collections().collections
        collection_names = [c.name for c in collections]
        
        if collection_name not in collection_names:
            console.print(f"[red]✗ Collection '{collection_name}' does not exist[/red]")
            console.print(f"[yellow]Available collections: {', '.join(collection_names) or 'None'}[/yellow]")
            return
        
        # Get collection info
        collection = client.get_collection(collection_name)
        
        status_table = Table(title=f"Qdrant Collection Status: {collection_name}")
        status_table.add_column("Property", style="cyan")
        status_table.add_column("Value", style="white")
        
        status_table.add_row("Qdrant URL", qdrant_url)
        status_table.add_row("Collection Name", collection_name)
        status_table.add_row("Vectors Count", str(collection.vectors_count))
        status_table.add_row("Points Count", str(collection.points_count))
        status_table.add_row("Indexed Vectors", str(collection.indexed_vectors_count))
        status_table.add_row("Status", collection.status.value)
        
        if collection.config:
            status_table.add_row("Vector Size", str(collection.config.params.vectors.size))
            status_table.add_row("Distance", collection.config.params.vectors.distance.value)
            
        console.print(status_table)
        
        console.print(f"\n[green]✓ Collection '{collection_name}' is ready with {collection.points_count} points[/green]")
        
    except Exception as e:
        console.print(f"[red]✗ Failed to get collection status: {e}[/red]")
        raise typer.Exit(1)


@app.command("vector-all")
def vector_all(
    qdrant_url: str = typer.Option(
        "http://localhost:6333",
        "--qdrant-url", "-q",
        help="Qdrant server URL"
    ),
    embedding_model: str = typer.Option(
        "BAAI/bge-small-en-v1.5",
        "--model", "-m",
        help="FastEmbed model (BAAI/bge-small-en-v1.5, BAAI/bge-base-en-v1.5)"
    ),
    batch_size: int = typer.Option(
        100,
        "--batch-size", "-b",
        help="Batch size for embedding requests"
    ),
    include_tests: bool = typer.Option(
        False,
        "--include-tests",
        help="Include test files in vectorization"
    ),
    include_generated: bool = typer.Option(
        False,
        "--include-generated",
        help="Include generated files (.g.dart) in vectorization"
    ),
    force_update: bool = typer.Option(
        False,
        "--force-update", "-f",
        help="Force update even if repository exists"
    ),
    skip_flutter: bool = typer.Option(
        False,
        "--skip-flutter",
        help="Skip Flutter official documentation vectorization"
    ),
    skip_atproto: bool = typer.Option(
        False,
        "--skip-atproto",
        help="Skip atproto-dart vectorization"
    ),
    skip_moode: bool = typer.Option(
        False,
        "--skip-moode",
        help="Skip moodeSky project vectorization"
    ),
    flutter_dir: Optional[Path] = typer.Option(
        None,
        "--flutter-dir",
        help="Path to Flutter project directory (defaults to parent directory)"
    ),
):
    """
    Vectorize all three repositories: Flutter docs, atproto-dart, and moodeSky project.
    
    This command will sequentially:
    1. Vectorize Flutter official documentation (collection: flutter-docs)
    2. Vectorize atproto-dart repository (collection: atproto-dart)
    3. Vectorize moodeSky Flutter project (collection: moodeSky)
    """
    
    import time
    start_time = time.time()
    
    console.print("[bold blue]🚀 Starting comprehensive vectorization process[/bold blue]")
    console.print()
    
    # Setup paths
    if flutter_dir is None:
        flutter_dir = Path.cwd().parent
    
    # Verify Flutter project directory exists
    if not skip_moode:
        pubspec_path = flutter_dir / "pubspec.yaml"
        if not pubspec_path.exists():
            console.print(f"[red]✗ Flutter project not found at: {flutter_dir}[/red]")
            console.print("[yellow]Use --skip-moode to skip Flutter project vectorization[/yellow]")
            raise typer.Exit(1)
    
    stats_summary = []
    
    # Step 1: Flutter Documentation
    if not skip_flutter:
        console.print("[bold cyan]Step 1: Vectorizing Flutter Official Documentation[/bold cyan]")
        step_start = time.time()
        
        try:
            config = VectorizationConfig(
                qdrant_url=qdrant_url,
                collection_name="flutter-docs",
                embedding_model=embedding_model,
                batch_size=batch_size,
                include_tests=include_tests,
                include_generated=include_generated
            )
            
            vectorizer = AtprotoVectorizer(config)
            clone_dir = DEFAULT_CLONE_DIR
            clone_dir.mkdir(parents=True, exist_ok=True)
            target_path = clone_dir / "website"
            
            stats = asyncio.run(vectorizer.run_full_process(FLUTTER_DOCS_URL, target_path))
            
            step_duration = time.time() - step_start
            stats_summary.append({
                "name": "Flutter Docs",
                "collection": "flutter-docs",
                "stats": stats,
                "duration": step_duration
            })
            
            console.print(f"[green]✅ Flutter documentation vectorized in {step_duration:.1f}s[/green]")
            
        except Exception as e:
            console.print(f"[red]✗ Flutter documentation vectorization failed: {e}[/red]")
            raise typer.Exit(1)
    else:
        console.print("[yellow]⏭️  Skipping Flutter documentation vectorization[/yellow]")
    
    console.print()
    
    # Step 2: atproto-dart
    if not skip_atproto:
        console.print("[bold cyan]Step 2: Vectorizing atproto-dart Repository[/bold cyan]")
        step_start = time.time()
        
        try:
            config = VectorizationConfig(
                qdrant_url=qdrant_url,
                collection_name="atproto-dart",
                embedding_model=embedding_model,
                batch_size=batch_size,
                include_tests=include_tests,
                include_generated=include_generated
            )
            
            vectorizer = AtprotoVectorizer(config)
            clone_dir = DEFAULT_CLONE_DIR
            clone_dir.mkdir(parents=True, exist_ok=True)
            target_path = clone_dir / "atproto.dart"
            
            stats = asyncio.run(vectorizer.run_full_process(ATPROTO_DART_URL, target_path))
            
            step_duration = time.time() - step_start
            stats_summary.append({
                "name": "atproto-dart",
                "collection": "atproto-dart",
                "stats": stats,
                "duration": step_duration
            })
            
            console.print(f"[green]✅ atproto-dart vectorized in {step_duration:.1f}s[/green]")
            
        except Exception as e:
            console.print(f"[red]✗ atproto-dart vectorization failed: {e}[/red]")
            raise typer.Exit(1)
    else:
        console.print("[yellow]⏭️  Skipping atproto-dart vectorization[/yellow]")
    
    console.print()
    
    # Step 3: moodeSky Project
    if not skip_moode:
        console.print("[bold cyan]Step 3: Vectorizing moodeSky Flutter Project[/bold cyan]")
        step_start = time.time()
        
        try:
            config = VectorizationConfig(
                qdrant_url=qdrant_url,
                collection_name="moodeSky",
                embedding_model=embedding_model,
                batch_size=batch_size,
                include_tests=include_tests,
                include_generated=include_generated
            )
            
            vectorizer = AtprotoVectorizer(config)
            stats = asyncio.run(vectorizer.run_flutter_process(flutter_dir))
            
            step_duration = time.time() - step_start
            stats_summary.append({
                "name": "moodeSky Project",
                "collection": "moodeSky",
                "stats": stats,
                "duration": step_duration
            })
            
            console.print(f"[green]✅ moodeSky project vectorized in {step_duration:.1f}s[/green]")
            
        except Exception as e:
            console.print(f"[red]✗ moodeSky project vectorization failed: {e}[/red]")
            raise typer.Exit(1)
    else:
        console.print("[yellow]⏭️  Skipping moodeSky project vectorization[/yellow]")
    
    # Final Summary
    total_duration = time.time() - start_time
    console.print()
    console.print("[bold green]🎉 Comprehensive Vectorization Complete![/bold green]")
    
    summary_table = Table(title="Vectorization Summary")
    summary_table.add_column("Repository", style="cyan")
    summary_table.add_column("Collection", style="blue")
    summary_table.add_column("Files", style="white")
    summary_table.add_column("Chunks", style="yellow")
    summary_table.add_column("Duration", style="green")
    
    total_files = 0
    total_chunks = 0
    
    for item in stats_summary:
        files = item["stats"].repository.total_files
        chunks = item["stats"].chunks_uploaded
        duration = f"{item['duration']:.1f}s"
        
        summary_table.add_row(
            item["name"],
            item["collection"],
            str(files),
            str(chunks),
            duration
        )
        
        total_files += files
        total_chunks += chunks
    
    summary_table.add_row(
        "[bold]TOTAL[/bold]",
        "[bold]3 Collections[/bold]",
        f"[bold]{total_files}[/bold]",
        f"[bold]{total_chunks}[/bold]",
        f"[bold]{total_duration:.1f}s[/bold]"
    )
    
    console.print(summary_table)
    
    console.print()
    console.print("[bold green]🎯 All collections are ready for use with Claude Code MCP![/bold green]")
    console.print("[cyan]Available MCP tools:[/cyan]")
    if not skip_flutter:
        console.print("[cyan]  • mcp_flutter_docs_find --query \"Flutter widget examples\"[/cyan]")
    if not skip_atproto:
        console.print("[cyan]  • mcp_atproto_dart_rag_find --query \"AT Protocol authentication\"[/cyan]")
    if not skip_moode:
        console.print("[cyan]  • mcp_moodesky_docs_find --query \"moodeSky deck implementation\"[/cyan]")


@app.command()
def setup_mcp(
    qdrant_url: str = typer.Option(
        "http://localhost:6333",
        "--qdrant-url", "-q",
        help="Qdrant server URL"
    ),
    collection_name: str = typer.Option(
        "atproto-dart",
        "--collection", "-c",
        help="Qdrant collection name"
    ),
    embedding_model: str = typer.Option(
        "BAAI/bge-small-en-v1.5",
        "--model", "-m",
        help="FastEmbed model"
    )
):
    """
    Generate MCP configuration for Claude Code with Qdrant.
    """
    
    console.print("[bold blue]MCP Configuration for Claude Code:[/bold blue]")
    console.print()
    
    console.print("[bold cyan]1. Install MCP Server:[/bold cyan]")
    console.print("[green]pip install mcp-server-qdrant[/green]")
    console.print()
    
    console.print("[bold cyan]2. Add to Claude Code:[/bold cyan]")
    console.print(f"""[green]claude mcp add qdrant \\
  -e QDRANT_URL="{qdrant_url}" \\
  -e COLLECTION_NAME="{collection_name}" \\
  -e EMBEDDING_MODEL="{embedding_model}" \\
  -e EMBEDDING_DIMENSION="384" \\
  -e TOP_K="5" \\
  -- uvx mcp-server-qdrant[/green]""")
    console.print()
    
    console.print("[bold cyan]3. Or use .mcp.json configuration:[/bold cyan]")
    
    mcp_config = f"""{{
  "mcpServers": {{
    "qdrant": {{
      "command": "uvx",
      "args": ["mcp-server-qdrant"],
      "env": {{
        "QDRANT_URL": "{qdrant_url}",
        "COLLECTION_NAME": "{collection_name}",
        "EMBEDDING_MODEL": "{embedding_model}",
        "EMBEDDING_DIMENSION": "384",
        "TOP_K": "5"
      }}
    }}
  }}
}}"""
    
    console.print(f"[dim]{mcp_config}[/dim]")
    
    console.print("\n[green]✓ Configuration ready for Claude Code MCP integration![/green]")


if __name__ == "__main__":
    app()