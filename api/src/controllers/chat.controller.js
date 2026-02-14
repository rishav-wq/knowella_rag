/**
 * Chat Controller
 * Handles chat requests and orchestrates RAG flow
 */

const retrievalService = require('../services/retrieval.service');
const llmService = require('../services/llm.service');
const vectorStoreService = require('../services/vectorStore.service');
const questionParser = require('../utils/questionParser');

class ChatController {
  /**
   * Handle chat request for Knowella bot
   * @param {object} req 
   * @param {object} res 
   */
  async chatKnowella(req, res) {
    const startTime = Date.now();
    const { question } = req.body;
    
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
    
    try {
      console.log(`\n💬 Question: "${question}"`);
      
      // Detect multi-question queries
      const isMulti = questionParser.isMultiQuestion(question);
      
      if (isMulti) {
        console.log('🔀 Multi-question detected, splitting...');
        const questions = questionParser.splitQuestions(question);
        console.log(`   Detected ${questions.length} questions`);
        
        // Process each question separately
        const results = [];
        for (const q of questions) {
          console.log(`   Processing: "${q.substring(0, 50)}..."`);
          const result = await this.processSingleQuestion(q);
          results.push({ question: q, ...result });
        }
        
        // Combine answers
        const combinedAnswer = questionParser.combineAnswers(results);
        const mergedCitations = questionParser.mergeCitations(results);
        
        const elapsed = Date.now() - startTime;
        console.log(`✅ Multi-question response generated in ${elapsed}ms\n`);
        
        return res.json({
          answer: combinedAnswer,
          citations: mergedCitations,
          metadata: {
            multi_question: true,
            questions_count: questions.length,
            chunks_retrieved: results.reduce((sum, r) => sum + r.chunks_retrieved, 0),
            elapsed_ms: elapsed
          }
        });
      }
      
      // Single question - process normally
      const result = await this.processSingleQuestion(question);
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ Response generated in ${elapsed}ms\n`);
      
      res.json({
        ...result,
        metadata: {
          multi_question: false,
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
   * Process a single question through RAG pipeline
   * @param {string} question 
   * @returns {Promise<{answer: string, citations: Array, chunks_retrieved: number}>}
   */
  async processSingleQuestion(question) {
    // Step 1: Retrieve relevant chunks
    const topK = parseInt(process.env.CHAT_TOP_K, 10) || 7;
    const similarityThreshold = parseFloat(process.env.CHAT_SIMILARITY_THRESHOLD) || 0.5;
    const retrievedChunks = await retrievalService.retrieve(
      question,
      topK,
      similarityThreshold
    );
    
    // Step 2: Check if we have enough context
    if (retrievedChunks.length === 0) {
      return {
        answer: "I don't have enough information to answer that question based on Knowella's content. Could you try rephrasing or ask something else about Knowella?",
        citations: [],
        chunks_retrieved: 0
      };
    }
    
    // Step 3: Get bot configuration
    const botConfig = this.getDefaultBotConfig();
    
    // Step 4: Generate response using LLM
    const { answer, citations } = await llmService.generateRAGResponse(
      question,
      retrievedChunks,
      botConfig
    );
    
    return {
      answer,
      citations,
      chunks_retrieved: retrievedChunks.length
    };
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
