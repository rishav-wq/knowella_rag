/**
 * Retrieval Service
 * Handles hybrid search: semantic (vector) + keyword (BM25)
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
  }

  /**
   * Retrieve relevant chunks using hybrid search (semantic + BM25)
   * @param {string} question - User's question
   * @param {number} topK - Number of chunks to retrieve
   * @param {number} similarityThreshold - Minimum similarity score (0-1)
   * @param {number} semanticWeight - Weight for semantic search (0-1), default 0.7
   * @returns {Promise<Array>}
   */
  async retrieve(question, topK = 5, similarityThreshold = 0.3, semanticWeight = 0.7) {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(question, topK);
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        console.log(`💾 Cache hit for question: "${question.substring(0, 50)}..."`);
        return cached;
      }
      
      console.log(`🔍 Hybrid retrieval for: "${question}"`);
      
      // 1. Semantic search - get more candidates for reranking
      const semanticCandidates = topK * 2; // Get 2x candidates
      const questionEmbedding = await embeddingsService.generateEmbedding(question);
      const semanticResults = await vectorStoreService.search(questionEmbedding, semanticCandidates);
      
      // 2. BM25 keyword search - also get 2x candidates
      const bm25Results = bm25Service.search(question, semanticCandidates);
      
      // 3. Combine and rerank using weighted hybrid scoring
      const hybridResults = this.hybridRerank(
        semanticResults, 
        bm25Results, 
        semanticWeight, 
        topK
      );
      
      // 4. Filter by similarity threshold (based on final hybrid score)
      const filteredResults = hybridResults.filter(r => r.score >= similarityThreshold);
      
      console.log(`  ✓ Semantic: ${semanticResults.length} | BM25: ${bm25Results.length} | Hybrid: ${filteredResults.length} (threshold: ${similarityThreshold})`);
      
      if (filteredResults.length === 0) {
        console.warn(`  ⚠️  No chunks above similarity threshold!`);
        console.warn(`  Highest score: ${hybridResults[0]?.score || 'N/A'}`);
      }
      
      // Log top results for debugging
      filteredResults.slice(0, 3).forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.title} (hybrid: ${result.score.toFixed(3)}, sem: ${result.semanticScore?.toFixed(3)}, bm25: ${result.bm25Score?.toFixed(3)})`);
      });
      
      // Cache the results
      this.cache.set(cacheKey, filteredResults);
      
      return filteredResults;
      
    } catch (error) {
      console.error('❌ Error during retrieval:', error.message);
      throw error;
    }
  }

  /**
   * Hybrid reranking: combine semantic and BM25 scores
   * @param {Array} semanticResults - Results from vector search with {id, score, ...}
   * @param {Array} bm25Results - Results from BM25 with {id, score}
   * @param {number} semanticWeight - Weight for semantic (0-1), BM25 gets (1-weight)
   * @param {number} topK - Number of final results
   * @returns {Array}
   */
  hybridRerank(semanticResults, bm25Results, semanticWeight = 0.7, topK = 5) {
    const bm25Weight = 1 - semanticWeight;
    
    // Semantic scores from Qdrant are already normalized (cosine similarity 0-1)
    // Only normalize BM25 scores
    const normalizedBM25 = this.normalizeScores(bm25Results);
    
    // Create maps for fast lookup
    const semanticMap = new Map(semanticResults.map(r => [r.id, r]));
    const bm25Map = new Map(normalizedBM25.map(r => [r.id, r.score]));
    
    // Collect all unique document IDs
    const allIds = new Set([
      ...semanticResults.map(r => r.id),
      ...normalizedBM25.map(r => r.id)
    ]);
    
    // Calculate hybrid scores
    const hybridResults = [];
    
    for (const id of allIds) {
      const semanticResult = semanticMap.get(id);
      const bm25Score = bm25Map.get(id) || 0;
      const semanticScore = semanticResult?.score || 0;
      
      // Weighted combination
      const hybridScore = (semanticScore * semanticWeight) + (bm25Score * bm25Weight);
      
      // Use semantic result as base (has all metadata)
      if (semanticResult) {
        hybridResults.push({
          ...semanticResult,
          score: hybridScore,
          semanticScore: semanticScore,
          bm25Score: bm25Score
        });
      } else {
        // BM25-only result (rare, but possible)
        hybridResults.push({
          id: id,
          score: hybridScore,
          semanticScore: 0,
          bm25Score: bm25Score
        });
      }
    }
    
    // Sort by hybrid score and return top K
    return hybridResults
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Normalize scores to 0-1 range using min-max normalization
   * @param {Array} results - Array of {id, score, ...} objects
   * @returns {Array} - Array with normalized scores
   */
  normalizeScores(results) {
    if (results.length === 0) return [];
    
    const scores = results.map(r => r.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const range = maxScore - minScore;
    
    // Avoid division by zero
    if (range === 0) {
      return results.map(r => ({ ...r, score: 1.0 }));
    }
    
    return results.map(r => ({
      ...r,
      score: (r.score - minScore) / range
    }));
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
