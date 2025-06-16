# CLAUDE.md

**Speak in Japanese!**

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Dependency Management:**
- `uv sync` - Install dependencies (preferred)
- `uv sync --dev` - Install with development dependencies
- `pip install -e .` - Alternative installation method

**Code Quality:**
- `uv run black .` - Format code
- `uv run ruff check .` - Lint code
- `uv run pytest` - Run tests

**Application Commands:**
- `uv run dev-rag vectorize` - Vectorize SvelteKit documentation (default)
- `uv run dev-rag vec_sveltekit` - Vectorize SvelteKit documentation
- `uv run dev-rag vec_svelte` - Vectorize Svelte documentation
- `uv run dev-rag vec_tauri` - Vectorize Tauri documentation
- `uv run dev-rag vec_bluesky` - Vectorize BlueSky documentation
- `uv run dev-rag vec_atproto` - Vectorize AT Protocol documentation
- `uv run dev-rag vec_moode` - Vectorize local moodeSky project
- `uv run dev-rag search "query"` - Search vectorized data
- `uv run dev-rag status` - Check collection status
- `uv run dev-rag vector_all` - Vectorize all repositories
- `uv run dev-rag setup_mcp` - Generate MCP configuration

**Fire CLI Features:**
- Automatic help generation: `uv run dev-rag -- --help`
- Command help: `uv run dev-rag vector_all -- --help`
- Parameter passing: `uv run dev-rag search "query" --collection_name tauri-docs`

## Architecture Overview

This is a Python CLI tool that vectorizes development documentation repositories for RAG (Retrieval-Augmented Generation) using Qdrant vector database and FastEmbed embeddings.

**Core Components:**
- `main.py` - Typer-based CLI with multiple commands for different vectorization tasks
- `dev_rag/models.py` - Pydantic data models for configuration and document chunks
- `dev_rag/vectorizer.py` - Core vectorization logic using FastEmbed + Qdrant

**Key Architecture Patterns:**
- Uses async/await for efficient processing of large repositories
- Batch processing for embeddings (configurable batch sizes)
- Memory monitoring with psutil to prevent system overload
- Rich UI for progress tracking and status display
- Retry logic with tenacity for robust API calls

**Data Flow:**
1. Clone/update repositories using GitPython
2. Extract code chunks from various file types (see supported formats below)
3. Generate embeddings using FastEmbed (BAAI/bge-small-en-v1.5)
4. Store vectors in Qdrant collections for MCP integration
5. Enable Claude Code RAG searches via MCP server

**Supported File Types:**
- `.rs` - Rust source code
- `.js` - JavaScript source code
- `.ts` - TypeScript source code
- `.svelte` - Svelte components
- `.html` - HTML files
- `.dart` - Dart source code (legacy)
- `.md/.mdx` - Markdown documentation  
- `.json` - JSON configuration files
- `.yaml/.yml` - YAML configuration files

**Vector Collections:**
- `sveltekit-docs` - SvelteKit official documentation
- `svelte-docs` - Svelte official documentation
- `tauri-docs` - Tauri official documentation
- `bluesky-docs` - BlueSky official documentation
- `atproto-docs` - AT Protocol official documentation
- `moodeSky-local` - Local moodeSky project (SvelteKit + Tauri)

**Local Project Integration:**
- Supports vectorization of the parent moodeSky project
- Automatically detects SvelteKit and Tauri components
- Processes both frontend (Svelte/TypeScript) and backend (Rust) code

## Requirements

- Python 3.12+
- Qdrant server running on `http://localhost:6333` (via Docker)
- uv package manager (preferred) or pip