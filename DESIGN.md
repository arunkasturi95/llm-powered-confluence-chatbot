# Detailed Design

## Indexing Pipeline

### Step 1: Confluence Fetch
- REST API `/content`
- Pagination using `start + limit`
- `expand=body.storage`

### Step 2: Content Cleaning
- Remove HTML tags
- Normalize whitespaces
- Remove small content < 200 chars

### Step 3: Embedding
- Model: `OpenAI text-embedding-3-small`
- Dimensionality: 1536

### Step 4: Vector Storage
- ChromaDB collection
- Fields: `id`, `document text`, `embedding`, `metadata`(title, URL)

### Query Pipeline

1. User submits question
2. Query -> Embedding
3. Vector Similarity Search Top-5
4. Context Concatenation
5. Prompt Injection into Claude
6. Answer Generation
7. Source Attribution

### Prompt Design

(text)
Answer the question using ONLY the context below.
Limit response to 10-100 words.

### Rationale:

- Prevent hallucinations
- Encourage concise responses
- Enforce grounding in retrieved data

### Error Handling Strategy

- Empty vector results → user guidance
- LLM failures → safe fallback message
- Server errors → HTTP 500

### Security Considerations

- Secrets stored in .env
- .env excluded from Git
- Server-side API calls only
