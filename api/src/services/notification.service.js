/**
 * Notification Service
 * Handles alerts for ingestion failures and system errors
 */

const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    this.emailEnabled = process.env.ALERT_EMAIL_ENABLED === 'true';
    this.transporter = null;

    if (this.emailEnabled) {
      this.initializeEmailTransporter();
    }
  }

  /**
   * Initialize email transporter
   */
  initializeEmailTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });

      console.log('✅ Email notification service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      this.emailEnabled = false;
    }
  }

  /**
   * Send ingestion failure alert
   */
  async sendIngestionFailureAlert(error, context = {}) {
    if (!this.emailEnabled) {
      console.log('⚠️  Email alerts disabled, logging error only');
      return;
    }

    const subject = '🚨 Knowella RAG Ingestion Failed';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">⚠️ Ingestion Failure Alert</h2>

        <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #991b1b;">Error Details</h3>
          <p><strong>Message:</strong> ${error.message || 'Unknown error'}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          ${context.url ? `<p><strong>URL:</strong> ${context.url}</p>` : ''}
          ${context.trigger ? `<p><strong>Trigger:</strong> ${context.trigger}</p>` : ''}
        </div>

        ${error.stack ? `
          <div style="background: #f3f4f6; padding: 16px; margin: 20px 0; border-radius: 8px;">
            <h4 style="margin-top: 0;">Stack Trace</h4>
            <pre style="overflow-x: auto; font-size: 12px;">${error.stack}</pre>
          </div>
        ` : ''}

        <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">Recommended Actions</h3>
          <ul>
            <li>Check if the Knowella website is accessible</li>
            <li>Verify Qdrant database is running</li>
            <li>Check API logs for detailed errors</li>
            <li>Try manual ingestion via API endpoint</li>
          </ul>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

        <p style="color: #6b7280; font-size: 14px;">
          <strong>Knowella RAG System</strong><br>
          Server: ${process.env.SERVER_NAME || 'Unknown'}<br>
          Environment: ${process.env.NODE_ENV || 'development'}
        </p>
      </div>
    `;

    try {
      await this.sendEmail(subject, html);
      console.log('✅ Ingestion failure alert sent');
    } catch (emailError) {
      console.error('❌ Failed to send alert email:', emailError.message);
    }
  }

  /**
   * Send success notification (optional)
   */
  async sendIngestionSuccessAlert(stats) {
    if (!this.emailEnabled || process.env.ALERT_ON_SUCCESS !== 'true') {
      return;
    }

    const subject = '✅ Knowella RAG Ingestion Completed';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">✅ Ingestion Successful</h2>

        <div style="background: #dcfce7; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #166534;">Stats</h3>
          <p><strong>Pages Processed:</strong> ${stats.pagesProcessed || 'N/A'}</p>
          <p><strong>Chunks Created:</strong> ${stats.chunksCreated || 'N/A'}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          <strong>Knowella RAG System</strong>
        </p>
      </div>
    `;

    try {
      await this.sendEmail(subject, html);
    } catch (error) {
      console.error('Failed to send success email:', error.message);
    }
  }

  /**
   * Send email
   */
  async sendEmail(subject, html) {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    const mailOptions = {
      from: `"Knowella RAG System" <${process.env.SMTP_USER}>`,
      to: process.env.ALERT_EMAIL_TO,
      subject: subject,
      html: html
    };

    await this.transporter.sendMail(mailOptions);
  }

  /**
   * Test email configuration
   */
  async testEmailConfig() {
    if (!this.emailEnabled) {
      return { success: false, message: 'Email alerts are disabled' };
    }

    try {
      await this.sendEmail(
        '🧪 Knowella RAG - Test Email',
        '<p>This is a test email from Knowella RAG system. If you received this, email alerts are working correctly!</p>'
      );
      return { success: true, message: 'Test email sent successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new NotificationService();
