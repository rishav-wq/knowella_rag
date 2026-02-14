/**
 * Embeddings Service
 * Generates vector embeddings using Ollama
 */

const axios = require('axios');

class EmbeddingsService {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';
    this.model = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
  }

  /**
   * Generate embedding for a single text
   * @param {string} text 
   * @returns {Promise<Array<number>>} Embedding vector
   */
  async generateEmbedding(text) {
    try {
      const response = await axios.post(
        `${this.ollamaUrl}/api/embeddings`,
        {
          model: this.model,
          prompt: text
        },
        { timeout: 30000 }
      );
      
      return response.data.embedding;
      
    } catch (error) {
      console.error('❌ Error generating embedding:', error.message);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   * @param {Array<string>} texts 
   * @returns {Promise<Array<Array<number>>>}
   */
  async generateEmbeddings(texts) {
    console.log(`🔢 Generating embeddings for ${texts.length} chunks...`);
    
    const embeddings = [];
    
    // Process sequentially to avoid overwhelming Ollama
    // Could be parallelized with a queue/pool in production
    for (let i = 0; i < texts.length; i++) {
      if (i % 10 === 0) {
        console.log(`  Progress: ${i}/${texts.length}`);
      }
      
      const embedding = await this.generateEmbedding(texts[i]);
      embeddings.push(embedding);
    }
    
    console.log(`✅ Generated ${embeddings.length} embeddings`);
    return embeddings;
  }

  /**
   * Check if embedding model is available
   * @returns {Promise<boolean>}
   */
  async checkModel() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      const models = response.data.models || [];
      
      const hasModel = models.some(m => m.name.includes(this.model));
      
      if (!hasModel) {
        console.warn(`⚠️  Model "${this.model}" not found. Available models:`,
          models.map(m => m.name));
        console.log(`\n📥 To download the model, run:`);
        console.log(`   docker exec -it knowella_ollama ollama pull ${this.model}\n`);
      }
      
      return hasModel;
      
    } catch (error) {
      console.error('❌ Error checking Ollama models:', error.message);
      return false;
    }
  }
}

module.exports = new EmbeddingsService();
