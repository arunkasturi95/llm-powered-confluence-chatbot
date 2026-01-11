# System Architecture

## High-Level Architecture

User → Chat UI → Express API → Vector Search → Claude → Response

## Phases

### Phase 1: Keyword-Based Retrieval (Current)
- User query → CQL search
- Fetch top Confluence pages
- Summarize with Claude

### Phase 2: Semantic Knowledge Retrieval
- Crawl all Confluence pages
- Chunk content
- Store embeddings in vector DB
- Query by semantic similarity

### Phase 3: Intelligent Reasoning
- Multi-document synthesis
- Fact extraction
- Confidence scoring
- Source citation

## Design Principles

- Separation of concerns
- Stateless APIs
- Idempotent crawling
- Observability and logging
