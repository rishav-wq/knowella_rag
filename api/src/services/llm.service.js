/**
 * LLM Service
 * Handles text generation with Ollama
 */

const axios = require('axios');

class LLMService {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';
    this.model = process.env.LLM_MODEL || 'llama3.2:3b';
  }

  /**
   * Generate a response using RAG (Retrieval Augmented Generation)
   * @param {string} question - User's question
   * @param {Array} retrievedChunks - Relevant chunks from Qdrant
   * @param {object} botConfig - Bot behavior configuration (tone, rules, etc.)
   * @returns {Promise<{answer: string, citations: Array}>}
   */
  async generateRAGResponse(question, retrievedChunks, botConfig = {}) {
    // Build system prompt with grounding context
    const systemPrompt = this.buildSystemPrompt(retrievedChunks, botConfig);
    
    // Build user prompt
    const userPrompt = `Question: ${question}\n\nProvide a helpful answer based ONLY on the context above. Include relevant information and cite sources.`;
    
    try {
      const response = await axios.post(
        `${this.ollamaUrl}/api/generate`,
        {
          model: this.model,
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            num_predict: 300  // Increased for complete answers without truncation
          }
        },
        { timeout: 300000 } // 300 second timeout (5 minutes)
      );
      
      const answer = response.data.response.trim();
      
      // Extract unique citations from retrieved chunks
      const citations = this.extractCitations(retrievedChunks);
      
      return { answer, citations };
      
    } catch (error) {
      console.error('❌ Error generating LLM response:', error.message);
      throw error;
    }
  }

  /**
   * Build system prompt with context and bot configuration
   * @param {Array} chunks - Retrieved context chunks
   * @param {object} botConfig - Bot behavior settings
   * @returns {string}
   */
  buildSystemPrompt(chunks, botConfig) {
    const { tone, rules, disclaimer } = botConfig;
    
    let prompt = `You are the Knowella AI assistant. `;
    
    // Add tone if specified
    if (tone) {
      prompt += `Your tone should be ${tone}. `;
    } else {
      prompt += `You are helpful, professional, and friendly. `;
    }
    
    // Add rules if specified
    if (rules) {
      prompt += `${rules} `;
    }
    
    prompt += `\n\nCRITICAL GROUNDING RULES:
1. Answer EXCLUSIVELY using the context provided below - do NOT add external knowledge
2. If the context doesn't fully answer the question, say "I don't have enough information about that in the Knowella content"
3. Quote or paraphrase DIRECTLY from the context - stay factually grounded
4. Do NOT make assumptions or inferences beyond what's explicitly stated
5. If uncertain, acknowledge limitations rather than guessing

FORMATTING RULES:
1. Structure your answer with clear sections using **bold headings**
2. Use bullet points (•) or numbered lists for multiple items
3. Keep paragraphs short (2-3 sentences maximum)
4. Add blank lines between sections for readability

EXAMPLE FORMAT:

Knowella offers three main design services:

**1. Website Design**
• Modern, responsive layouts
• User-friendly interfaces
• Brand-consistent styling

**2. UI/UX Design**
• Wireframes and prototypes
• Strategic design approach

Now answer using this format.\n\n`;
    
    // Add disclaimer if specified
    if (disclaimer) {
      prompt += `DISCLAIMER: ${disclaimer}\n\n`;
    }
    
    // Add context chunks
    prompt += `CONTEXT FROM KNOWELLA WEBSITE:\n\n`;
    
    chunks.forEach((chunk, index) => {
      prompt += `[Source ${index + 1}: ${chunk.title}]\n`;
      prompt += `${chunk.text}\n\n`;
    });
    
    return prompt;
  }

  /**
   * Extract unique citations from retrieved chunks
   * @param {Array} chunks 
   * @returns {Array<{url: string, title: string}>}
   */
  extractCitations(chunks) {
    const uniqueUrls = new Set();
    const citations = [];
    
    chunks.forEach(chunk => {
      if (!uniqueUrls.has(chunk.url)) {
        uniqueUrls.add(chunk.url);
        citations.push({
          url: chunk.url,
          title: chunk.title
        });
      }
    });
    
    return citations;
  }

  /**
   * Check if LLM model is available
   * @returns {Promise<boolean>}
   */
  async checkModel() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      const models = response.data.models || [];
      
      const hasModel = models.some(m => m.name.includes(this.model.split(':')[0]));
      
      if (!hasModel) {
        console.warn(`⚠️  Model "${this.model}" not found. Available models:`,
          models.map(m => m.name));
      }
      
      return hasModel;
      
    } catch (error) {
      console.error('❌ Error checking Ollama models:', error.message);
      return false;
    }
  }
}

module.exports = new LLMService();
