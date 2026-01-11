# Design Decisions

## Why Not Keyword Search?

Keyword search fails when:
- Terminology varies
- Knowledge is spread across documents
- Answers require synthesis

## Why RAG?

Retrieval-Augmented Generation allows:
- Grounded LLM responses
- Lower hallucination
- Enterprise trust

## Why Separate Crawl and Chat?

Crawling is:
- Expensive
- Slow
- Offline

Chat is:
- Real-time
- Lightweight
- Query-only

Decoupling enables scalability.
