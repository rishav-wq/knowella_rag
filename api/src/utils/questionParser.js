/**
 * Question Parser Utility
 * Detects and splits multi-question queries
 */

class QuestionParser {
  /**
   * Detect if input contains multiple questions
   * @param {string} text 
   * @returns {boolean}
   */
  isMultiQuestion(text) {
    // Count question marks
    const questionMarkCount = (text.match(/\?/g) || []).length;
    
    // Check for question numbering patterns
    const hasNumberedQuestions = /(\d+[\.\)]\s*[A-Z]|Q\d+[:\.]\s*|Question\s+\d+)/i.test(text);
    
    // Multiple question marks or numbered questions
    return questionMarkCount > 1 || hasNumberedQuestions;
  }

  /**
   * Split text into individual questions
   * @param {string} text 
   * @returns {Array<string>}
   */
  splitQuestions(text) {
    // If not multi-question, return as is
    if (!this.isMultiQuestion(text)) {
      return [text.trim()];
    }

    const questions = [];

    // Method 1: Split by numbered patterns (1. Q1: Question 1:)
    const numberedPattern = /(?:^|\n)\s*(?:\d+[\.\)]\s*|Q\d+[:\.]\s*|Question\s+\d+[:\.]\s*)/gi;
    
    if (numberedPattern.test(text)) {
      // Reset regex
      numberedPattern.lastIndex = 0;
      
      // Split by numbered markers
      const parts = text.split(numberedPattern).filter(p => p.trim());
      
      // Add question marks if missing
      parts.forEach(part => {
        const trimmed = part.trim();
        if (trimmed) {
          questions.push(trimmed.endsWith('?') ? trimmed : trimmed + '?');
        }
      });
      
      return questions;
    }

    // Method 2: Split by question marks (preserve the ?)
    const parts = text.split(/\?/);
    
    for (let i = 0; i < parts.length - 1; i++) {
      const question = parts[i].trim() + '?';
      if (question.length > 5) { // Avoid tiny fragments
        questions.push(question);
      }
    }

    // Add last part if it's a question without ?
    const lastPart = parts[parts.length - 1].trim();
    if (lastPart && lastPart.length > 5) {
      questions.push(lastPart.endsWith('?') ? lastPart : lastPart + '?');
    }

    // If we got nothing useful, return original
    if (questions.length === 0) {
      return [text.trim()];
    }

    return questions;
  }

  /**
   * Combine multiple question-answer pairs into formatted response
   * @param {Array<{question: string, answer: string, citations: Array}>} results 
   * @returns {string}
   */
  combineAnswers(results) {
    if (results.length === 1) {
      return results[0].answer;
    }

    // Format multiple answers with clear sections
    let combined = '';
    
    results.forEach((result, index) => {
      const questionNum = index + 1;
      const questionTitle = this.extractQuestionTitle(result.question);
      
      combined += `**Question ${questionNum}: ${questionTitle}**\n\n`;
      combined += result.answer;
      combined += '\n\n---\n\n';
    });

    // Remove trailing separator
    return combined.replace(/\n\n---\n\n$/, '');
  }

  /**
   * Extract a short title from question text
   * @param {string} question 
   * @returns {string}
   */
  extractQuestionTitle(question) {
    // Remove numbering if present
    let title = question.replace(/^(?:\d+[\.\)]\s*|Q\d+[:\.]\s*|Question\s+\d+[:\.]\s*)/i, '');
    
    // Truncate if too long
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }
    
    return title;
  }

  /**
   * Merge citations from multiple results
   * @param {Array<{question: string, answer: string, citations: Array}>} results 
   * @returns {Array}
   */
  mergeCitations(results) {
    const uniqueUrls = new Set();
    const mergedCitations = [];

    results.forEach(result => {
      result.citations.forEach(citation => {
        if (!uniqueUrls.has(citation.url)) {
          uniqueUrls.add(citation.url);
          mergedCitations.push(citation);
        }
      });
    });

    return mergedCitations;
  }
}

module.exports = new QuestionParser();
