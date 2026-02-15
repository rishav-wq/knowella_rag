/**
 * Chat Controller
 * Handles chat requests and orchestrates RAG flow
 */

const retrievalService = require('../services/retrieval.service');
const llmService = require('../services/llm.service');
const vectorStoreService = require('../services/vectorStore.service');
const analyticsService = require('../services/analytics.service');

class ChatController {
  /**
   * Handle chat request for Knowella bot
   * @param {object} req
   * @param {object} res
   */
  async chatKnowella(req, res) {
    const startTime = Date.now();
    const { question, name, email, sessionId } = req.body;

    // Validation
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        error: 'Question is required and must be a string'
      });
    }

    if (question.trim().length < 3) {
      return res.status(400).json({
        error: 'Question is too short'
      });
    }

    // Validate user info (required for analytics)
    if (!name || !email || !sessionId) {
      return res.status(400).json({
        error: 'User information required (name, email, sessionId)'
      });
    }

    try {
      // Extract IP address (supporting various proxy headers)
      const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket.remoteAddress
        || req.connection.remoteAddress
        || 'unknown';

      const userAgent = req.headers['user-agent'] || 'unknown';

      // Track user session (create or update)
      try {
        analyticsService.createOrUpdateSession(
          sessionId,
          name,
          email,
          ipAddress,
          userAgent
        );

        // Log the user's query (question only, not bot response)
        analyticsService.logQuery(sessionId, question);

        console.log(`\n💬 Question from ${name} (${email}): "${question}"`);
      } catch (analyticsError) {
        // Don't fail the request if analytics fails
        console.error('Analytics tracking error:', analyticsError);
      }
      
      // Step 1: Retrieve relevant chunks (configurable via env)
      const topK = parseInt(process.env.CHAT_TOP_K, 10) || 8;
      const similarityThreshold = parseFloat(process.env.CHAT_SIMILARITY_THRESHOLD) || 0.28;
      const retrievedChunks = await retrievalService.retrieve(
        question,
        topK,
        similarityThreshold
      );
      
      // Step 2: Check if we have enough context
      if (retrievedChunks.length === 0) {
        return res.json({
          answer: "I don't have enough information to answer that question based on Knowella's content. Could you try rephrasing or ask something else about Knowella?",
          citations: [],
          metadata: {
            chunks_retrieved: 0,
            elapsed_ms: Date.now() - startTime
          }
        });
      }
      
      // Step 3: Get bot configuration (default for now, will add WP settings later)
      const botConfig = this.getDefaultBotConfig();
      
      // Step 4: Generate response using LLM
      const { answer, citations } = await llmService.generateRAGResponse(
        question,
        retrievedChunks,
        botConfig
      );
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ Response generated in ${elapsed}ms\n`);
      
      // Step 5: Return response
      res.json({
        answer,
        citations,
        metadata: {
          chunks_retrieved: retrievedChunks.length,
          elapsed_ms: elapsed
        }
      });
      
    } catch (error) {
      console.error('❌ Chat error:', error);
      
      res.status(500).json({
        error: 'Failed to generate response',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get default bot configuration
   * Later this will be loaded from WordPress settings
   * @returns {object}
   */
  getDefaultBotConfig() {
    return {
      tone: 'helpful, professional, and friendly',
      rules: 'Keep answers concise and relevant. Focus on Knowella\'s AI-powered productivity solutions.',
      disclaimer: 'This information is based on Knowella\'s website content. For specific inquiries, please contact Knowella directly.'
    };
  }

  /**
   * Get chat statistics
   * @param {object} req 
   * @param {object} res 
   */
  async getStats(req, res) {
    try {
      const vectorStats = await vectorStoreService.getStats();
      const cacheStats = retrievalService.getCacheStats();
      
      res.json({
        vector_store: vectorStats,
        retrieval_cache: cacheStats
      });
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Clear retrieval cache
   * @param {object} req 
   * @param {object} res 
   */
  clearCache(req, res) {
    retrievalService.clearCache();
    res.json({ success: true, message: 'Cache cleared' });
  }
}

module.exports = new ChatController();
