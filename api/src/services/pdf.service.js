/**
 * PDF Service
 * Handles PDF file parsing and question extraction
 */

const { PDFParse } = require('pdf-parse');

class PDFService {
  /**
   * Extract text from PDF buffer
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<string>} Extracted text
   */
  async extractText(pdfBuffer) {
    try {
      // Use PDFParse class from pdf-parse library
      const parser = new PDFParse({ data: pdfBuffer });
      const result = await parser.getText();
      await parser.destroy();
      return result.text.trim();
    } catch (error) {
      console.error('❌ Error parsing PDF:', error.message);
      throw new Error('Failed to parse PDF file');
    }
  }

  /**
   * Extract questions from PDF text
   * Uses simple heuristics to find question-like sentences
   * @param {string} text - Extracted PDF text
   * @returns {Array<string>} Array of detected questions
   */
  extractQuestions(text) {
    const questions = [];
    
    // Split by newlines and common question delimiters
    const lines = text
      .split(/\n+/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    for (let line of lines) {
      // Check if line looks like a question
      if (this.isQuestion(line)) {
        // Clean up the question
        const cleaned = this.cleanQuestion(line);
        if (cleaned && cleaned.length >= 10) {
          questions.push(cleaned);
        }
      }
    }
    
    return questions;
  }

  /**
   * Check if a line looks like a question
   * @param {string} line 
   * @returns {boolean}
   */
  isQuestion(line) {
    // Remove leading numbers, bullets, etc.
    const cleaned = line.replace(/^[\d\.\)\-\*\>]+\s*/, '');
    
    // Question patterns
    const questionPatterns = [
      /\?$/,                           // Ends with ?
      /^(what|how|why|when|where|who|which|can|does|is|are|do|will|would|could|should)/i,  // Question words
      /^(explain|describe|list|name|define|compare|discuss)/i  // Imperative questions
    ];
    
    return questionPatterns.some(pattern => pattern.test(cleaned));
  }

  /**
   * Clean and normalize a question
   * @param {string} question 
   * @returns {string}
   */
  cleanQuestion(question) {
    // Remove leading numbers, bullets, etc.
    let cleaned = question.replace(/^[\d\.\)\-\*\>]+\s*/, '');
    
    // Remove multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Ensure it ends with a question mark if it starts with a question word
    if (/^(what|how|why|when|where|who|which)/i.test(cleaned) && !cleaned.endsWith('?')) {
      cleaned += '?';
    }
    
    return cleaned.trim();
  }

  /**
   * Parse PDF and extract questions
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @returns {Promise<{text: string, questions: Array<string>}>}
   */
  async parseQuestionsFromPDF(pdfBuffer) {
    const text = await this.extractText(pdfBuffer);
    const questions = this.extractQuestions(text);
    
    return {
      text,
      questions,
      questionCount: questions.length
    };
  }

  /**
   * Validate PDF file
   * @param {object} file - Multer file object
   * @returns {boolean}
   */
  validatePDF(file) {
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (file.mimetype !== 'application/pdf') {
      throw new Error('File must be a PDF');
    }
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('PDF file size must be less than 10MB');
    }
    
    return true;
  }
}

module.exports = new PDFService();
