"""
Main CLI application for atproto-rag
"""

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
        help="Embedding model to use"
    ),
    batch_size: int = typer.Option(
        32,
        "--batch-size", "-b",
        help="Batch size for vectorization"
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
    )
):
    """
    Vectorize an AT Protocol Dart repository for RAG.
    
    This command will:
    1. Clone or update the specified repository
    2. Extract code chunks and documentation
    3. Generate embeddings using the specified model
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
    config_table.add_row("Include Tests", str(config.include_tests))
    config_table.add_row("Include Generated", str(config.include_generated))
    
    console.print(config_table)
    console.print()
    
    # Run vectorization
    try:
        vectorizer = AtprotoVectorizer(config)
        stats = vectorizer.run_full_process(repo_url, target_path)
        
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
        
        console.print(f"\n[green]✓ Ready for use with Claude Code MCP![/green]")
        console.print(f"[green]Collection: {config.collection_name}[/green]")
        
    except Exception as e:
        console.print(f"[bold red]✗ Vectorization failed: {e}[/bold red]")
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
        help="Embedding model to use"
    ),
    limit: int = typer.Option(
        5,
        "--limit", "-l",
        help="Number of results to show"
    )
):
    """
    Test search functionality against the vectorized repository.
    """
    
    config = VectorizationConfig(
        qdrant_url=qdrant_url,
        collection_name=collection_name,
        embedding_model=embedding_model
    )
    
    vectorizer = AtprotoVectorizer(config)
    vectorizer.test_search(query, limit)


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
        collections = [c.name for c in client.get_collections().collections]
        
        if collection_name not in collections:
            console.print(f"[red]✗ Collection '{collection_name}' does not exist[/red]")
            console.print(f"[yellow]Available collections: {', '.join(collections) or 'None'}[/yellow]")
            return
        
        # Get collection info
        collection_info = client.get_collection(collection_name)
        
        status_table = Table(title=f"Collection Status: {collection_name}")
        status_table.add_column("Property", style="cyan")
        status_table.add_column("Value", style="white")
        
        status_table.add_row("Status", collection_info.status.name)
        status_table.add_row("Vector Count", str(collection_info.vectors_count))
        status_table.add_row("Points Count", str(collection_info.points_count))
        status_table.add_row("Vector Size", str(collection_info.config.params.vectors.size))
        status_table.add_row("Distance", collection_info.config.params.vectors.distance.name)
        
        console.print(status_table)
        
        console.print(f"\n[green]✓ Collection '{collection_name}' is ready[/green]")
        
    except Exception as e:
        console.print(f"[red]✗ Failed to get collection status: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def setup_mcp():
    """
    Generate MCP configuration for Claude Code.
    """
    
    mcp_config = {
        "mcpServers": {
            "atproto-dart-rag": {
                "command": "uvx",
                "args": ["mcp-server-qdrant"],
                "env": {
                    "QDRANT_URL": "http://localhost:6333",
                    "COLLECTION_NAME": "atproto-dart",
                    "EMBEDDING_MODEL": "BAAI/bge-small-en-v1.5",
                    "TOOL_STORE_DESCRIPTION": "Store atproto.dart documentation, API references, and code examples. The 'information' parameter should contain a description of the code/documentation, while the actual code should be included in the 'metadata' parameter as a 'code' property.",
                    "TOOL_FIND_DESCRIPTION": "Search for atproto.dart related information including API usage, method descriptions, implementation examples, and documentation. Use natural language queries to find relevant code snippets and documentation."
                }
            }
        }
    }
    
    import json
    config_json = json.dumps(mcp_config, indent=2)
    
    console.print("[bold blue]MCP Configuration for Claude Code:[/bold blue]")
    console.print("\n[bold cyan].mcp.json content:[/bold cyan]")
    console.print(config_json)
    
    console.print("\n[bold cyan]Claude Code MCP add command:[/bold cyan]")
    console.print("""claude mcp add atproto-dart-rag \\
  -e QDRANT_URL="http://localhost:6333" \\
  -e COLLECTION_NAME="atproto-dart" \\
  -e EMBEDDING_MODEL="BAAI/bge-small-en-v1.5" \\
  -e TOOL_STORE_DESCRIPTION="Store atproto.dart documentation, API references, and code examples. The 'information' parameter should contain a description of the code/documentation, while the actual code should be included in the 'metadata' parameter as a 'code' property." \\
  -e TOOL_FIND_DESCRIPTION="Search for atproto.dart related information including API usage, method descriptions, implementation examples, and documentation. Use natural language queries to find relevant code snippets and documentation." \\
  -- uvx mcp-server-qdrant""")


if __name__ == "__main__":
    app()