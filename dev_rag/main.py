"""
Main CLI application for dev-rag with Google Fire + Qdrant + FastEmbed
"""

import asyncio
import time
from pathlib import Path
from typing import Optional

import fire
from rich.console import Console
from rich.table import Table

from dev_rag import VectorizationConfig, DevVectorizer

console = Console()

# Documentation Sources
SVELTEKIT_DOCS = "https://github.com/sveltejs/kit.git"
SVELTEJS_DOCS = "https://github.com/sveltejs/svelte.git"
TAURI_DOCS = "https://github.com/tauri-apps/tauri-docs.git"
BLUESKY_DOCS = "https://github.com/bluesky-social/bsky-docs.git"
ATPROTO_DOCS = "https://github.com/bluesky-social/atproto.git"

# Project Paths
PARENT_DIR = Path(__file__).parent
MOODESKY_PROJECT = PARENT_DIR.parent / "moodeSky"
DEFAULT_CLONE_DIR = PARENT_DIR / "cloned_repos"


class DevRagCLI:
    """Development documentation vectorization for RAG with Qdrant MCP"""
    
    def vectorize(self, 
                 repo_url: str = SVELTEKIT_DOCS,
                 collection_name: str = "sveltekit-docs",
                 qdrant_url: str = "http://localhost:6333",
                 embedding_model: str = "BAAI/bge-small-en-v1.5",
                 batch_size: int = 100,
                 include_tests: bool = False,
                 include_generated: bool = False,
                 force_update: bool = False):
        """Vectorize a development documentation repository"""
        return self._vectorize_repo(
            repo_url, collection_name, qdrant_url, embedding_model, 
            batch_size, include_tests, include_generated, force_update
        )
    
    def vec_sveltekit(self, **kwargs):
        """Vectorize SvelteKit documentation"""
        return self._vectorize_repo(SVELTEKIT_DOCS, "sveltekit-docs", **kwargs)
    
    def vec_svelte(self, **kwargs):
        """Vectorize Svelte documentation"""
        return self._vectorize_repo(SVELTEJS_DOCS, "svelte-docs", **kwargs)
    
    def vec_tauri(self, **kwargs):
        """Vectorize Tauri documentation"""
        return self._vectorize_repo(TAURI_DOCS, "tauri-docs", **kwargs)
    
    def vec_bluesky(self, **kwargs):
        """Vectorize BlueSky documentation"""
        return self._vectorize_repo(BLUESKY_DOCS, "bluesky-docs", **kwargs)
    
    def vec_atproto(self, **kwargs):
        """Vectorize AT Protocol documentation"""
        return self._vectorize_repo(ATPROTO_DOCS, "atproto-docs", **kwargs)
    
    def vec_moode(self, 
                 flutter_dir: Optional[str] = None,
                 collection_name: str = "moodeSky-local",
                 qdrant_url: str = "http://localhost:6333",
                 embedding_model: str = "BAAI/bge-small-en-v1.5",
                 batch_size: int = 100,
                 include_tests: bool = False,
                 include_generated: bool = False):
        """Vectorize local moodeSky project"""
        project_path = Path(flutter_dir) if flutter_dir else MOODESKY_PROJECT
        
        if not project_path.exists():
            console.print(f"[red]✗ Project not found at: {project_path}[/red]")
            return False
        
        config = VectorizationConfig(
            qdrant_url=qdrant_url,
            collection_name=collection_name,
            embedding_model=embedding_model,
            batch_size=batch_size,
            include_tests=include_tests,
            include_generated=include_generated
        )
        
        console.print(f"[bold blue]Vectorizing moodeSky project: {project_path}[/bold blue]")
        
        try:
            vectorizer = DevVectorizer(config)
            stats = asyncio.run(vectorizer.run_flutter_process(project_path))
            
            console.print(f"[green]✅ moodeSky project vectorized successfully![/green]")
            console.print(f"[cyan]Collection: {collection_name}[/cyan]")
            return True
            
        except Exception as e:
            console.print(f"[red]✗ Vectorization failed: {e}[/red]")
            return False
    
    def vector_all(self,
                  qdrant_url: str = "http://localhost:6333",
                  embedding_model: str = "BAAI/bge-small-en-v1.5",
                  batch_size: int = 100,
                  include_tests: bool = False,
                  include_generated: bool = False,
                  skip_sveltekit: bool = False,
                  skip_svelte: bool = False,
                  skip_tauri: bool = False,
                  skip_bluesky: bool = False,
                  skip_atproto: bool = False,
                  skip_moode: bool = False):
        """Vectorize all development documentation repositories and local project"""
        
        console.print("[bold blue]🚀 Starting comprehensive vectorization process[/bold blue]")
        start_time = time.time()
        stats_summary = []
        
        repos = [
            ("SvelteKit", SVELTEKIT_DOCS, "sveltekit-docs", skip_sveltekit),
            ("Svelte", SVELTEJS_DOCS, "svelte-docs", skip_svelte),
            ("Tauri", TAURI_DOCS, "tauri-docs", skip_tauri),
            ("BlueSky", BLUESKY_DOCS, "bluesky-docs", skip_bluesky),
            ("AT Protocol", ATPROTO_DOCS, "atproto-docs", skip_atproto),
        ]
        
        # Process repositories
        for i, (name, url, collection, skip) in enumerate(repos, 1):
            if skip:
                console.print(f"[yellow]⏭️  Skipping {name} documentation[/yellow]")
                continue
                
            console.print(f"[bold cyan]Step {i}: Vectorizing {name} Documentation[/bold cyan]")
            step_start = time.time()
            
            try:
                config = VectorizationConfig(
                    qdrant_url=qdrant_url,
                    collection_name=collection,
                    embedding_model=embedding_model,
                    batch_size=batch_size,
                    include_tests=include_tests,
                    include_generated=include_generated
                )
                
                vectorizer = DevVectorizer(config)
                clone_dir = DEFAULT_CLONE_DIR
                clone_dir.mkdir(parents=True, exist_ok=True)
                target_path = clone_dir / url.split('/')[-1].replace('.git', '')
                
                stats = asyncio.run(vectorizer.run_full_process(url, target_path))
                
                step_duration = time.time() - step_start
                stats_summary.append({
                    "name": f"{name} Docs",
                    "collection": collection,
                    "stats": stats,
                    "duration": step_duration
                })
                
                console.print(f"[green]✅ {name} documentation vectorized in {step_duration:.1f}s[/green]")
                
            except Exception as e:
                console.print(f"[red]✗ {name} documentation vectorization failed: {e}[/red]")
        
        # Process local project
        if not skip_moode:
            console.print(f"[bold cyan]Step 6: Vectorizing moodeSky Local Project[/bold cyan]")
            step_start = time.time()
            
            if MOODESKY_PROJECT.exists():
                try:
                    config = VectorizationConfig(
                        qdrant_url=qdrant_url,
                        collection_name="moodeSky-local",
                        embedding_model=embedding_model,
                        batch_size=batch_size,
                        include_tests=include_tests,
                        include_generated=include_generated
                    )
                    
                    vectorizer = DevVectorizer(config)
                    stats = asyncio.run(vectorizer.run_flutter_process(MOODESKY_PROJECT))
                    
                    step_duration = time.time() - step_start
                    stats_summary.append({
                        "name": "moodeSky Project",
                        "collection": "moodeSky-local",
                        "stats": stats,
                        "duration": step_duration
                    })
                    
                    console.print(f"[green]✅ moodeSky project vectorized in {step_duration:.1f}s[/green]")
                    
                except Exception as e:
                    console.print(f"[red]✗ moodeSky project vectorization failed: {e}[/red]")
            else:
                console.print(f"[yellow]⏭️  moodeSky project not found at {MOODESKY_PROJECT}[/yellow]")
        
        # Display summary
        self._display_summary(stats_summary, time.time() - start_time)
        return True
    
    def search(self, 
              query: str,
              collection_name: str = "sveltekit-docs",
              qdrant_url: str = "http://localhost:6333",
              embedding_model: str = "BAAI/bge-small-en-v1.5",
              limit: int = 5):
        """Search vectorized documentation"""
        config = VectorizationConfig(
            qdrant_url=qdrant_url,
            collection_name=collection_name,
            embedding_model=embedding_model
        )
        
        vectorizer = DevVectorizer(config)
        if not vectorizer.setup_collection():
            console.print("[red]✗ Failed to access collection[/red]")
            return False
        
        asyncio.run(vectorizer.test_search(query, limit))
        return True
    
    def status(self,
              collection_name: str = "sveltekit-docs",
              qdrant_url: str = "http://localhost:6333"):
        """Show status of Qdrant collection"""
        try:
            from qdrant_client import QdrantClient
            
            client = QdrantClient(url=qdrant_url)
            collections = client.get_collections().collections
            collection_names = [c.name for c in collections]
            
            if collection_name not in collection_names:
                console.print(f"[red]✗ Collection '{collection_name}' does not exist[/red]")
                console.print(f"[yellow]Available collections: {', '.join(collection_names) or 'None'}[/yellow]")
                return False
            
            collection = client.get_collection(collection_name)
            
            status_table = Table(title=f"Qdrant Collection Status: {collection_name}")
            status_table.add_column("Property", style="cyan")
            status_table.add_column("Value", style="white")
            
            status_table.add_row("Qdrant URL", qdrant_url)
            status_table.add_row("Collection Name", collection_name)
            status_table.add_row("Vectors Count", str(collection.vectors_count))
            status_table.add_row("Points Count", str(collection.points_count))
            status_table.add_row("Status", collection.status.value)
            
            console.print(status_table)
            console.print(f"[green]✓ Collection '{collection_name}' is ready with {collection.points_count} points[/green]")
            return True
            
        except Exception as e:
            console.print(f"[red]✗ Failed to get collection status: {e}[/red]")
            return False
    
    def setup_mcp(self,
                 collection_name: str = "sveltekit-docs",
                 qdrant_url: str = "http://localhost:6333",
                 embedding_model: str = "BAAI/bge-small-en-v1.5"):
        """Generate MCP configuration for Claude Code"""
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
        
        console.print(f"\n[green]✓ Configuration ready for collection: {collection_name}![/green]")
        return True
    
    def _vectorize_repo(self, repo_url, collection_name, 
                       qdrant_url="http://localhost:6333",
                       embedding_model="BAAI/bge-small-en-v1.5",
                       batch_size=100,
                       include_tests=False,
                       include_generated=False,
                       force_update=False):
        """Internal method to vectorize a repository"""
        config = VectorizationConfig(
            qdrant_url=qdrant_url,
            collection_name=collection_name,
            embedding_model=embedding_model,
            batch_size=batch_size,
            include_tests=include_tests,
            include_generated=include_generated
        )
        
        console.print(f"[bold blue]Vectorizing: {repo_url}[/bold blue]")
        console.print(f"[cyan]Collection: {collection_name}[/cyan]")
        
        try:
            vectorizer = DevVectorizer(config)
            clone_dir = DEFAULT_CLONE_DIR
            clone_dir.mkdir(parents=True, exist_ok=True)
            target_path = clone_dir / repo_url.split('/')[-1].replace('.git', '')
            
            stats = asyncio.run(vectorizer.run_full_process(repo_url, target_path))
            
            console.print(f"[green]✅ Vectorization complete![/green]")
            console.print(f"[cyan]Run 'dev-rag setup-mcp --collection {collection_name}' to generate MCP configuration[/cyan]")
            return True
            
        except Exception as e:
            console.print(f"[red]✗ Vectorization failed: {e}[/red]")
            return False
    
    def _display_summary(self, stats_summary, total_duration):
        """Display vectorization summary"""
        console.print(f"\n[bold green]🎉 Comprehensive Vectorization Complete![/bold green]")
        
        if not stats_summary:
            console.print("[yellow]No repositories were processed[/yellow]")
            return
        
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
            f"[bold]{len(stats_summary)} Collections[/bold]",
            f"[bold]{total_files}[/bold]",
            f"[bold]{total_chunks}[/bold]",
            f"[bold]{total_duration:.1f}s[/bold]"
        )
        
        console.print(summary_table)
        console.print(f"\n[bold green]🎯 All collections are ready for use with Claude Code MCP![/bold green]")


def main():
    """Entry point for Fire CLI"""
    fire.Fire(DevRagCLI)


if __name__ == "__main__":
    main()