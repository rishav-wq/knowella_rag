/**
 * Scheduler Service
 * Handles scheduled tasks like daily Knowella content re-ingestion
 */

const cron = require('node-cron');
const ingestionController = require('../controllers/ingestion.controller');

class SchedulerService {
  constructor() {
    this.jobs = [];
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    console.log('🕐 Starting scheduled jobs...');
    
    // Daily Knowella re-ingestion at 2 AM
    const dailyIngestion = cron.schedule('0 2 * * *', async () => {
      console.log('⏰ Running daily Knowella content re-ingestion...');
      
      try {
        const mockReq = { body: {} };
        const mockRes = {
          json: (data) => {
            console.log('✅ Daily ingestion completed:', data);
          },
          status: function(code) {
            this.statusCode = code;
            return this;
          }
        };
        
        await ingestionController.ingestKnowella(mockReq, mockRes);
        
      } catch (error) {
        console.error('❌ Daily ingestion failed:', error.message);
      }
    });
    
    this.jobs.push(dailyIngestion);
    console.log('✅ Daily ingestion job scheduled for 2:00 AM');
    
    // You can add more scheduled jobs here
    // Example: Weekly cleanup, hourly health checks, etc.
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    console.log('🛑 Stopping scheduled jobs...');
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
  }

  /**
   * Trigger manual ingestion (for testing)
   */
  async triggerManualIngestion() {
    console.log('🔄 Triggering manual Knowella ingestion...');
    
    const mockReq = { body: {} };
    const mockRes = {
      json: (data) => {
        console.log('✅ Manual ingestion completed:', data);
        return data;
      },
      status: function(code) {
        this.statusCode = code;
        return this;
      }
    };
    
    await ingestionController.ingestKnowella(mockReq, mockRes);
  }
}

module.exports = new SchedulerService();
