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
   * @returns {Promise<{title: string, content: string, contentHash: string}>}
   */
  async scrapeUrl(url) {
    try {
      // Fetch HTML
      const html = await this.fetchHtml(url);
      
      // Extract clean content
      const { title, content } = this.extractContent(html);
      
      // Generate content hash for deduplication
      const contentHash = this.generateHash(content);
      
      return { title, content, contentHash };
      
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
   * Extract title and main content from HTML
   * Removes navigation, ads, footers, etc.
   * @param {string} html 
   * @returns {{title: string, content: string}}
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
    let content = '';
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
        content = element.text();
        break;
      }
    }
    
    // Clean up the text
    content = this.cleanText(content);
    
    return { title, content };
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
