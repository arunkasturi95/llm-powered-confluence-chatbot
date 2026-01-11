# Confluence AI Knowledge Assistant

An enterprise-grade AI assistant that understands and answers questions by reasoning over an entire Confluence knowledge base.

Unlike traditional keyword search, this system:
- Crawls and indexes all Confluence pages
- Converts documentation into vector embeddings
- Uses semantic search + LLM reasoning
- Answers questions like a human knowledge expert

## Why This Project?

Most enterprise documentation bots:
- Rely on keyword matching
- Summarize only top search results
- Fail to reason across multiple documents

This project demonstrates a **Retrieval-Augmented Generation (RAG)** architecture that:
- Scales across thousands of documents
- Produces accurate, context-aware answers
- Links back to authoritative sources

## Features (Current Phase)

- Confluence REST API integration
- Claude 3 Haiku for summarization
- Intelligent CQL query generation
- Document summarization with references

## Planned Features

- Full Confluence space crawling
- Vector embeddings and semantic search
- Multi-document reasoning
- Image and file extraction
- Chat memory and follow-up questions
- Cloud deployment (AWS / Azure)

## Tech Stack

- Node.js (Express)
- Confluence REST API
- Anthropic Claude 3
- Vector DB (planned)
- HTML/CSS frontend

## Architecture Overview

See: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Roadmap

See: [ROADMAP.md](./ROADMAP.md)
