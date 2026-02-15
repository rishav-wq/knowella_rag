# Webhook & Alert System Setup Guide

This guide explains how to set up automatic content ingestion when your WordPress site is updated, with email alerts for failures.

## 🎯 Overview

**What you get:**
- ✅ Automatic RAG ingestion when WordPress content changes
- ✅ Email alerts when ingestion fails
- ✅ Secure webhook authentication
- ✅ Test functionality to verify setup

**Flow:**
```
WordPress Content Updated
    ↓
WordPress Plugin Triggers Webhook
    ↓
RAG API Re-crawls & Re-indexes
    ↓
Email Alert (if failure occurs)
```

---

## 📋 Prerequisites

1. **API Server** running with webhook endpoint
2. **WordPress site** with admin access
3. **Email account** (Gmail, SMTP, etc.) for alerts
4. **Public API URL** (or ngrok for testing)

---

## ⚙️ Step 1: Configure API Environment

### 1.1 Install Dependencies

```bash
cd api
npm install
```

This installs `nodemailer` (for emails) and `node-cron` (for scheduling).

### 1.2 Update `.env` File

Add these settings to your `api/.env`:

```env
# Webhook Configuration
WEBHOOK_SECRET=your-random-secret-here-change-this

# Email Alert Configuration
ALERT_EMAIL_ENABLED=true
ALERT_ON_SUCCESS=false
ALERT_EMAIL_TO=admin@yourdomain.com

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Server Info
SERVER_NAME=Production Server
```

### 1.3 Generate Webhook Secret

Generate a random secure secret:

```bash
# On Linux/Mac
openssl rand -hex 32

# Or use a password generator
# Example: a8f3e9c7b2d4a1e6f8c3b9d7e4a2c5f1
```

**Important:** Use the same secret in both API `.env` and WordPress plugin settings!

---

## 📧 Step 2: Configure Email Alerts

### Option A: Gmail (Recommended for Testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Create App Password:**
   - Go to Google Account → Security → App Passwords
   - Select "Mail" and "Other device"
   - Copy the 16-character password
3. **Update `.env`:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=youremail@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   ```

### Option B: Other SMTP Providers

**SendGrid:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

**Mailgun:**
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-smtp-password
```

**Custom SMTP:**
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=notifications@yourdomain.com
SMTP_PASSWORD=your-password
```

### Test Email Configuration

```bash
curl -X POST http://localhost:3000/test-email
```

---

## 🔌 Step 3: Install WordPress Plugin

### 3.1 Upload Plugin

1. Copy `wordpress/knowella-webhook-trigger.php` to your WordPress:
   ```bash
   wp-content/plugins/knowella-webhook-trigger.php
   ```

2. **Or** upload via WordPress Admin:
   - Go to Plugins → Add New → Upload Plugin
   - Upload the `.php` file
   - Activate the plugin

### 3.2 Configure Plugin

1. Go to **Settings → Knowella Webhook**

2. **Enable Webhook:** Check the box

3. **Webhook URL:** Enter your API endpoint
   ```
   https://your-api-domain.com/webhook/wordpress-update
   ```

   For local testing with ngrok:
   ```bash
   # Start ngrok
   ngrok http 3000

   # Use the URL provided
   https://abc123.ngrok.io/webhook/wordpress-update
   ```

4. **Webhook Secret:** Enter the same secret from your `.env`

5. **Post Types:** Configure which content types trigger ingestion
   ```
   post,page
   ```

6. **Save Settings**

### 3.3 Test Webhook

Click the **"Test Webhook Connection"** button on the settings page.

Expected result:
- ✅ Success message
- 📧 Ingestion starts
- 📧 Email sent (if configured)

---

## 🚀 Step 4: Restart API Server

```bash
cd api
npm run dev
```

You should see:
```
✅ Email notification service initialized
✅ Knowella RAG API running on port 3000
```

---

## 🧪 Step 5: Test End-to-End

### Test 1: Publish New Post

1. Create a new WordPress post
2. Click "Publish"
3. Check API logs for ingestion activity
4. Check email for success/failure notification

### Test 2: Update Existing Page

1. Edit an existing page
2. Click "Update"
3. Verify webhook triggered
4. Check email notifications

### Test 3: Simulate Failure

Stop Qdrant temporarily:
```bash
docker stop qdrant
```

Update a WordPress page and verify you receive a failure alert email.

Restart Qdrant:
```bash
docker start qdrant
```

---

## 📊 Monitoring & Logs

### Check Webhook Logs

**API Logs:**
```bash
# View real-time logs
docker logs -f knowella-api

# Or if running locally
cd api && npm run dev
```

**WordPress Logs:**
```bash
# Enable WordPress debug mode (wp-config.php)
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);

# View logs
tail -f wp-content/debug.log
```

### Email Alert Examples

**Success Email:**
```
✅ Ingestion Successful

Stats:
- Pages Processed: 45
- Chunks Created: 1,234
- Time: 2024-02-15T10:30:00Z
```

**Failure Email:**
```
🚨 Ingestion Failure Alert

Error Details:
- Message: Connection refused to Qdrant
- Time: 2024-02-15T10:30:00Z
- Trigger: wordpress

Recommended Actions:
- Check if Knowella website is accessible
- Verify Qdrant database is running
- Check API logs for detailed errors
```

---

## 🔒 Security Best Practices

1. **Strong Webhook Secret:**
   - Use at least 32 random characters
   - Never commit secrets to Git
   - Rotate secrets periodically

2. **HTTPS Only (Production):**
   ```env
   # Force HTTPS for webhook URL
   https://your-api.com/webhook/wordpress-update
   ```

3. **Restrict WordPress Plugin Access:**
   - Only admin users can configure webhook
   - Plugin validates webhook secret

4. **Rate Limiting:**
   - Webhook endpoint has no rate limit for reliability
   - Use reverse proxy rate limiting if needed

5. **Email Security:**
   - Use app passwords (not main password)
   - Restrict SMTP credentials
   - Monitor for suspicious activity

---

## 🔧 Troubleshooting

### Webhook Not Triggering

**Check 1: Plugin Enabled?**
```
Settings → Knowella Webhook → Enable Webhook ✓
```

**Check 2: Valid URL?**
```bash
curl -X POST https://your-api.com/webhook/wordpress-update \
  -H "X-Webhook-Secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"event":"test"}'
```

**Check 3: Firewall Blocking?**
- Check server firewall rules
- Verify WordPress can reach external URLs
- Test with ngrok for local development

### Email Alerts Not Sending

**Check 1: Email Enabled?**
```env
ALERT_EMAIL_ENABLED=true
```

**Check 2: SMTP Credentials?**
```bash
# Test SMTP connection
curl -X POST http://localhost:3000/test-email
```

**Check 3: Gmail App Password?**
- Use App Password (not regular password)
- Enable 2FA first

**Check 4: Port Blocked?**
- Port 587 for TLS
- Port 465 for SSL
- Check firewall rules

### Ingestion Fails

**Check 1: Services Running?**
```bash
docker ps
# Verify qdrant and ollama are running
```

**Check 2: Website Accessible?**
```bash
curl https://knowella.com
```

**Check 3: API Logs?**
```bash
docker logs knowella-api
```

---

## 🎛️ Advanced Configuration

### Custom Webhook Events

Edit `wordpress/knowella-webhook-trigger.php`:

```php
// Trigger on custom post types
add_action('save_post_product', array($this, 'trigger_on_post_save'), 10, 3);

// Trigger on term updates
add_action('edited_term', array($this, 'trigger_on_term_update'), 10, 3);
```

### Multiple Webhook Endpoints

```php
// Send to multiple APIs
$webhook_urls = array(
    'https://api1.example.com/webhook',
    'https://api2.example.com/webhook'
);

foreach ($webhook_urls as $url) {
    $this->send_webhook_request($url, $event, $data);
}
```

### Delayed Ingestion

Add delay to prevent rapid-fire triggers:

```php
// Wait 5 minutes before triggering
wp_schedule_single_event(time() + 300, 'knowella_delayed_webhook', array($post_id));
```

---

## 📝 Summary Checklist

- [ ] API dependencies installed (`npm install`)
- [ ] `.env` configured with webhook secret
- [ ] Email SMTP credentials configured
- [ ] WordPress plugin uploaded and activated
- [ ] Webhook URL configured in plugin
- [ ] Webhook secret matches in both places
- [ ] Test webhook connection successful
- [ ] Test email alert received
- [ ] End-to-end test completed
- [ ] Production deployment configured

---

## 🆘 Support

**Issues?**
- Check logs: `docker logs -f knowella-api`
- Test individual components
- Verify all credentials
- Check firewall/network settings

**Need Help?**
- Review error messages in email alerts
- Check WordPress debug.log
- Test with ngrok for local debugging
- Consult API documentation

---

**🎉 Done!** Your RAG system will now automatically update when WordPress content changes, with email alerts for any failures.
