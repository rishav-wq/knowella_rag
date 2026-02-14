/**
 * Vector Store Service
 * Handles all Qdrant operations (create collection, upsert, search)
 */

const { QdrantClient } = require('@qdrant/js-client-rest');

class VectorStoreService {
  constructor() {
    this.client = new QdrantClient({ 
      url: process.env.QDRANT_URL || 'http://qdrant:6333' 
    });
    this.collectionName = 'knowella_pages';
    this.vectorSize = 768; // Default for nomic-embed-text
  }

  /**
   * Initialize Qdrant collection (create if doesn't exist)
   * @returns {Promise<void>}
   */
  async initCollection() {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        c => c.name === this.collectionName
      );
      
      if (exists) {
        console.log(`✅ Collection "${this.collectionName}" already exists`);
        return;
      }
      
      // Create collection
      console.log(`📦 Creating collection "${this.collectionName}"...`);
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: this.vectorSize,
          distance: 'Cosine'  // Cosine similarity for semantic search
        }
      });
      
      console.log(`✅ Collection created successfully`);
      
    } catch (error) {
      console.error('❌ Error initializing collection:', error.message);
      throw error;
    }
  }

  /**
   * Upsert chunks with embeddings into Qdrant
   * @param {Array<{text: string, embedding: Array<number>, metadata: object}>} chunks 
   * @returns {Promise<void>}
   */
  async upsertChunks(chunks) {
    try {
      console.log(`💾 Upserting ${chunks.length} chunks to Qdrant...`);
      
      // Format points for Qdrant
      const points = chunks.map((chunk, index) => ({
        id: this.generateId(chunk.metadata.url, chunk.metadata.chunk_index),
        vector: chunk.embedding,
        payload: {
          text: chunk.text,
          url: chunk.metadata.url,
          title: chunk.metadata.title,
          section_heading: chunk.metadata.section_heading || '',
          chunk_index: chunk.metadata.chunk_index,
          total_chunks: chunk.metadata.total_chunks,
          content_hash: chunk.metadata.content_hash,
          last_crawled: chunk.metadata.last_crawled || new Date().toISOString(),
          collection_name: this.collectionName
        }
      }));
      
      // Upsert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        
        await this.client.upsert(this.collectionName, {
          wait: true,
          points: batch
        });
        
        console.log(`  ✓ Upserted ${i + batch.length}/${points.length}`);
      }
      
      console.log(`✅ All chunks upserted successfully`);
      
    } catch (error) {
      console.error('❌ Error upserting chunks:', error.message);
      throw error;
    }
  }

  /**
   * Search for similar chunks
   * @param {Array<number>} queryEmbedding 
   * @param {number} limit 
   * @returns {Promise<Array<{text: string, url: string, title: string, score: number}>>}
   */
  async search(queryEmbedding, limit = 5) {
    try {
      const results = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit,
        with_payload: true
      });
      
      return results.map(result => ({
        id: result.id, // Include ID for hybrid search matching
        text: result.payload.text,
        url: result.payload.url,
        title: result.payload.title,
        chunk_index: result.payload.chunk_index,
        score: result.score
      }));
      
    } catch (error) {
      console.error('❌ Error searching Qdrant:', error.message);
      throw error;
    }
  }

  /**
   * Check if a URL's content has changed (using content hash)
   * @param {string} url 
   * @param {string} contentHash 
   * @returns {Promise<boolean>} True if content is different (needs update)
   */
  async hasContentChanged(url, contentHash) {
    try {
      // Search for any chunk from this URL
      const results = await this.client.scroll(this.collectionName, {
        filter: {
          must: [
            { key: 'url', match: { value: url } }
          ]
        },
        limit: 1,
        with_payload: true
      });
      
      if (results.points.length === 0) {
        // URL not in database = new content
        return true;
      }
      
      // Compare content hash
      const existingHash = results.points[0].payload.content_hash;
      return existingHash !== contentHash;
      
    } catch (error) {
      console.error('❌ Error checking content hash:', error.message);
      return true; // On error, assume content changed
    }
  }

  /**
   * Delete all chunks for a URL (used when re-ingesting)
   * @param {string} url 
   * @returns {Promise<void>}
   */
  async deleteByUrl(url) {
    try {
      await this.client.delete(this.collectionName, {
        filter: {
          must: [
            { key: 'url', match: { value: url } }
          ]
        }
      });
      
      console.log(`  🗑️  Deleted old chunks for: ${url}`);
      
    } catch (error) {
      console.error('❌ Error deleting chunks:', error.message);
    }
  }

  /**
   * Generate consistent ID from URL and chunk index
   * @param {string} url 
   * @param {number} chunkIndex 
   * @returns {number}
   */
  generateId(url, chunkIndex) {
    // Simple hash function to generate numeric ID
    const str = `${url}_${chunkIndex}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get all chunks from collection (for BM25 index building)
   * @returns {Promise<Array>}
   */
  async getAllChunks() {
    try {
      const batchSize = 100;
      let offset = null;
      const allChunks = [];

      while (true) {
        const result = await this.client.scroll(this.collectionName, {
          limit: batchSize,
          offset: offset,
          with_payload: true,
          with_vector: false // Don't need vectors for BM25
        });

        if (!result.points || result.points.length === 0) {
          break;
        }

        // Extract chunks
        for (const point of result.points) {
          allChunks.push({
            id: point.id,
            text: point.payload.text,
            metadata: {
              url: point.payload.url,
              title: point.payload.title,
              section_heading: point.payload.section_heading,
              chunk_index: point.payload.chunk_index
            }
          });
        }

        // Check if there are more points
        if (!result.next_page_offset) {
          break;
        }
        offset = result.next_page_offset;
      }

      console.log(`📚 Retrieved ${allChunks.length} chunks from Qdrant`);
      return allChunks;

    } catch (error) {
      console.error('Error getting all chunks:', error.message);
      return [];
    }
  }

  /**
   * Get collection stats
   * @returns {Promise<object>}
   */
  async getStats() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return {
        total_points: info.points_count,
        vector_size: info.config.params.vectors.size
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

module.exports = new VectorStoreService();
