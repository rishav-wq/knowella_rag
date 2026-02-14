/**
 * Chunker Service
 * Splits long text into smaller chunks with overlap
 */

const config = require('../config/ingestion.config');

class ChunkerService {
  /**
   * Split text into overlapping chunks
   * @param {string} text - Full text content
   * @param {object} metadata - Page metadata (url, title, sections)
   * @returns {Array<{text: string, metadata: object}>}
   */
  chunkText(text, metadata = {}) {
    const { maxTokens, overlapTokens, minChunkSize } = config.chunking;
    
    // Estimate tokens (rough: 1 token ≈ 4 characters)
    const estimatedTokens = Math.floor(text.length / 4);
    
    // If text is small enough, return as single chunk
    if (estimatedTokens <= maxTokens) {
      const sectionHeading = this.findSectionHeading(text, metadata.sections);
      return [{
        text,
        metadata: {
          ...metadata,
          chunk_index: 0,
          total_chunks: 1,
          section_heading: sectionHeading
        }
      }];
    }
    
    // Split into sentences (simple approach)
    const sentences = this.splitIntoSentences(text);
    
    // Group sentences into chunks
    const chunks = [];
    let currentChunk = '';
    let currentTokenCount = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = Math.floor(sentence.length / 4);
      
      // If adding this sentence exceeds max, save current chunk and start new one
      if (currentTokenCount + sentenceTokens > maxTokens && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        
        // Start new chunk with overlap (include last few sentences)
        currentChunk = this.getOverlapText(sentences, i, overlapTokens);
        currentTokenCount = Math.floor(currentChunk.length / 4);
      }
      
      currentChunk += sentence + ' ';
      currentTokenCount += sentenceTokens;
    }
    
    // Add final chunk
    if (currentChunk.trim().length >= minChunkSize) {
      chunks.push(currentChunk.trim());
    }
    
    // Format chunks with metadata (include section_heading for retrieval)
    return chunks.map((chunkText, index) => {
      const sectionHeading = this.findSectionHeading(chunkText, metadata.sections);
      
      return {
        text: chunkText,
        metadata: {
          ...metadata,
          chunk_index: index,
          total_chunks: chunks.length,
          section_heading: sectionHeading
        }
      };
    });
  }

  /**
   * Find the most relevant section heading for a chunk of text
   * @param {string} chunkText 
   * @param {Array} sections 
   * @returns {string}
   */
  findSectionHeading(chunkText, sections = []) {
    if (!sections || sections.length === 0) {
      return this.generateSectionHeading(chunkText);
    }

    // Try to find which section this chunk belongs to
    // by checking if the chunk text appears in any section
    let bestMatch = '';
    let maxOverlap = 0;

    for (const section of sections) {
      if (!section.text) continue;

      // Check if chunk text is contained in this section
      const chunkWords = chunkText.toLowerCase().split(/\s+/).slice(0, 50); // First 50 words
      const sectionWords = section.text.toLowerCase();
      
      let overlapCount = 0;
      for (const word of chunkWords) {
        if (word.length > 3 && sectionWords.includes(word)) {
          overlapCount++;
        }
      }

      if (overlapCount > maxOverlap) {
        maxOverlap = overlapCount;
        bestMatch = section.heading || '';
      }
    }

    return bestMatch || this.generateSectionHeading(chunkText);
  }

  /**
   * Split text into sentences
   * @param {string} text 
   * @returns {Array<string>}
   */
  splitIntoSentences(text) {
    // Simple sentence splitting (can be improved with NLP library if needed)
    return text
      .split(/(?<=[.!?])\s+/)  // Split on sentence endings
      .filter(s => s.trim().length > 0);
  }

  /**
   * Get overlap text from previous sentences
   * @param {Array<string>} sentences 
   * @param {number} currentIndex 
   * @param {number} overlapTokens 
   * @returns {string}
   */
  getOverlapText(sentences, currentIndex, overlapTokens) {
    let overlap = '';
    let tokenCount = 0;
    
    // Go backwards from current index to build overlap
    for (let i = currentIndex - 1; i >= 0; i--) {
      const sentenceTokens = Math.floor(sentences[i].length / 4);
      
      if (tokenCount + sentenceTokens > overlapTokens) {
        break;
      }
      
      overlap = sentences[i] + ' ' + overlap;
      tokenCount += sentenceTokens;
    }
    
    return overlap;
  }

  /**
   * Generate section heading from chunk text (first sentence or first N words)
   * @param {string} text 
   * @returns {string}
   */
  generateSectionHeading(text) {
    const firstSentence = text.split(/[.!?]/)[0];
    const maxLength = 100;
    
    if (firstSentence.length <= maxLength) {
      return firstSentence.trim();
    }
    
    // Truncate to max length at word boundary
    return firstSentence.substring(0, maxLength).trim() + '...';
  }
}

module.exports = new ChunkerService();
