/**
 * Ingestion Configuration
 * Controls what content is scraped from Knowella
 */

module.exports = {
  // Knowella sitemap configuration
  knowella: {
    // Main sitemap index URL
    sitemapUrl: 'https://www.knowella.com/sitemap.xml',
    
    // Which sub-sitemaps to include
    // These contain the actual page URLs we want to scrape
    includedSitemaps: [
      'post-sitemap.xml',          // Blog posts (92 URLs)
      'page-sitemap.xml',          // Static pages (70 URLs)
      'oak_portfolio-sitemap.xml'  // Portfolio/case studies (23 URLs)
    ],
    
    // Which sub-sitemaps to skip
    // These are usually just lists/archives with duplicate content
    excludedSitemaps: [
      'category-sitemap.xml',      // Category archive pages
      'post_tag-sitemap.xml',      // Tag archive pages
      'post-archive-sitemap.xml',  // Date-based archives
      'ol_locator-sitemap.xml',    // Location pages (if any)
      'portfolio-cat-sitemap.xml'   // Portfolio categories
    ]
  },

  // Chunking configuration
  chunking: {
    maxTokens: 800,        // Target chunk size in tokens (~600 words)
    overlapTokens: 100,    // Overlap between chunks to preserve context
    minChunkSize: 200      // Minimum chunk size (skip if smaller)
  },

  // Scraping behavior
  scraping: {
    userAgent: 'KnowellaBot/1.0 (RAG Chatbot; +https://knowella.com)',
    timeout: 30000,        // 30 seconds per page
    retryAttempts: 3,      // Retry failed requests
    retryDelay: 2000,      // Wait 2s between retries
    crawlDelay: 500        // Wait 500ms between pages (be polite!)
  }
};
