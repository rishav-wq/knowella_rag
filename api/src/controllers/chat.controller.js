/**
 * Chat Controller
 * Handles chat requests and orchestrates RAG flow
 */

const retrievalService = require('../services/retrieval.service');
const llmService = require('../services/llm.service');
const vectorStoreService = require('../services/vectorStore.service');
const questionParser = require('../utils/questionParser');
const pdfService = require('../services/pdf.service');

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
    const topK = parseInt(process.env.CHAT_TOP_K, 10) || 5;
    // Lower threshold for hybrid search (0.35 for hybrid ≈ 0.5 for pure semantic)
    const similarityThreshold = parseFloat(process.env.CHAT_SIMILARITY_THRESHOLD) || 0.35;
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

  /**
   * Handle streaming chat request for Knowella bot
   * Uses Server-Sent Events (SSE) for progressive response
   * @param {object} req 
   * @param {object} res 
   */
  async chatKnowellaStream(req, res) {
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
      console.log(`\n💬 Stream Question: "${question}"`);
      
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
      
      // Detect multi-question queries
      const isMulti = questionParser.isMultiQuestion(question);
      
      if (isMulti) {
        console.log('🔀 Multi-question detected, splitting...');
        const questions = questionParser.splitQuestions(question);
        console.log(`   Detected ${questions.length} questions`);
        
        // Send metadata event
        res.write(`event: metadata\n`);
        res.write(`data: ${JSON.stringify({ multi_question: true, questions_count: questions.length })}\n\n`);
        
        // Process each question separately
        const results = [];
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          console.log(`   Processing: "${q.substring(0, 50)}..."`);
          
          // Send question header
          res.write(`event: question\n`);
          res.write(`data: ${JSON.stringify({ index: i + 1, question: q })}\n\n`);
          
          const result = await this.processSingleQuestionStream(q, (chunk) => {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          });
          
          results.push({ question: q, ...result });
          
          // Send question complete
          res.write(`event: question_complete\n`);
          res.write(`data: ${JSON.stringify({ index: i + 1, citations: result.citations })}\n\n`);
        }
        
        const mergedCitations = questionParser.mergeCitations(results);
        const elapsed = Date.now() - startTime;
        
        console.log(`✅ Multi-question stream completed in ${elapsed}ms\n`);
        
        // Send completion event
        res.write(`event: done\n`);
        res.write(`data: ${JSON.stringify({ citations: mergedCitations, elapsed_ms: elapsed })}\n\n`);
        res.end();
        
      } else {
        // Single question - process with streaming
        res.write(`event: metadata\n`);
        res.write(`data: ${JSON.stringify({ multi_question: false })}\n\n`);
        
        const result = await this.processSingleQuestionStream(question, (chunk) => {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        });
        
        const elapsed = Date.now() - startTime;
        console.log(`✅ Stream response completed in ${elapsed}ms\n`);
        
        // Send completion event
        res.write(`event: done\n`);
        res.write(`data: ${JSON.stringify({ 
          citations: result.citations, 
          chunks_retrieved: result.chunks_retrieved,
          elapsed_ms: elapsed 
        })}\n\n`);
        res.end();
      }
      
    } catch (error) {
      console.error('❌ Stream chat error:', error);
      
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ 
        error: 'Failed to generate response',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      })}\n\n`);
      res.end();
    }
  }

  /**
   * Process a single question through RAG pipeline with streaming
   * @param {string} question 
   * @param {Function} onChunk - Callback for each chunk
   * @returns {Promise<{answer: string, citations: Array, chunks_retrieved: number}>}
   */
  async processSingleQuestionStream(question, onChunk) {
    // Step 1: Retrieve relevant chunks
    const topK = parseInt(process.env.CHAT_TOP_K, 10) || 5;
    const similarityThreshold = parseFloat(process.env.CHAT_SIMILARITY_THRESHOLD) || 0.35;
    const retrievedChunks = await retrievalService.retrieve(
      question,
      topK,
      similarityThreshold
    );
    
    // Step 2: Check if we have enough context
    if (retrievedChunks.length === 0) {
      const noContextMsg = "I don't have enough information to answer that question based on Knowella's content. Could you try rephrasing or ask something else about Knowella?";
      onChunk(noContextMsg);
      return {
        answer: noContextMsg,
        citations: [],
        chunks_retrieved: 0
      };
    }
    
    // Step 3: Get bot configuration
    const botConfig = this.getDefaultBotConfig();
    
    // Step 4: Generate response using LLM with streaming
    const { answer, citations } = await llmService.generateRAGResponseStream(
      question,
      retrievedChunks,
      botConfig,
      onChunk
    );
    
    return {
      answer,
      citations,
      chunks_retrieved: retrievedChunks.length
    };
  }

  /**
   * Handle PDF upload with questions
   * Extracts questions from PDF and processes them through RAG
   * @param {object} req 
   * @param {object} res 
   */
  async chatKnowellaPDF(req, res) {
    const startTime = Date.now();
    
    try {
      // Validate file upload
      if (!req.file) {
        return res.status(400).json({ 
          error: 'No PDF file uploaded. Please upload a PDF file.' 
        });
      }

      console.log(`\n📄 PDF Upload: "${req.file.originalname}" (${Math.round(req.file.size / 1024)}KB)`);
      
      // Validate PDF file
      pdfService.validatePDF(req.file);
      
      // Extract text and questions from PDF
      const { text, questions, questionCount } = await pdfService.parseQuestionsFromPDF(req.file.buffer);
      
      console.log(`📝 Extracted ${questionCount} questions from PDF`);
      
      if (questionCount === 0) {
        return res.status(400).json({
          error: 'No questions found in PDF',
          suggestion: 'Please ensure your PDF contains questions (sentences ending with ? or starting with What/How/Why/etc.)',
          extractedText: text.substring(0, 500) + '...' // Preview first 500 chars
        });
      }
      
      // Limit number of questions for performance
      const maxQuestions = 20;
      const questionsToProcess = questions.slice(0, maxQuestions);
      
      if (questionCount > maxQuestions) {
        console.log(`⚠️  Limiting to first ${maxQuestions} questions (${questionCount} found)`);
      }
      
      // Process each question through RAG
      const results = [];
      for (let i = 0; i < questionsToProcess.length; i++) {
        const question = questionsToProcess[i];
        console.log(`   Processing ${i + 1}/${questionsToProcess.length}: "${question.substring(0, 60)}..."`);
        
        try {
          const result = await this.processSingleQuestion(question);
          results.push({ 
            question, 
            ...result,
            questionNumber: i + 1
          });
        } catch (error) {
          console.error(`   ❌ Error processing question ${i + 1}:`, error.message);
          results.push({
            question,
            questionNumber: i + 1,
            answer: `Error: ${error.message}`,
            citations: [],
            chunks_retrieved: 0,
            error: true
          });
        }
      }
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ PDF processing completed: ${questionsToProcess.length} questions in ${elapsed}ms\n`);
      
      res.json({
        success: true,
        pdfFilename: req.file.originalname,
        totalQuestionsFound: questionCount,
        questionsProcessed: questionsToProcess.length,
        results,
        metadata: {
          elapsed_ms: elapsed,
          avg_time_per_question: Math.round(elapsed / questionsToProcess.length)
        }
      });
      
    } catch (error) {
      console.error('❌ PDF processing error:', error);
      
      res.status(500).json({
        error: 'Failed to process PDF',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while processing your PDF'
      });
    }
  }
}

module.exports = new ChatController();
