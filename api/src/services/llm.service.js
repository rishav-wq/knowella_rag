/**
 * OPTIMIZED LLM Service for CPU Performance
 * Key changes:
 * 1. Shorter system prompt (50% reduction)
 * 2. Reduced num_predict tokens
 * 3. Better caching strategy
 */

const axios = require('axios');

class LLMService {
  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'ollama';

    // Ollama config
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';
    this.model = process.env.LLM_MODEL || 'phi3:mini';  // 🔥 Better default

    // Groq config
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.groqModel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    this.groqUrl = 'https://api.groq.com/openai/v1/chat/completions';

    console.log(`🤖 LLM Provider: ${this.provider.toUpperCase()}`);
    console.log(`   Model: ${this.provider === 'groq' ? this.groqModel : this.model}`);
  }

  /**
   * Generate RAG response
   */
  async generateRAGResponse(question, retrievedChunks, botConfig = {}) {
    const systemPrompt = this.buildSystemPrompt(retrievedChunks, botConfig);

    // 🔥 OPTIMIZED: Shorter user prompt
    const userPrompt = `Question: ${question}\n\nAnswer using only the context above. If not found, say "I don't have that information."`;

    try {
      let answer;

      if (this.provider === 'groq') {
        answer = await this.callGroq(systemPrompt, userPrompt);
      } else {
        answer = await this.callOllama(systemPrompt, userPrompt);
      }

      const citations = this.extractCitations(retrievedChunks);
      return { answer, citations };

    } catch (error) {
      console.error('❌ Error generating LLM response:', error.message);
      throw error;
    }
  }

  /**
   * Groq call (Chat format)
   */
  async callGroq(systemPrompt, userPrompt) {
    const response = await axios.post(
      this.groqUrl,
      {
        model: this.groqModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,    // 🔥 Even lower for speed
        max_tokens: 300,     // 🔥 Reduced from 400
        top_p: 0.9
      },
      {
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content.trim();
  }

  /**
   * 🔥 OPTIMIZED Ollama call
   */
  async callOllama(systemPrompt, userPrompt) {
    const response = await axios.post(
      `${this.ollamaUrl}/api/chat`,
      {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        options: {
          temperature: 0,
          top_p: 0.9,
          num_predict: 250,        // 🔥 Reduced from 350
          num_ctx: 2048,           // 🔥 Smaller context window
          repeat_penalty: 1.1,
          top_k: 40
        },
        stream: false,
        keep_alive: '5m'           // 🔥 Keep model in memory
      },
      { timeout: 60000 }           // 🔥 Reduced timeout
    );

    return response.data.message.content.trim();
  }


  /**
   * 🔥 OPTIMIZED: Shorter, more concise system prompt
   */
  buildSystemPrompt(chunks, botConfig) {
    const { tone, rules } = botConfig;

    // 🔥 Minimal prompt - 50% shorter
    let prompt = `You are Knowella AI assistant. ${tone || 'Be helpful and concise.'}\n\n`;

    if (rules) {
      prompt += `${rules}\n\n`;
    }

    prompt += `RULES:
1. Answer using ONLY the context below
2. If not found, say "I don't have that information"
3. Be concise and accurate
4. Never invent facts\n\n`;

    prompt += `CONTEXT:\n\n`;

    // Include full chunk text (we already optimized chunking to 500 tokens)
    chunks.forEach((chunk, idx) => {
      prompt += `[${idx + 1}] ${chunk.title}\n${chunk.text}\n\n`;
    });

    return prompt;
  }

  /**
   * Backend citation extraction
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
   * Check Ollama model
   */
  async checkModel() {
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      const models = response.data.models || [];

      return models.some(m =>
        m.name.includes(this.model.split(':')[0])
      );

    } catch (error) {
      console.error('❌ Error checking Ollama models:', error.message);
      return false;
    }
  }
}

module.exports = new LLMService();
