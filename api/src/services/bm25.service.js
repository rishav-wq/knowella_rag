const fs = require('fs').promises;
const path = require('path');

/**
 * BM25 Implementation
 * Based on: https://en.wikipedia.org/wiki/Okapi_BM25
 */
class BM25 {
  constructor(documents, k1 = 1.5, b = 0.75) {
    this.documents = documents; // Array of token arrays
    this.k1 = k1; // Term frequency saturation parameter
    this.b = b;   // Length normalization parameter
    this.avgDocLength = 0;
    this.docLengths = [];
    this.idf = new Map(); // Inverse document frequency
    
    this.buildIndex();
  }

  buildIndex() {
    const N = this.documents.length;
    
    // Calculate document lengths and average
    let totalLength = 0;
    for (const doc of this.documents) {
      const length = doc.length;
      this.docLengths.push(length);
      totalLength += length;
    }
    this.avgDocLength = N > 0 ? totalLength / N : 0;
    
    // Calculate IDF for each term
    const termDocCount = new Map();
    
    for (const doc of this.documents) {
      const uniqueTerms = new Set(doc);
      for (const term of uniqueTerms) {
        termDocCount.set(term, (termDocCount.get(term) || 0) + 1);
      }
    }
    
    // IDF(term) = ln((N - df + 0.5) / (df + 0.5) + 1)
    for (const [term, df] of termDocCount) {
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
      this.idf.set(term, idf);
    }
  }

  /**
   * Calculate BM25 score for a query against all documents
   * @param {Array<string>} queryTerms - Array of query tokens
   * @returns {Array<number>} - BM25 scores for each document
   */
  search(queryTerms) {
    const scores = new Array(this.documents.length).fill(0);
    
    for (let docIdx = 0; docIdx < this.documents.length; docIdx++) {
      const doc = this.documents[docIdx];
      const docLength = this.docLengths[docIdx];
      
      // Count term frequencies in document
      const termFreq = new Map();
      for (const term of doc) {
        termFreq.set(term, (termFreq.get(term) || 0) + 1);
      }
      
      // Calculate score for this document
      let score = 0;
      for (const queryTerm of queryTerms) {
        const tf = termFreq.get(queryTerm) || 0;
        if (tf === 0) continue;
        
        const idf = this.idf.get(queryTerm) || 0;
        
        // BM25 formula
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));
        
        score += idf * (numerator / denominator);
      }
      
      scores[docIdx] = score;
    }
    
    return scores;
  }
}

class BM25Service {
  constructor() {
    this.bm25 = null;
    this.documents = [];
    this.documentIds = [];
    this.indexPath = path.join(__dirname, '../../data/bm25-index.json');
  }

  /**
   * Tokenize text into terms for BM25
   * Preserves numbers, percentages, and special terms
   * @param {string} text - Text to tokenize
   * @returns {string[]} - Array of tokens
   */
  tokenize(text) {
    if (!text) return [];

    return text
      .toLowerCase()
      // Normalize special cases before splitting
      .replace(/(\d+)%/g, '$1percent')  // 70% → 70percent
      .replace(/(\d+)x/g, '$1x')        // 1.8x → 1.8x
      .replace(/[^\w\s.-]/g, ' ')       // Keep alphanumeric, dash, dot (for decimals)
      .split(/\s+/)
      .filter(token => token.length > 0)  // Keep all non-empty tokens (including numbers)
      .filter(token => !this.isStopWord(token))
      .filter(token => {
        // Keep if: contains digit OR length > 2
        return /\d/.test(token) || token.length > 2;
      });
  }

  /**
   * Simple stop words filter
   * @param {string} word - Word to check
   * @returns {boolean} - True if stop word
   */
  isStopWord(word) {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
      'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
      'its', 'may', 'new', 'now', 'old', 'see', 'than', 'that', 'this', 'with'
    ]);
    return stopWords.has(word);
  }

  /**
   * Build BM25 index from chunks
   * @param {Array} chunks - Array of chunk objects with id, text, metadata
   */
  async buildIndex(chunks) {
    console.log(`Building BM25 index from ${chunks.length} chunks...`);
    
    // Reset state
    this.documents = [];
    this.documentIds = [];

    // Tokenize all documents
    for (const chunk of chunks) {
      // Combine text and section heading for better matching
      const textToIndex = chunk.metadata?.section_heading 
        ? `${chunk.metadata.section_heading} ${chunk.text}`
        : chunk.text;
      
      const tokens = this.tokenize(textToIndex);
      this.documents.push(tokens);
      this.documentIds.push(chunk.id);
    }

    console.log(`  Sample BM25 IDs at build: [${this.documentIds.slice(0, 3).join(', ')}]`);

    // Build BM25 index
    this.bm25 = new BM25(this.documents);
    
    console.log(`BM25 index built with ${this.documents.length} documents`);
    
    // Persist index
    await this.saveIndex();
  }

  /**
   * Search using BM25
   * @param {string} query - Search query
   * @param {number} topK - Number of results to return
   * @returns {Array} - Array of {id, score} objects sorted by score
   */
  search(query, topK = 20) {
    if (!this.bm25 || this.documents.length === 0) {
      console.warn('BM25 index not initialized');
      return [];
    }

    const queryTokens = this.tokenize(query);
    
    if (queryTokens.length === 0) {
      console.warn('BM25: No query tokens after tokenization');
      return [];
    }

    console.log(`  BM25: Query tokens: [${queryTokens.join(', ')}]`);

    // Get BM25 scores for all documents
    const scores = this.bm25.search(queryTokens);
    
    // Combine scores with document IDs
    const results = scores.map((score, index) => ({
      id: this.documentIds[index],
      score: score
    }));

    // Sort by score descending and return top K
    const topResults = results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    
    console.log(`  BM25: Top result score: ${topResults[0]?.score.toFixed(4) || 'N/A'}`);
    
    return topResults;
  }

  /**
   * Save BM25 index to disk
   */
  async saveIndex() {
    try {
      const dataDir = path.dirname(this.indexPath);
      await fs.mkdir(dataDir, { recursive: true });

      const indexData = {
        documents: this.documents,
        documentIds: this.documentIds,
        timestamp: new Date().toISOString()
      };

      await fs.writeFile(
        this.indexPath,
        JSON.stringify(indexData, null, 2),
        'utf-8'
      );

      console.log(`BM25 index saved to ${this.indexPath}`);
    } catch (error) {
      console.error('Error saving BM25 index:', error.message);
    }
  }

  /**
   * Load BM25 index from disk
   */
  async loadIndex() {
    try {
      const data = await fs.readFile(this.indexPath, 'utf-8');
      const indexData = JSON.parse(data);

      this.documents = indexData.documents;
      this.documentIds = indexData.documentIds;
      this.bm25 = new BM25(this.documents);

      console.log(`BM25 index loaded: ${this.documents.length} documents from ${indexData.timestamp}`);
      console.log(`  Sample loaded BM25 IDs: [${this.documentIds.slice(0, 3).join(', ')}]`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('BM25 index file not found, will build on first ingestion');
      } else {
        console.error('Error loading BM25 index:', error.message);
      }
      return false;
    }
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      totalDocuments: this.documents.length,
      avgTokensPerDoc: this.documents.length > 0
        ? Math.round(this.documents.reduce((sum, doc) => sum + doc.length, 0) / this.documents.length)
        : 0,
      indexed: this.bm25 !== null
    };
  }
}

// Export singleton instance
const bm25Service = new BM25Service();
module.exports = bm25Service;
