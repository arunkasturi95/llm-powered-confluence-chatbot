# LLM-Powered Confluence Chatbot (RAG-Based)

A Retrieval-Augmented Generation (RAG) chatbot that semantically indexes Confluence spaces and answers user queries with the help of Large Language Models (LLMs).

This project replaces the regular Confluence search functionality with **vector search + LLM reasoning** for answering user queries in a natural way with citations.

---

## 🚀 Features (Phase 1)

- Crawls and indexes all Confluence pages
- Embeds all Confluence pages into vector space (OpenAI Embeddings API)
- Stores all embeddings in ChromaDB vector database
- Semantic search with cosine similarity
- LLM-generated answers with the help of Claude (Anthropic)
- Source attribution: page title, URL
- Simple web UI chat interface

---

## 🧠 Tech Stack

**Backend**
- Node.js (ESM)
- Express.js
- Axios
- OpenAI Embeddings API
- Anthropic Claude API
- ChromaDB vector database (self-hosted)

**Frontend**
- HTML
- JavaScript
- Fetch API

---

## 🏗️ High-Level Flow

1. `/crawl-all`
   - Fetches all Confluence pages
   - Cleans HTML
   - Embeds all pages
   - Stores all embeddings in ChromaDB

2. `/chat`
   - Embeds user query
   - Retrieves top K most relevant pages from ChromaDB
   - Passes context and user query to Claude
   - Returns answer with attribution

---

## ⚙️ Setup

### 1. Environment Variables

Create a `.env` file with the following variables (see `.env.example` for the file contents).

### 2. Start ChromaDB Server 
### bash
$env:CHROMA_SERVER_CORS_ALLOW_ORIGINS='["http://localhost:3000"]'
py -3.10 -m uvicorn chromadb.app:app --host localhost --port 8000

### 3. Start Application
### terminal
npm install
npm start
### browser
http://localhost:3000

### 4. Index Confluence documentation
http://localhost:3000/crawl-all

### NOTES
- ChromaDB is run as a separate process
- Embeddings are computed externally using OpenAI
- LLM reasoning is provided by Claude
- This phase skips sophisticated chunking, reranking, and caching
