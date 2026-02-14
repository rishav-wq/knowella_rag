# Knowella RAG – Project 1 Execution Plan

**Project 1:** Knowella Website RAG Bot (Global Widget)  
**Goal:** Chat widget on every Knowella page that answers using knowella.com content only, with citations.  
**Stack:** Open source, self-hosted on DigitalOcean, stateless, no chat history.

---

## 1. Current Status vs Spec

### ✅ Done

| Requirement | Status | Notes |
|-------------|--------|--------|
| Docker Compose (Ollama + Qdrant + API) | ✅ | `docker-compose.yml` |
| Knowella sitemap ingestion | ✅ | `sitemap.service.js` – WordPress sitemap, include/exclude |
| Fetch HTML → clean → chunk → embed → Qdrant | ✅ | Scraper, chunker, embeddings, vectorStore |
| Content hash + dedupe (skip unchanged pages) | ✅ | `hasContentChanged`, `content_hash` in payload |
| Collection `knowella_pages` | ✅ | `vectorStore.service.js` |
| Chunk metadata: url, title, chunk_index, last_crawled, content_hash, collection_name | ✅ | `section_heading` not in payload yet (see gaps) |
| POST /chat/knowella | ✅ | RAG flow: retrieve → ground → generate |
| Retrieval cache (LRU, 1–6h TTL) | ✅ | `node-cache`, 1h TTL |
| Citations with URLs in every answer | ✅ | `extractCitations`, returned in response |
| Hallucination protection (similarity threshold, graceful “no info”) | ✅ | threshold 0.3, friendly fallback when no chunks |
| Bot behavior in system prompt (tone, rules, disclaimer) | ✅ | `getDefaultBotConfig()` – not yet from WP |
| Rate limit chat: 30 req/min/IP | ✅ | `chatLimiter` |
| Rate limit ingestion: 10 req/min/IP | ✅ | `ingestionLimiter` |
| CORS | ✅ | `WORDPRESS_DOMAIN` |
| Request size limit | ✅ | `express.json({ limit: '1mb' })` |
| Health endpoint | ✅ | GET /health |
| LLM timeout | ✅ | 120s in `llm.service.js` |

### ⏳ Gaps (To Implement)

| Gap | Spec | Action |
|-----|------|--------|
| **Token-protected ingestion** | Ingestion endpoints must require token | Add middleware: check `Authorization: Bearer <token>` or `X-Ingestion-Token` on `/ingest/*` |
| **section_heading in chunk metadata** | Required per spec | Add to chunker output and Qdrant payload (e.g. first sentence or heading) |
| **Nginx reverse proxy** | In front of API on DO | Add Nginx service/config for production deployment |
| **Daily re-ingestion job** | Knowella updates within 24h | Cron or scheduler (e.g. node-cron in API or DO cron hitting POST /ingest/knowella with token) |
| **WordPress widget** | Floating bubble, chat panel, mobile, sessionStorage only | Build JS widget + WP plugin or theme script |
| **Admin behavior settings in WP** | Tone, rules, disclaimers, formatting | WP settings page + API that reads config (or API endpoint that WP calls to push config) |
| **BGE-small embeddings** | Spec recommends BGE-small (CPU-friendly) | Optional: currently using `nomic-embed-text` (768 dims). To match spec exactly, switch to BGE-small (384 dims) and recreate collection. |

---

## 2. Architecture (Current)

```
User Question
    ↓
WordPress Widget (to build)  →  POST /chat/knowella  →  API (Express)
                                        ↓
                              Retrieval (with cache) → Qdrant (knowella_pages)
                              LLM (Ollama)           → Answer + citations
```

**Ingestion:**  
Sitemap → URLs → Scrape → Hash/dedupe → Chunk → Embed (Ollama) → Upsert Qdrant.

---

## 3. Recommended Execution Order (Project 1 Only)

### Phase 1 – Harden backend (quick wins)
1. **Token-protect ingestion**  
   - Middleware: require `INGESTION_TOKEN` on `POST /ingest/knowella` and `POST /ingest/single`.  
   - Reject 401 if missing or wrong.
2. **Add section_heading to chunks**  
   - In chunker: set `section_heading` (e.g. first sentence or first heading).  
   - Add to vectorStore payload and (if needed) re-run ingestion once.

### Phase 2 – Automation
3. **Daily re-ingestion**  
   - Option A: Cron on host/DO that calls `POST /ingest/knowella` with token.  
   - Option B: `node-cron` inside API to run ingestion once per day.  
   - Keep current dedupe (content_hash) so only changed pages are reprocessed.

### Phase 3 – Production hosting
4. **Nginx reverse proxy**  
   - Add Nginx container/service in front of API.  
   - Configure rate limits (30/min for chat, 10/min for ingest), timeouts, and CORS at Nginx if desired (or keep in Express).

### Phase 4 – WordPress
5. **Knowella widget**  
   - Floating bubble (bottom-right).  
   - Chat panel: send `{ question }` to `POST /chat/knowella`, display answer + citations.  
   - Use sessionStorage only for in-page history; no server-side storage.  
   - Mobile responsive.  
   - Load via small WP plugin or theme header/footer script.
6. **Admin behavior settings (WP)**  
   - WP settings page: tone, response rules, disclaimers, formatting.  
   - Stored in WP (options or custom endpoint).  
   - API gets config via env, or WP sends it in a dedicated “config” endpoint the widget/API can read.  
   - Inject these into the system prompt in `llm.service.js` (replace or extend `getDefaultBotConfig()`).

### Phase 5 – Testing & launch
7. **Golden test set**  
   - 30 Knowella questions; run regularly; check citations and grounding.  
8. **Docs**  
   - Deployment (DigitalOcean), env vars, ingestion token, cron, Nginx, WP integration.

---

## 4. API Routes (Project 1)

| Method | Route | Protection | Purpose |
|--------|--------|------------|--------|
| GET | /health | None | Health check |
| GET | / | None | API info |
| POST | /chat/knowella | Rate limit 30/min | RAG chat (Knowella only) |
| POST | /ingest/knowella | Token + rate limit 10/min | Full sitemap ingestion |
| POST | /ingest/single | Token + rate limit 10/min | Single-URL test ingest |
| GET | /stats | Optional (or same token) | Cache + vector stats |

---

## 5. Env / Config Checklist

- `OLLAMA_URL`, `QDRANT_URL` – already used  
- `INGESTION_TOKEN` – set in `.env`; **use in middleware** for `/ingest/*`  
- `WORDPRESS_DOMAIN` – for CORS (production: `https://knowella.com`)  
- `RATE_LIMIT_MAX` – 30 for chat  
- `LLM_MODEL` – e.g. `llama3.2:3b` or `llama3.2:8b`  
- `EMBEDDING_MODEL` – `nomic-embed-text` (or BGE-small if you switch)

---

## 6. Definition of Done (Project 1)

- [ ] RAG responses grounded in Knowella content only  
- [ ] Citations (URLs) in every answer  
- [ ] No server-side chat history  
- [ ] Rate limiting (30/min chat, 10/min ingest) + timeouts  
- [ ] Ingestion endpoints token-protected  
- [ ] Daily re-ingestion with content_hash dedupe  
- [ ] Widget on all Knowella pages (bubble + chat + citations)  
- [ ] Bot behavior configurable via WP settings  
- [ ] Nginx in front of API for production  
- [ ] 30-question golden test set run and documented  

---

*This plan focuses only on Project 1 (Knowella Website RAG Bot). Project 2 (OSHA bot) is separate: different collection, routes, and WP page with email gate.*
