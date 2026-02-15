/**
 * Retrieval Service
 * Handles hybrid search (BM25 + Semantic) with Reciprocal Rank Fusion
 */

const embeddingsService = require('./embeddings.service');
const vectorStoreService = require('./vectorStore.service');
const bm25Service = require('./bm25.service');
const NodeCache = require('node-cache');

class RetrievalService {
  constructor() {
    // LRU cache for retrieval results (1 hour TTL)
    this.cache = new NodeCache({
      stdTTL: 3600,  // 1 hour
      maxKeys: 1000,
      checkperiod: 600 // Check for expired keys every 10 minutes
    });

    // Hybrid search configuration
    this.hybridEnabled = true;  // Set to false to use semantic-only
    this.rrfK = 60;  // Reciprocal Rank Fusion constant
  }

  /**
   * Retrieve relevant chunks using hybrid search (BM25 + Semantic)
   * @param {string} question - User's question
   * @param {number} topK - Number of chunks to retrieve
   * @param {number} similarityThreshold - Minimum similarity score (0-1)
   * @returns {Promise<Array>}
   */
  async retrieve(question, topK = 5, similarityThreshold = 0.3) {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(question, topK);
      const cached = this.cache.get(cacheKey);

      if (cached) {
        console.log(`💾 Cache hit for question: "${question.substring(0, 50)}..."`);
        return cached;
      }

      console.log(`🔍 Retrieving chunks for: "${question}"`);

      let results;

      if (this.hybridEnabled) {
        // Use hybrid search (BM25 + Semantic with RRF)
        results = await this.hybridSearch(question, topK * 2); // Get more candidates for fusion

        // Take top K after fusion
        results = results.slice(0, topK);

        // Filter by similarity threshold (using fused score)
        results = results.filter(r => r.score >= similarityThreshold);
      } else {
        // Use semantic-only search
        results = await this.semanticSearch(question, topK, similarityThreshold);
      }

      console.log(`  ✓ Found ${results.length} relevant chunks (threshold: ${similarityThreshold})`);

      if (results.length === 0) {
        console.warn(`  ⚠️  No chunks above threshold!`);
      }

      // Log top results for debugging
      results.slice(0, 3).forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.title} (score: ${result.score.toFixed(3)})`);
      });

      // Cache the results
      this.cache.set(cacheKey, results);

      return results;

    } catch (error) {
      console.error('❌ Error during retrieval:', error.message);
      throw error;
    }
  }

  /**
   * Hybrid search using BM25 + Semantic with Reciprocal Rank Fusion
   * @param {string} question - User's question
   * @param {number} topK - Number of results to return
   * @returns {Promise<Array>}
   */
  async hybridSearch(question, topK = 10) {
    console.log(`  🔀 Hybrid Search (BM25 + Semantic with RRF)`);

    // 1. Get semantic results first (has all metadata)
    const questionEmbedding = await embeddingsService.generateEmbedding(question);
    const semanticResults = await vectorStoreService.search(questionEmbedding, topK);
    console.log(`  🧠 Semantic returned ${semanticResults.length} results`);

    // 2. Expand query for better BM25 keyword matching
    const expandedQuery = this.expandQuery(question);
    if (expandedQuery !== question) {
      console.log(`  🔍 Query expanded: "${expandedQuery.substring(0, 80)}..."`);
    }

    // 3. Get BM25 results with expanded query
    const bm25Results = bm25Service.search(expandedQuery, topK);
    console.log(`  📊 BM25 returned ${bm25Results.length} results`);

    // 4. Fetch full metadata for BM25-only results
    const bm25OnlyIds = bm25Results
      .map(r => r.id)
      .filter(id => !semanticResults.some(sr => sr.id === id));

    let bm25OnlyChunks = [];
    if (bm25OnlyIds.length > 0) {
      bm25OnlyChunks = await vectorStoreService.getChunksByIds(bm25OnlyIds);
    }

    // 5. Apply Reciprocal Rank Fusion (RRF)
    const fusedResults = this.reciprocalRankFusion(
      bm25Results,
      semanticResults,
      bm25OnlyChunks
    );

    return fusedResults;
  }

  /**
   * Reciprocal Rank Fusion: Combines multiple ranked lists
   * RRF Score = sum(1 / (k + rank)) across all lists, normalized to 0-1
   * @param {Array} bm25Results - BM25 ranked results (has IDs only)
   * @param {Array} semanticResults - Semantic search results (has full metadata)
   * @param {Array} bm25OnlyChunks - Full metadata for BM25-only results
   * @returns {Array} - Fused and re-ranked results with normalized scores
   */
  reciprocalRankFusion(bm25Results, semanticResults, bm25OnlyChunks = []) {
    const scoreMap = new Map(); // chunkId -> {score, data}
    const bm25OnlyMap = new Map(bm25OnlyChunks.map(c => [c.id, c]));

    // Process semantic results first (has full metadata)
    semanticResults.forEach((result, rank) => {
      const rrfScore = 1 / (this.rrfK + rank + 1);
      scoreMap.set(result.id, {
        score: rrfScore,
        id: result.id,
        text: result.text,
        title: result.title,
        url: result.url,
        metadata: result.metadata
      });
    });

    // Process BM25 results
    bm25Results.forEach((result, rank) => {
      const rrfScore = 1 / (this.rrfK + rank + 1);

      if (scoreMap.has(result.id)) {
        // Chunk already in semantic results, just add BM25 score
        scoreMap.get(result.id).score += rrfScore;
      } else {
        // BM25-only result, get full metadata
        const fullChunk = bm25OnlyMap.get(result.id);
        if (fullChunk) {
          scoreMap.set(result.id, {
            score: rrfScore,
            id: result.id,
            text: fullChunk.text,
            title: fullChunk.title,
            url: fullChunk.url,
            metadata: fullChunk.metadata
          });
        }
      }
    });

    // Convert to array and sort by fused score
    let fusedResults = Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score);

    // Normalize scores to 0-1 range for threshold comparison
    if (fusedResults.length > 0) {
      const maxScore = fusedResults[0].score;
      const minScore = fusedResults[fusedResults.length - 1].score;
      const scoreRange = maxScore - minScore;

      if (scoreRange > 0) {
        fusedResults = fusedResults.map(result => ({
          ...result,
          score: (result.score - minScore) / scoreRange
        }));
      } else {
        // All scores are the same, set to 1.0
        fusedResults = fusedResults.map(result => ({
          ...result,
          score: 1.0
        }));
      }
    }

    console.log(`  ✨ RRF fused ${fusedResults.length} unique chunks`);
    if (fusedResults.length > 0) {
      console.log(`  🏆 Top normalized score: ${fusedResults[0].score.toFixed(4)}`);
    }

    return fusedResults;
  }

  /**
   * Semantic-only search (fallback method)
   * @param {string} question - User's question
   * @param {number} topK - Number of chunks to retrieve
   * @param {number} similarityThreshold - Minimum similarity score
   * @returns {Promise<Array>}
   */
  async semanticSearch(question, topK, similarityThreshold) {
    console.log(`  🧠 Semantic Search Only`);

    // 1. Generate embedding for the question
    const questionEmbedding = await embeddingsService.generateEmbedding(question);

    // 2. Search Qdrant for similar chunks
    const results = await vectorStoreService.search(questionEmbedding, topK);

    // 3. Filter by similarity threshold
    const filteredResults = results.filter(r => r.score >= similarityThreshold);

    return filteredResults;
  }

  /**
   * Expand query with relevant keywords for better BM25 matching
   * @param {string} question - Original question
   * @returns {string} - Expanded question
   */
  expandQuery(question) {
    const lowerQuestion = question.toLowerCase();

    // Expansion rules based on question patterns
    const expansions = [];

    // Results/benefits/outcomes questions → add metrics keywords
    if (/(results?|benefits?|outcomes?|improvements?|impact|achieve|see|experience)/i.test(question)) {
      expansions.push(
        'percentage', 'metrics', 'statistics', 'improvements',
        'increase', 'decrease', 'reduction', 'efficiency',
        'productivity', 'engagement', 'data-entry', 'accidents',
        'insights', 'actionable', 'proven', 'ROI'
      );
    }

    // Statistics/numbers questions
    if (/(how much|how many|percentage|percent|number|stat|metric)/i.test(question)) {
      expansions.push(
        '70percent', '62percent', '45percent', '1.8x',
        'increase', 'reduction', 'drop', 'less', 'more'
      );
    }

    // Efficiency/performance questions
    if (/(fast|quick|efficient|speed|time|performance)/i.test(question)) {
      expansions.push(
        'data-entry', 'productivity', 'workflow', 'automation',
        'time-savings', 'faster', 'reduction'
      );
    }

    // Safety/accidents questions
    if (/(safety|accident|injury|incident|compliance|hazard)/i.test(question)) {
      expansions.push(
        'workplace', 'accidents', 'injuries', 'compliance',
        'risk', 'ergonomics', 'OSHA', 'safety'
      );
    }

    // AI/technology questions
    if (/(AI|artificial intelligence|technology|automation|digital)/i.test(question)) {
      expansions.push(
        'AI-powered', 'automation', 'digitize', 'no-code',
        'machine-learning', 'intelligent', 'smart'
      );
    }

    // Remove duplicates and filter out words already in question
    const questionWords = new Set(lowerQuestion.split(/\s+/));
    const uniqueExpansions = [...new Set(expansions)]
      .filter(word => !questionWords.has(word.toLowerCase()));

    if (uniqueExpansions.length === 0) {
      return question; // No expansion needed
    }

    // Add expansions to the end of the question
    return `${question} ${uniqueExpansions.join(' ')}`;
  }

  /**
   * Generate cache key from question and parameters
   * @param {string} question
   * @param {number} topK
   * @returns {string}
   */
  getCacheKey(question, topK) {
    return `${question.toLowerCase().trim()}_k${topK}`;
  }

  /**
   * Clear retrieval cache
   */
  clearCache() {
    this.cache.flushAll();
    console.log('🗑️  Retrieval cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {object}
   */
  getCacheStats() {
    return {
      keys: this.cache.keys().length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses,
      hitRate: this.cache.getStats().hits / 
               (this.cache.getStats().hits + this.cache.getStats().misses) || 0
    };
  }
}

module.exports = new RetrievalService();
