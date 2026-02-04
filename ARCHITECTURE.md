# System Architecture

This phase will develop a **RAG-based architecture** for enterprise Confluence knowledge management.

## Components

1. **Confluence REST API**
   - Gives access to all pages
   - Supports pagination & metadata
   - Enhanced content: `body.storage`

2. **Crawler & Indexer**
   - Crawls all pages
   - Removes HTML → cleans text
   - Excludes pages with < 200 characters
   - Computes embeddings using OpenAI
   - Stores embeddings & metadata in ChromaDB

3. **ChromaDB Vector Store**
   - Stores embeddings with:
     - `id`: UUID
     - `document`: page text
     - `embedding`: vector
     - `metadata`: title & URL
   - Enables **semantic search / nearest neighbors**

4. **Query & RAG**
   - User submits a question via `/chat`
   - Question → vector embedding
   - Semantic search in ChromaDB → top 5 relevant docs
   - Claude 3 Haiku analyzes context & question → final answer
   - Produces answer & sources for user

5. **Web Frontend**
   - Simple UI (`index.html`)
   - Makes POST `/chat` requests
   - Shows answer & sources
   - Chat-like interface

## Sequence Flow

1. User clicks **Crawl All** → triggers GET `/crawl-all`
2. Server fetches Confluence pages → cleans → embeds → stores in ChromaDB
3. User asks a question → POST `/chat`
4. Server:
   - Embeds question
   - Queries ChromaDB
   - Passes top 5 docs to Claude 3 Haiku
5. Claude returns concise answer
6. Server returns answer + sources → displayed in UI

## Logical Diagram

Confluence API → Crawler → Text Preprocessing → Embeddings → ChromaDB
↑ ↓
User Question → Embedding → Chroma Query → Claude 3 → Answer + Sources → UI

## Physical Architecture

- **Server**: Node.js, Express
- **Vector DB**: ChromaDB running locally (localhost:8000)
- **LLM**: Claude 3 Haiku (Anthropic API)
- **Frontend**: Static HTML/CSS
