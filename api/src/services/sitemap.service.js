/**
 * Sitemap Service
 * Fetches and parses XML sitemaps (handles both index and individual sitemaps)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config/ingestion.config');

class SitemapService {
  /**
   * Get all URLs from Knowella sitemaps
   * @returns {Promise<Array<{url: string, lastmod: string}>>}
   */
  async getKnowellaUrls() {
    console.log('📋 Fetching Knowella sitemap index...');
    
    try {
      // Step 1: Fetch main sitemap index
      const indexXml = await this.fetchSitemap(config.knowella.sitemapUrl);
      
      // Step 2: Parse to get sub-sitemap URLs
      const subSitemaps = this.parseIndex(indexXml);
      console.log(`Found ${subSitemaps.length} sub-sitemaps`);
      
      // Step 3: Filter to only included sitemaps
      const filteredSitemaps = this.filterSitemaps(subSitemaps);
      console.log(`Including ${filteredSitemaps.length} sub-sitemaps:`, 
        filteredSitemaps.map(s => s.split('/').pop()));
      
      // Step 4: Fetch all page URLs from filtered sitemaps
      const allUrls = [];
      for (const sitemapUrl of filteredSitemaps) {
        const urls = await this.getUrlsFromSitemap(sitemapUrl);
        allUrls.push(...urls);
        console.log(`  ✓ ${sitemapUrl.split('/').pop()}: ${urls.length} URLs`);
      }
      
      console.log(`✅ Total URLs found: ${allUrls.length}`);
      return allUrls;
      
    } catch (error) {
      console.error('❌ Error fetching sitemaps:', error.message);
      throw error;
    }
  }

  /**
   * Fetch XML content from a sitemap URL
   * @param {string} url 
   * @returns {Promise<string>} XML content
   */
  async fetchSitemap(url) {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': config.scraping.userAgent
      },
      timeout: config.scraping.timeout
    });
    return response.data;
  }

  /**
   * Parse sitemap index to extract sub-sitemap URLs
   * @param {string} xml - Sitemap index XML
   * @returns {Array<string>} Sub-sitemap URLs
   */
  parseIndex(xml) {
    const $ = cheerio.load(xml, { xmlMode: true });
    const sitemaps = [];
    
    // Extract all <sitemap><loc> URLs from the index
    $('sitemap loc').each((i, elem) => {
      sitemaps.push($(elem).text().trim());
    });
    
    return sitemaps;
  }

  /**
   * Filter sub-sitemaps based on include/exclude config
   * @param {Array<string>} sitemaps 
   * @returns {Array<string>} Filtered sitemap URLs
   */
  filterSitemaps(sitemaps) {
    return sitemaps.filter(url => {
      const filename = url.split('/').pop();
      
      // Include if in the included list
      const isIncluded = config.knowella.includedSitemaps.some(
        included => filename.includes(included)
      );
      
      // Exclude if in the excluded list
      const isExcluded = config.knowella.excludedSitemaps.some(
        excluded => filename.includes(excluded)
      );
      
      return isIncluded && !isExcluded;
    });
  }

  /**
   * Get all page URLs from a single sitemap
   * @param {string} sitemapUrl 
   * @returns {Promise<Array<{url: string, lastmod: string}>>}
   */
  async getUrlsFromSitemap(sitemapUrl) {
    const xml = await this.fetchSitemap(sitemapUrl);
    const $ = cheerio.load(xml, { xmlMode: true });
    const urls = [];
    
    // Extract all <url><loc> entries
    $('url').each((i, elem) => {
      const url = $(elem).find('loc').text().trim();
      const lastmod = $(elem).find('lastmod').text().trim();
      
      if (url) {
        urls.push({ url, lastmod });
      }
    });
    
    return urls;
  }
}

module.exports = new SitemapService();
