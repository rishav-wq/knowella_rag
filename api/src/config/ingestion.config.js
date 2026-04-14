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
      'post-sitemap.xml',          // Blog posts (educational content)
      'page-sitemap.xml'           // Static pages (about, services, pricing, etc.)
    ],
    
    // Which sub-sitemaps to skip
    // These are usually just lists/archives with duplicate content
    excludedSitemaps: [
      'category-sitemap.xml',      // Category archive pages
      'post_tag-sitemap.xml',      // Tag archive pages
      'post-archive-sitemap.xml',  // Date-based archives
      'ol_locator-sitemap.xml',    // Location pages (if any)
      'portfolio-cat-sitemap.xml', // Portfolio categories
      'pk_portfolio-sitemap.xml',  // Portfolio/case studies - EXCLUDED
      'pk-portfolio-sitemap.xml'   // Portfolio alternate - EXCLUDED
    ]
  },

  // Additional URLs to ingest that are not in the sitemaps
  // (e.g. support docs on a subdomain)
  additionalUrls: [
    'https://support.knowella.com/docs/app-builder/creating-template/',
    'https://support.knowella.com/docs/app-builder/what-are-templates/',
    'https://support.knowella.com/docs/app-builder/editing-template/',
    'https://support.knowella.com/docs/app-builder/general-information-fields-in-template-creation/',
    'https://support.knowella.com/docs/app-builder/categories-in-templates/',
    'https://support.knowella.com/docs/app-builder/mandatory-vs-optional-fields/',
    'https://support.knowella.com/docs/app-builder/deleting-template/',
    'https://support.knowella.com/docs/app-builder/duplicating-template/',
    'https://support.knowella.com/docs/app-builder/create-sections-template-knowella/',
    'https://support.knowella.com/docs/app-builder/create-conditional-logic-fields-knowella/',
    'https://support.knowella.com/docs/app-builder/form-color-settings-template-creation/',
    'https://support.knowella.com/docs/app-builder/app-settings-fields-template-creation/',
    'https://support.knowella.com/docs/app-builder/what-can-i-build-using-app-builder/',
    'https://support.knowella.com/docs/app-builder/adding-fields-form-elements/',
    'https://support.knowella.com/docs/app-builder/add-qr-codes-form-templates/',
    'https://support.knowella.com/docs/app-builder/repeat-section-template/',
    'https://support.knowella.com/docs/app-builder/add-scoring-to-templates/'
  ],

  // Chunking configuration
  chunking: {
    maxTokens: 500,        // 🔥 Reduced from 800 for more focused chunks
    overlapTokens: 150,    // 🔥 Increased from 100 for better context preservation
    minChunkSize: 100      // 🔥 Reduced from 200 to capture smaller sections
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
