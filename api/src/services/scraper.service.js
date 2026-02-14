/**
 * Scraper Service
 * Downloads HTML and extracts clean text content
 */

const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config/ingestion.config');
const crypto = require('crypto');

class ScraperService {
  /**
   * Fetch and clean content from a URL
   * @param {string} url 
   * @returns {Promise<{title: string, content: string, contentHash: string, sections: Array}>}
   */
  async scrapeUrl(url) {
    try {
      // Fetch HTML
      const html = await this.fetchHtml(url);
      
      // Extract clean content
      const { title, content, sections } = this.extractContent(html);
      
      // Generate content hash for deduplication
      const contentHash = this.generateHash(content);
      
      return { title, content, contentHash, sections };
      
    } catch (error) {
      console.error(`❌ Error scraping ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Fetch HTML from URL with retries
   * @param {string} url 
   * @returns {Promise<string>} HTML content
   */
  async fetchHtml(url, attempt = 1) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': config.scraping.userAgent
        },
        timeout: config.scraping.timeout
      });
      
      return response.data;
      
    } catch (error) {
      // Retry on failure
      if (attempt < config.scraping.retryAttempts) {
        console.log(`  ⚠️  Retry ${attempt}/${config.scraping.retryAttempts} for ${url}`);
        await this.delay(config.scraping.retryDelay);
        return this.fetchHtml(url, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Extract title and main content from HTML (with section headings preserved)
   * Removes navigation, ads, footers, etc.
   * @param {string} html 
   * @returns {{title: string, content: string, sections: Array}}
   */
  extractContent(html) {
    const $ = cheerio.load(html);
    
    // Extract title
    const title = $('title').text().trim() || 
                  $('h1').first().text().trim() || 
                  'Untitled';
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .sidebar, .menu, .navigation, .comments, form, iframe').remove();
    
    // Try to find main content area (common WordPress selectors)
    let contentElement = null;
    const mainSelectors = [
      'article .entry-content',  // Common WordPress theme
      'article',                  // Generic article
      'main',                     // HTML5 main
      '.post-content',            // Another common class
      '.content',                 // Generic content class
      'body'                      // Fallback to body
    ];
    
    for (const selector of mainSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim().length > 100) {
        contentElement = element;
        break;
      }
    }
    
    // Extract structured content with headings preserved
    const { content, sections } = this.extractStructuredContent($, contentElement);
    
    return { title, content, sections };
  }

  /**
   * Extract content with section headings preserved
   * @param {CheerioAPI} $ 
   * @param {CheerioElement} contentElement 
   * @returns {{content: string, sections: Array<{heading: string, text: string}>}}
   */
  extractStructuredContent($, contentElement) {
    if (!contentElement) {
      return { content: '', sections: [] };
    }

    const sections = [];
    let currentHeading = '';
    let currentText = '';
    let fullContent = '';

    // Process each child element
    contentElement.find('*').each((i, elem) => {
      const $elem = $(elem);
      const tagName = elem.tagName.toLowerCase();

      // Check if it's a heading
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        // Save previous section if it exists
        if (currentText.trim()) {
          sections.push({
            heading: currentHeading,
            text: this.cleanText(currentText)
          });
        }

        // Start new section
        currentHeading = $elem.text().trim();
        currentText = '';
      } else if (tagName === 'p' || tagName === 'li' || tagName === 'div') {
        const text = $elem.text().trim();
        if (text) {
          currentText += text + ' ';
        }
      }
    });

    // Save final section
    if (currentText.trim()) {
      sections.push({
        heading: currentHeading,
        text: this.cleanText(currentText)
      });
    }

    // Build full content with headings
    sections.forEach(section => {
      if (section.heading) {
        fullContent += `\n\n## ${section.heading}\n\n`;
      }
      fullContent += section.text;
    });

    // Fallback: if no sections extracted, use plain text
    if (sections.length === 0) {
      const plainText = contentElement.text();
      fullContent = this.cleanText(plainText);
      sections.push({ heading: '', text: fullContent });
    }

    return { content: this.cleanText(fullContent), sections };
  }

  /**
   * Clean extracted text (remove extra whitespace, etc.)
   * @param {string} text 
   * @returns {string}
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')           // Multiple spaces → single space
      .replace(/\n{3,}/g, '\n\n')     // Multiple newlines → max 2
      .trim();
  }

  /**
   * Generate MD5 hash of content for deduplication
   * @param {string} content 
   * @returns {string} Hash
   */
  generateHash(content) {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Delay helper for rate limiting
   * @param {number} ms 
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new ScraperService();
