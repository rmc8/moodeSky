"""
Main CLI application for atproto-rag with ChromaDB + OpenAI optimizations
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
    help="High-performance AT Protocol repository vectorization for RAG with ChromaDB + OpenAI",
    rich_markup_mode="rich"
)
console = Console()

# Default repository URLs
ATPROTO_DART_URL = "https://github.com/myConsciousness/atproto.dart.git"
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
    chromadb_path: str = typer.Option(
        "./atproto_vector_db",
        "--chromadb-path", "-p",
        help="Path to ChromaDB storage directory"
    ),
    collection_name: str = typer.Option(
        "atproto-dart",
        "--collection", "-c",
        help="ChromaDB collection name"
    ),
    embedding_model: str = typer.Option(
        "text-embedding-3-small",
        "--model", "-m",
        help="OpenAI embedding model (text-embedding-3-small, text-embedding-3-large)"
    ),
    batch_size: int = typer.Option(
        1000,
        "--batch-size", "-b",
        help="Batch size for embedding requests (optimized for OpenAI)"
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
    # Legacy Qdrant compatibility (deprecated)
    qdrant_url: Optional[str] = typer.Option(
        None,
        "--qdrant-url", "-q",
        help="[DEPRECATED] Qdrant server URL - use --chromadb-path instead"
    ),
):
    """
    High-performance vectorize an AT Protocol Dart repository for RAG.
    
    This command will:
    1. Clone or update the specified repository
    2. Extract code chunks and documentation
    3. Generate embeddings using OpenAI (requires OPENAI_API_KEY)
    4. Store vectors in ChromaDB for use with MCP
    """
    
    # Check for OpenAI API key
    if not os.getenv('OPENAI_API_KEY'):
        console.print("[bold red]ERROR: OPENAI_API_KEY environment variable is required[/bold red]")
        console.print("[yellow]Please set your OpenAI API key:[/yellow]")
        console.print("[cyan]export OPENAI_API_KEY='your-api-key-here'[/cyan]")
        raise typer.Exit(1)
    
    # Legacy compatibility warning
    if qdrant_url:
        console.print("[yellow]WARNING: --qdrant-url is deprecated. Using ChromaDB instead.[/yellow]")
    
    # Setup paths
    if clone_dir is None:
        clone_dir = DEFAULT_CLONE_DIR
    
    repo_name = repo_url.split('/')[-1].replace('.git', '')
    target_path = clone_dir / repo_name
    
    # Create clone directory
    clone_dir.mkdir(parents=True, exist_ok=True)
    
    # Create ChromaDB path
    chromadb_dir = Path(chromadb_path)
    chromadb_dir.mkdir(parents=True, exist_ok=True)
    
    # Create configuration
    config = VectorizationConfig(
        chromadb_path=chromadb_path,
        collection_name=collection_name,
        embedding_model=embedding_model,
        batch_size=batch_size,
        include_tests=include_tests,
        include_generated=include_generated
    )
    
    # Display configuration
    console.print("[bold blue]High-Performance Configuration:[/bold blue]")
    config_table = Table(show_header=False)
    config_table.add_column("Setting", style="cyan")
    config_table.add_column("Value", style="white")
    
    config_table.add_row("Repository URL", repo_url)
    config_table.add_row("Clone Directory", str(target_path))
    config_table.add_row("ChromaDB Path", config.chromadb_path)
    config_table.add_row("Collection", config.collection_name)
    config_table.add_row("OpenAI Model", config.embedding_model)
    config_table.add_row("Batch Size", str(config.batch_size))
    config_table.add_row("Store Batch Size", str(config.store_batch_size))
    config_table.add_row("Max Memory %", str(config.max_memory_percent))
    config_table.add_row("Include Tests", str(config.include_tests))
    config_table.add_row("Include Generated", str(config.include_generated))
    
    console.print(config_table)
    console.print()
    
    # Run vectorization with async support
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
        
        console.print(f"\n[green]✓ Ready for use with Claude Code MCP via ChromaDB![/green]")
        console.print(f"[green]ChromaDB Path: {config.chromadb_path}[/green]")
        console.print(f"[green]Collection: {config.collection_name}[/green]")
        console.print(f"[cyan]Run 'atproto-rag setup-mcp' to generate MCP configuration[/cyan]")
        
    except Exception as e:
        console.print(f"[bold red]✗ Vectorization failed: {e}[/bold red]")
        raise typer.Exit(1)


@app.command()
def search(
    query: str = typer.Argument(..., help="Search query"),
    collection_name: str = typer.Option(
        "atproto-dart",
        "--collection", "-c",
        help="ChromaDB collection name"
    ),
    chromadb_path: str = typer.Option(
        "./atproto_vector_db",
        "--chromadb-path", "-p",
        help="Path to ChromaDB storage directory"
    ),
    embedding_model: str = typer.Option(
        "text-embedding-3-small",
        "--model", "-m",
        help="OpenAI embedding model"
    ),
    limit: int = typer.Option(
        5,
        "--limit", "-l",
        help="Number of results to show"
    )
):
    """
    Test search functionality against the vectorized repository using ChromaDB + OpenAI.
    """
    
    # Check for OpenAI API key
    if not os.getenv('OPENAI_API_KEY'):
        console.print("[bold red]ERROR: OPENAI_API_KEY environment variable is required[/bold red]")
        raise typer.Exit(1)
    
    config = VectorizationConfig(
        chromadb_path=chromadb_path,
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
    chromadb_path: str = typer.Option(
        "./atproto_vector_db",
        "--chromadb-path", "-p",
        help="Path to ChromaDB storage directory"
    ),
    collection_name: str = typer.Option(
        "atproto-dart",
        "--collection", "-c",
        help="ChromaDB collection name"
    )
):
    """
    Show status of the ChromaDB collection.
    """
    
    try:
        import chromadb
        from chromadb.config import Settings
        
        chroma_client = chromadb.PersistentClient(
            path=chromadb_path,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # List all collections
        collections = chroma_client.list_collections()
        collection_names = [c.name for c in collections]
        
        if collection_name not in collection_names:
            console.print(f"[red]✗ Collection '{collection_name}' does not exist[/red]")
            console.print(f"[yellow]Available collections: {', '.join(collection_names) or 'None'}[/yellow]")
            return
        
        # Get collection info
        collection = chroma_client.get_collection(collection_name)
        count = collection.count()
        
        status_table = Table(title=f"ChromaDB Collection Status: {collection_name}")
        status_table.add_column("Property", style="cyan")
        status_table.add_column("Value", style="white")
        
        status_table.add_row("ChromaDB Path", chromadb_path)
        status_table.add_row("Collection Name", collection_name)
        status_table.add_row("Document Count", str(count))
        status_table.add_row("Distance Metric", "Cosine")
        status_table.add_row("Metadata", str(collection.metadata))
        
        console.print(status_table)
        
        console.print(f"\n[green]✓ Collection '{collection_name}' is ready with {count} documents[/green]")
        
    except Exception as e:
        console.print(f"[red]✗ Failed to get collection status: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def setup_mcp(
    chromadb_path: str = typer.Option(
        "./atproto_vector_db",
        "--chromadb-path", "-p",
        help="Path to ChromaDB storage directory"
    ),
    collection_name: str = typer.Option(
        "atproto-dart",
        "--collection", "-c",
        help="ChromaDB collection name"
    ),
    embedding_model: str = typer.Option(
        "text-embedding-3-small",
        "--model", "-m",
        help="OpenAI embedding model"
    )
):
    """
    Generate MCP configuration for Claude Code with ChromaDB + OpenAI.
    """
    
    # Note: ChromaDB MCP server is still being developed
    # For now, we provide setup instructions for a custom server
    
    console.print("[bold blue]ChromaDB + OpenAI MCP Setup Instructions:[/bold blue]")
    console.print()
    
    console.print("[bold yellow]Current Status:[/bold yellow]")
    console.print("• ChromaDB-specific MCP server is under development")
    console.print("• Use atproto-rag search command to test functionality")
    console.print("• Custom MCP server implementation coming soon")
    console.print()
    
    console.print("[bold cyan]Configuration Details:[/bold cyan]")
    config_table = Table(show_header=False)
    config_table.add_column("Setting", style="cyan")
    config_table.add_column("Value", style="white")
    
    config_table.add_row("ChromaDB Path", chromadb_path)
    config_table.add_row("Collection Name", collection_name)
    config_table.add_row("Embedding Model", embedding_model)
    config_table.add_row("API Key Required", "OPENAI_API_KEY")
    
    console.print(config_table)
    console.print()
    
    console.print("[bold cyan]Test Search Functionality:[/bold cyan]")
    console.print(f"[green]uv run atproto-rag search 'authentication' --chromadb-path {chromadb_path}[/green]")
    console.print()
    
    console.print("[bold cyan]Temporary Integration Option:[/bold cyan]")
    console.print("Create a simple Python MCP server using the ChromaDB setup:")
    console.print()
    
    sample_server = f"""
# simple_chromadb_mcp.py
import chromadb
import openai
import asyncio
from mcp.server import Server
from mcp.server.stdio import stdio_server

server = Server("chromadb-atproto")
client = chromadb.PersistentClient(path="{chromadb_path}")
collection = client.get_collection("{collection_name}")

@server.tool()
async def search_atproto(query: str, limit: int = 5) -> list:
    \"\"\"Search atproto.dart documentation and code examples\"\"\"
    response = await openai.embeddings.acreate(
        input=query, model="{embedding_model}"
    )
    query_embedding = response.data[0].embedding
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=limit
    )
    return results

if __name__ == "__main__":
    stdio_server(server).run()
"""
    
    console.print(f"[dim]{sample_server.strip()}[/dim]")
    
    console.print("\n[green]✓ ChromaDB vectorization is complete and ready for custom MCP integration![/green]")


if __name__ == "__main__":
    app()