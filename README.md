# Knowella RAG Bot - Project 1

Retrieval Augmented Generation chatbot for Knowella website.

## Infrastructure Overview

### Services

1. **Ollama** (Port 11434)
   - Runs LLM models locally (Llama 3.2, Mistral, etc.)
   - Handles text generation and embeddings
   - Models are downloaded on first use

2. **Qdrant** (Port 6333)
   - Vector database for similarity search
   - Stores embedded chunks of Knowella content
   - Provides fast retrieval of relevant context

3. **Node.js API** (Port 3000)
   - Express server handling all requests
   - Orchestrates RAG flow (retrieve → ground → generate)
   - Rate limiting and CORS protection

## Getting Started

### Prerequisites
- Docker Desktop installed
- At least 8GB RAM available
- 10GB free disk space (for models)

### Step 1: Start the Infrastructure

```bash
# Start all services
docker-compose up -d

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 2: Download LLM Model

After services start, download a model to Ollama:

```bash
# Pull a small model (recommended for testing)
docker exec -it knowella_ollama ollama pull llama3.2:3b

# Or a larger model (better quality, slower)
docker exec -it knowella_ollama ollama pull llama3.2:8b
```

### Step 3: Test the API

```bash
# Health check
curl http://localhost:3000/health

# Should return: {"status": "ok", ...}
```

### Step 4: Install Node Dependencies

```bash
cd api
npm install
```

## Next Steps

1. ✅ Infrastructure setup (you are here)
2. ⏳ Build ingestion pipeline (scrape → chunk → embed → store)
3. ⏳ Build chat endpoint (retrieve → generate with citations)
4. ⏳ Build WordPress widget
5. ⏳ Add admin settings

## Useful Commands

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# View API logs
docker-compose logs -f api

# Access Qdrant web UI
# Open browser: http://localhost:6333/dashboard

# List downloaded Ollama models
docker exec -it knowella_ollama ollama list
```

## Architecture

```
User Question
    ↓
WordPress Widget → API Server → Ollama (LLM)
                        ↓
                    Qdrant (Vector DB)
                        ↓
                Answer + Citations
```

## Port Reference

- **3000** - API Server
- **6333** - Qdrant HTTP API
- **6334** - Qdrant gRPC (optional)
- **11434** - Ollama API
