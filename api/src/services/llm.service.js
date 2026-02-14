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
    const userPrompt = `Question: ${question}\n\nREMINDER: Use ONLY context that DIRECTLY relates to this question. IGNORE any unrelated context chunks. Provide a helpful answer and cite sources.`;
    
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
        { timeout: 600000 } // 600 second timeout (10 minutes) - increased for large contexts
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
   * Generate a streaming response using RAG (Retrieval Augmented Generation)
   * @param {string} question - User's question
   * @param {Array} retrievedChunks - Relevant chunks from Qdrant
   * @param {object} botConfig - Bot behavior configuration
   * @param {Function} onChunk - Callback for each chunk (chunk) => {}
   * @returns {Promise<{answer: string, citations: Array}>}
   */
  async generateRAGResponseStream(question, retrievedChunks, botConfig, onChunk) {
    // Build system prompt with grounding context
    const systemPrompt = this.buildSystemPrompt(retrievedChunks, botConfig);
    
    // Build user prompt
    const userPrompt = `Question: ${question}\n\nREMINDER: Use ONLY context that DIRECTLY relates to this question. IGNORE any unrelated context chunks. Provide a helpful answer and cite sources.`;
    
    let fullAnswer = '';
    
    try {
      const response = await axios.post(
        `${this.ollamaUrl}/api/generate`,
        {
          model: this.model,
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          stream: true,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            num_predict: 300
          }
        },
        { 
          timeout: 600000, // 10 minutes
          responseType: 'stream'
        }
      );
      
      // Process the stream
      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk) => {
          try {
            const lines = chunk.toString().split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              const parsed = JSON.parse(line);
              
              if (parsed.response) {
                fullAnswer += parsed.response;
                onChunk(parsed.response); // Send chunk to client
              }
              
              if (parsed.done) {
                const citations = this.extractCitations(retrievedChunks);
                resolve({ answer: fullAnswer.trim(), citations });
              }
            }
          } catch (parseError) {
            console.error('Error parsing stream chunk:', parseError.message);
          }
        });
        
        response.data.on('error', (error) => {
          console.error('❌ Stream error:', error.message);
          reject(error);
        });
        
        response.data.on('end', () => {
          if (!fullAnswer) {
            reject(new Error('Stream ended without response'));
          }
        });
      });
      
    } catch (error) {
      console.error('❌ Error generating streaming LLM response:', error.message);
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
2. ONLY use information that DIRECTLY answers the specific question asked
3. IGNORE any context chunks that are NOT relevant to the question - even if provided
4. Do NOT mix or combine information from different topics (e.g., do NOT mix "engagement" with "ergonomics", or "training" with "technology")
5. Each context chunk may be about a different topic - ONLY use chunks that match the question's topic
6. If less than 50% of context is relevant, focus ONLY on relevant parts and ignore the rest completely
7. If the context doesn't fully answer the question, say "I don't have enough information about that in the Knowella content"
8. Quote or paraphrase DIRECTLY from the context - stay factually grounded
9. Do NOT make assumptions, inferences, or connections beyond what's explicitly stated
10. If uncertain, acknowledge limitations rather than guessing

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
