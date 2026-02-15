/**
 * Ingestion Controller
 * Orchestrates the full ingestion pipeline:
 * sitemap → scrape → chunk → embed → store → bm25 index
 */

const sitemapService = require('../services/sitemap.service');
const scraperService = require('../services/scraper.service');
const chunkerService = require('../services/chunker.service');
const embeddingsService = require('../services/embeddings.service');
const vectorStoreService = require('../services/vectorStore.service');
const bm25Service = require('../services/bm25.service');
const notificationService = require('../services/notification.service');
const config = require('../config/ingestion.config');

class IngestionController {
  /**
   * Run full ingestion pipeline for Knowella
   * @param {object} req 
   * @param {object} res 
   */
  async ingestKnowella(req, res) {
    const startTime = Date.now();
    const trigger = req.body.trigger || req.headers['x-webhook-trigger'] || 'manual';

    try {
      console.log('\n🚀 Starting Knowella ingestion pipeline...\n');
      console.log(`   Trigger: ${trigger}\n`);

      // Step 0: Verify services are ready
      await this.verifyServices();

      // Step 1: Get all URLs from sitemaps
      const urls = await sitemapService.getKnowellaUrls();

      // Step 2: Process each URL
      let processedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      const limit = req.query.limit ? parseInt(req.query.limit) : urls.length;
      const urlsToProcess = urls.slice(0, limit);

      console.log(`\n📄 Processing ${urlsToProcess.length} URLs...\n`);

      for (const { url, lastmod } of urlsToProcess) {
        try {
          await this.processUrl(url, lastmod);
          processedCount++;

          // Rate limiting delay
          await this.delay(config.scraping.crawlDelay);

        } catch (error) {
          console.error(`❌ Error processing ${url}:`, error.message);
          errorCount++;
        }
      }

      // Step 3: Build BM25 index from all chunks in Qdrant
      console.log(`\n🔨 Building BM25 index...`);
      await this.buildBM25Index();

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const stats = await vectorStoreService.getStats();

      console.log(`\n✅ Ingestion complete!`);
      console.log(`   Processed: ${processedCount}`);
      console.log(`   Errors: ${errorCount}`);
      console.log(`   Time: ${elapsed}s`);
      console.log(`   Total chunks in DB: ${stats.total_points}\n`);

      // Send success notification if configured
      await notificationService.sendIngestionSuccessAlert({
        pagesProcessed: processedCount,
        chunksCreated: stats.total_points,
        errors: errorCount,
        duration: elapsed
      });

      res.json({
        success: true,
        processed: processedCount,
        errors: errorCount,
        elapsed_seconds: parseFloat(elapsed),
        stats
      });

    } catch (error) {
      console.error('❌ Ingestion failed:', error);

      // Send failure alert
      await notificationService.sendIngestionFailureAlert(error, {
        url: 'https://knowella.com',
        trigger: trigger,
        timestamp: new Date().toISOString()
      });

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Process a single URL through the pipeline
   * @param {string} url 
   * @param {string} lastmod 
   */
  async processUrl(url, lastmod) {
    console.log(`📥 ${url}`);
    
    // 1. Scrape URL
    const { title, content, contentHash } = await scraperService.scrapeUrl(url);
    
    if (!content || content.length < 100) {
      console.log(`  ⚠️  Skipped (insufficient content)`);
      return;
    }
    
    // 2. Check if content changed
    const hasChanged = await vectorStoreService.hasContentChanged(url, contentHash);
    
    if (!hasChanged) {
      console.log(`  ⏭️  Skipped (no changes)`);
      return;
    }
    
    // 3. Delete old chunks if re-ingesting
    await vectorStoreService.deleteByUrl(url);
    
    // 4. Chunk the content
    const chunks = chunkerService.chunkText(content, {
      url,
      title,
      content_hash: contentHash,
      last_crawled: lastmod || new Date().toISOString()
    });
    
    console.log(`  📝 ${chunks.length} chunks created`);
    
    // 5. Generate embeddings: title + text (text already starts with section heading / first sentence, so no duplicate)
    const textsToEmbed = chunks.map(c => (title ? title + '\n\n' : '') + c.text);
    const embeddings = await embeddingsService.generateEmbeddings(textsToEmbed);
    
    // 6. Combine chunks with embeddings
    const chunksWithEmbeddings = chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i]
    }));
    
    // 7. Store in Qdrant
    await vectorStoreService.upsertChunks(chunksWithEmbeddings);
    
    console.log(`  ✅ Ingested successfully\n`);
  }

  /**
   * Verify all services are ready
   */
  async verifyServices() {
    console.log('🔍 Verifying services...');

    // Check Qdrant
    await vectorStoreService.initCollection();

    // Check Ollama embedding model
    const hasModel = await embeddingsService.checkModel();
    if (!hasModel) {
      throw new Error('Embedding model not available in Ollama');
    }

    console.log('✅ All services ready\n');
  }

  /**
   * Build BM25 index from all chunks in Qdrant
   */
  async buildBM25Index() {
    try {
      // Fetch all chunks from Qdrant
      const allChunks = await vectorStoreService.getAllChunks();

      if (allChunks.length === 0) {
        console.warn('⚠️  No chunks found in Qdrant, skipping BM25 index');
        return;
      }

      // Build BM25 index
      await bm25Service.buildIndex(allChunks);

      console.log('✅ BM25 index built successfully\n');

    } catch (error) {
      console.error('❌ Error building BM25 index:', error.message);
      console.warn('⚠️  Continuing without BM25 index (semantic-only mode)');
    }
  }

  /**
   * Test endpoint - ingest a single URL
   * @param {object} req 
   * @param {object} res 
   */
  async ingestSingleUrl(req, res) {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }
    
    try {
      console.log(`\n🧪 Testing ingestion for: ${url}\n`);
      
      await this.verifyServices();
      await this.processUrl(url, new Date().toISOString());
      
      res.json({ success: true, message: 'URL ingested successfully' });
      
    } catch (error) {
      console.error('❌ Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = new IngestionController();
