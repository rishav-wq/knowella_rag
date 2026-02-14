/**
 * Retrieval Service
 * Handles semantic search and retrieval from Qdrant
 */

const embeddingsService = require('./embeddings.service');
const vectorStoreService = require('./vectorStore.service');
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
   * Retrieve relevant chunks for a question
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
      
      // 1. Generate embedding for the question
      const questionEmbedding = await embeddingsService.generateEmbedding(question);
      
      // 2. Search Qdrant for similar chunks
      const results = await vectorStoreService.search(questionEmbedding, topK);
      
      // 3. Filter by similarity threshold
      const filteredResults = results.filter(r => r.score >= similarityThreshold);
      
      console.log(`  ✓ Found ${filteredResults.length} relevant chunks (threshold: ${similarityThreshold})`);
      
      if (filteredResults.length === 0) {
        console.warn(`  ⚠️  No chunks above similarity threshold!`);
        console.warn(`  Highest score: ${results[0]?.score || 'N/A'}`);
      }
      
      // Log top results for debugging
      filteredResults.slice(0, 3).forEach((result, i) => {
        console.log(`  ${i + 1}. ${result.title} (score: ${result.score.toFixed(3)})`);
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
