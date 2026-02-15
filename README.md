# Knowella RAG Chatbot

A production-ready Retrieval-Augmented Generation (RAG) chatbot for Knowella's website, featuring hybrid search (BM25 + semantic), streaming responses, and a modern WordPress widget interface.

## 🚀 Features

### Core RAG Capabilities
- **Hybrid Search**: Combines BM25 keyword search with semantic vector search using Reciprocal Rank Fusion (RRF)
- **Advanced Chunking**: Semantic chunking with overlap for better context preservation
- **Streaming Responses**: Real-time token-by-token streaming for better UX
- **Anti-Hallucination**: Strict grounding in source documents with citation tracking
- **Multi-Question Support**: Batch processing via PDF upload

### Technical Features
- **Dual LLM Support**: Switch between local Ollama models or cloud Groq API
- **Vector Database**: Qdrant for fast similarity search
- **Smart Caching**: LRU cache for retrieval results and embeddings
- **Query Expansion**: Automatic keyword expansion for better BM25 matching
- **Rate Limiting**: Built-in API rate limiting and CORS support

### Widget Interface
- **Modern UI**: Purple-themed, responsive chat interface
- **Welcome Screen**: FAQ buttons and conversation history
- **Session Persistence**: Chat history saved across page refreshes
- **Citations**: Clickable source links for transparency
- **WordPress Ready**: Easy-to-install WordPress plugin

## 📋 Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- 4GB+ RAM (for Qdrant vector database)
- Groq API key (or local Ollama installation)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/knowella-rag.git
cd knowella-rag
```

### 2. Configure Environment

```bash
cd api
cp .env.example .env
```

Edit `api/.env` and add your Groq API key:
```env
GROQ_API_KEY=your_groq_api_key_here
```

Get your free API key from: https://console.groq.com/keys

### 3. Start Docker Services

```bash
cd ..
docker-compose up -d
```

This starts:
- **Qdrant** (vector database) on port 6333
- **Ollama** (optional local LLM) on port 11434

### 4. Install Dependencies

```bash
cd api
npm install
```

### 5. Ingest Website Content

First ingestion (crawls and indexes Knowella website):
```bash
curl -X POST http://localhost:3000/ingest/crawl \
  -H "Content-Type: application/json" \
  -H "x-ingestion-token: dev-secret-token-change-in-production" \
  -d '{"url": "https://knowella.com"}'
```

### 6. Start the API Server

```bash
npm run dev
```

API will be available at http://localhost:3000

### 7. Test the Chat Widget

Open `widget-demo.html` in your browser to test the chatbot interface.

## 📦 Project Structure

```
knowella-rag/
├── api/                          # Node.js API server
│   ├── src/
│   │   ├── controllers/          # Route handlers
│   │   ├── services/             # Business logic
│   │   │   ├── bm25.service.js           # BM25 keyword search
│   │   │   ├── chunker.service.js        # Text chunking
│   │   │   ├── embeddings.service.js     # Vector embeddings
│   │   │   ├── llm.service.js            # LLM integration
│   │   │   ├── retrieval.service.js      # Hybrid search & RRF
│   │   │   └── vectorStore.service.js    # Qdrant operations
│   │   ├── config/               # Configuration files
│   │   └── index.js              # Entry point
│   ├── data/                     # BM25 index (gitignored)
│   ├── .env.example              # Environment template
│   └── package.json
├── wordpress/                    # WordPress plugin
│   └── knowella-chat-widget/
│       ├── assets/
│       │   ├── knowella-widget.css
│       │   └── knowella-widget-v4.js
│       └── knowella-chat-widget.php
├── docs/                         # Documentation
├── docker-compose.yml            # Docker services
├── widget-demo.html              # Standalone demo
└── README.md
```

## 🔧 Configuration

### API Configuration (`api/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | 3000 |
| `LLM_PROVIDER` | LLM backend (`ollama` or `groq`) | `groq` |
| `GROQ_API_KEY` | Groq API key | Required for cloud |
| `GROQ_MODEL` | Groq model to use | `llama-3.1-8b-instant` |
| `QDRANT_URL` | Qdrant connection URL | `http://qdrant:6333` |
| `CHAT_TOP_K` | Number of chunks to retrieve | 5 |
| `RATE_LIMIT_MAX` | Max requests per window | 30 |

### Widget Configuration (`widget-demo.html`)

```javascript
window.knowellaConfig = {
    apiUrl: 'http://localhost:3000/chat/knowella',
    theme: 'light',
    logoUrl: 'wordpress/knowella-chat-widget/assets/logo2.png'
};
```

## 🎯 Usage

### Chat API

**Endpoint**: `POST /chat/knowella`

```bash
curl -X POST http://localhost:3000/chat/knowella \
  -H "Content-Type: application/json" \
  -d '{"question": "What services does Knowella offer?"}'
```

**Response**:
```json
{
  "answer": "Knowella offers...",
  "citations": [
    {
      "title": "Services - Knowella",
      "url": "https://knowella.com/services"
    }
  ]
}
```

### Ingestion API

**Re-crawl a URL**:
```bash
curl -X POST http://localhost:3000/ingest/crawl \
  -H "Content-Type: application/json" \
  -H "x-ingestion-token: your-secret-token" \
  -d '{"url": "https://knowella.com/new-page"}'
```

## 🌐 WordPress Installation

### Method 1: Direct Upload

1. Zip the `wordpress/knowella-chat-widget` folder
2. Go to WordPress Admin → Plugins → Add New → Upload Plugin
3. Upload and activate the plugin
4. Configure at Settings → Knowella Chat

### Method 2: Manual Installation

1. Copy `wordpress/knowella-chat-widget` to `wp-content/plugins/`
2. Activate in WordPress Admin → Plugins
3. Configure settings

## 🚀 Deployment

### Production Checklist

- [ ] Change `INGESTION_TOKEN` in production `.env`
- [ ] Set `NODE_ENV=production`
- [ ] Update `WORDPRESS_DOMAIN` for CORS
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Set up SSL certificates
- [ ] Enable Docker restart policies
- [ ] Configure backup for Qdrant data
- [ ] Set up monitoring and logging

See `DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

## 📊 Performance

- **Response Time**: 1-3 seconds (with Groq)
- **Throughput**: 30 requests/minute (configurable)
- **Chunk Retrieval**: <100ms (with caching)
- **Memory Usage**: ~200MB API + ~2GB Qdrant

## 🔍 Hybrid Search Architecture

```
User Question
    ↓
Query Expansion (for BM25)
    ↓
    ├─→ BM25 Search (keyword-based)
    │       ↓
    │   Top 10 results
    │
    └─→ Semantic Search (vector-based)
            ↓
        Top 10 results
            ↓
    Reciprocal Rank Fusion (RRF)
            ↓
    Re-ranked & Normalized Results
            ↓
    Top K chunks (K=5)
            ↓
    LLM Answer Generation
```

## 📚 Documentation

- [Project Plan](docs/PROJECT_1_PLAN.md) - Initial project planning
- [Testing Framework](docs/TESTING_FRAMEWORK.md) - Test cases and validation
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Production deployment
- [CPU Optimization](docs/CPU_OPTIMIZATION_GUIDE.md) - Performance tuning
- [Chunking Analysis](docs/CHUNKING_ANALYSIS.md) - Text chunking strategies
- [Answer Validation](docs/ANSWER_VALIDATION_GUIDE.md) - RAG answer validation guide

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Qdrant](https://qdrant.tech/) - Vector database
- [Groq](https://groq.com/) - Fast LLM inference
- [Ollama](https://ollama.ai/) - Local LLM runtime
- [Cheerio](https://cheerio.js.org/) - Web scraping

---

**Built with ❤️ for Knowella**
