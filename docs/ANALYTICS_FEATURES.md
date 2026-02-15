# Analytics & Lead Capture Features

## 🎯 Overview

Your chatbot now captures user information and tracks all questions for lead generation and analytics purposes.

## ✨ New Features

### 1. **Pre-Chat Form** 📝
- Users must provide their **name** and **email** before chatting
- Form appears automatically when they first open the chat
- User info is saved in browser session (persists across page refreshes)
- Clean, professional UI matching your purple theme

### 2. **Automatic Data Capture** 🔍
- **IP Address**: Automatically captured from request headers
- **User Agent**: Browser and device information
- **Session ID**: Unique identifier for each user session
- **Questions**: Every user question is logged (bot responses are NOT stored)

### 3. **Analytics Dashboard** 📊
Access analytics data via API endpoints (add authentication in production):

#### Get Summary Stats
```bash
GET http://your-domain.com/analytics/summary
```

Returns:
- Total sessions
- Total queries
- Unique emails (lead count)
- Average queries per session
- Recent queries
- Top questions

#### Export All Data
```bash
GET http://your-domain.com/analytics/export
```

Returns complete database export (sessions + queries)

#### Get Specific Session
```bash
GET http://your-domain.com/analytics/session/{sessionId}
```

## 🗄️ Database Schema

### `user_sessions` Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| session_id | TEXT | Unique session identifier |
| name | TEXT | User's name |
| email | TEXT | User's email |
| ip_address | TEXT | User's IP |
| user_agent | TEXT | Browser info |
| created_at | DATETIME | First interaction |
| last_active | DATETIME | Last message time |

### `user_queries` Table
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| session_id | TEXT | Links to user_sessions |
| question | TEXT | User's question |
| timestamp | DATETIME | When asked |

**Note**: Bot responses are NOT stored (only user questions)

## 🚀 How to Deploy

### 1. Install New Dependency
```bash
cd api
npm install
```

This will install `better-sqlite3` for the SQLite database.

### 2. Rebuild Docker Container
```bash
# From project root
docker-compose build api
docker-compose up -d api
```

### 3. Database Auto-Creation
The database (`api/data/analytics.db`) will be created automatically on first run.

### 4. Upload Updated Widget to WordPress
1. Replace the widget files in your WordPress installation:
   - `knowella-widget-v4.js` (updated)
   - `knowella-widget.css` (updated)
2. Clear WordPress cache if using caching plugins

## 📊 Viewing Analytics

### Option 1: API Calls (For Developers)
```bash
# Get summary
curl http://your-domain.com/analytics/summary

# Export all data
curl http://your-domain.com/analytics/export > leads.json
```

### Option 2: Direct Database Access
```bash
# SSH into droplet
ssh root@your-droplet-ip

# Access database
cd /path/to/knowella_rag/api/data
sqlite3 analytics.db

# View all leads
SELECT name, email, created_at FROM user_sessions ORDER BY created_at DESC;

# View top questions
SELECT question, COUNT(*) as count FROM user_queries
GROUP BY LOWER(question)
ORDER BY count DESC
LIMIT 10;
```

## 📈 Use Cases

### Lead Generation
- Export email list for marketing campaigns
- Track which pages users came from
- Follow up with users who asked specific questions

### Product Insights
- **Most asked questions** = What users want to know
- **Common pain points** = Product/service gaps
- **Question patterns** = User intent analysis

### Customer Support
- Identify frequently asked questions for FAQ updates
- Track user issues and concerns
- Improve chatbot responses based on real questions

## 🔒 Privacy & GDPR Compliance

### Data Collected
- ✅ Name and email (with user consent via form)
- ✅ IP address (for analytics/security)
- ✅ User questions only (not bot responses)

### Recommended Additions
1. **Privacy Policy Link**: Add to pre-chat form
2. **Checkbox**: "I agree to terms" (optional but recommended)
3. **Data Retention**: Set up cleanup job for old data
4. **Export on Request**: Allow users to request their data

### GDPR-Friendly Updates
To add a privacy checkbox, update the pre-chat form in `knowella-widget-v4.js`:

```javascript
// Add after email field:
<div class="knowella-form-group">
    <label>
        <input type="checkbox" id="knowella-privacy-consent" required>
        I agree to the <a href="/privacy-policy" target="_blank">Privacy Policy</a>
    </label>
</div>
```

## 🔐 Security Recommendations

### 1. Protect Analytics Endpoints (IMPORTANT!)
```javascript
// In api/src/index.js, add authentication:
const analyticsAuth = (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.get('/analytics/summary', analyticsAuth, (req, res) => {
  // ... existing code
});
```

### 2. Add to .env
```env
ADMIN_TOKEN=your-secure-random-token-here
```

### 3. Rate Limiting
Analytics endpoints already use the existing rate limiter.

## 📧 Email Integration

You can integrate with your email marketing tools:

### Mailchimp Integration (Example)
```javascript
// After saving user info, send to Mailchimp
const mailchimp = require('@mailchimp/mailchimp_marketing');

mailchimp.lists.addListMember('list_id', {
  email_address: email,
  status: 'subscribed',
  merge_fields: {
    FNAME: name,
    SOURCE: 'Knowella Chatbot'
  }
});
```

## 🎨 Customization

### Change Form Fields
Edit `showPreChatForm()` in `knowella-widget-v4.js` to add/remove fields.

### Change Form Styling
Edit `.knowella-prechat-form` styles in `knowella-widget.css`.

### Pre-fill Fields (If User Logged In)
```javascript
// In WordPress, pass logged-in user data:
window.knowellaConfig = {
  apiUrl: 'http://your-api.com/chat/knowella',
  prefillName: '<?php echo $current_user->display_name; ?>',
  prefillEmail: '<?php echo $current_user->user_email; ?>'
};
```

## 🐛 Troubleshooting

### Database Not Created
```bash
# Check permissions
ls -la api/data/

# Create directory if missing
mkdir -p api/data
chmod 755 api/data
```

### Users Not Being Tracked
1. Check browser console for errors
2. Verify API receives name/email in request body
3. Check `docker-compose logs api` for database errors

### Pre-Chat Form Not Showing
1. Clear browser cache and session storage
2. Check CSS file is loaded correctly
3. Verify JavaScript is not throwing errors (check browser console)

## 📊 Sample Analytics Query

### Export Leads to CSV
```bash
sqlite3 -header -csv api/data/analytics.db \
  "SELECT name, email, ip_address, created_at FROM user_sessions;" \
  > leads.csv
```

### Get Questions from Last 7 Days
```sql
SELECT
  s.name,
  s.email,
  q.question,
  q.timestamp
FROM user_queries q
JOIN user_sessions s ON q.session_id = s.session_id
WHERE q.timestamp >= datetime('now', '-7 days')
ORDER BY q.timestamp DESC;
```

## 🎉 Next Steps

1. ✅ Deploy updated code
2. ✅ Test pre-chat form
3. ✅ Verify data is being captured
4. ✅ Set up admin dashboard (optional)
5. ✅ Add authentication to analytics endpoints
6. ✅ Integrate with email marketing tools (optional)
7. ✅ Set up data export automation (optional)

---

**Questions or issues?** Check the logs with `docker-compose logs api`
