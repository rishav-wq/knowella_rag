# Knowella Chat Widget - WordPress Plugin

AI-powered chat widget that answers questions using Knowella website content via RAG (Retrieval Augmented Generation).

## Features

- ✅ Floating chat bubble on all pages (bottom-right)
- ✅ Clean, responsive chat interface
- ✅ Mobile-friendly design
- ✅ Displays citations with clickable links
- ✅ Session-based chat history (no server storage)
- ✅ Configurable bot behavior via WordPress admin
- ✅ Rate limiting protection
- ✅ Error handling

## Installation

### Method 1: Upload to WordPress

1. Zip the `knowella-chat-widget` folder
2. Go to WordPress Admin → Plugins → Add New → Upload Plugin
3. Upload the zip file
4. Click "Activate Plugin"

### Method 2: Manual Installation

1. Copy the `knowella-chat-widget` folder to `/wp-content/plugins/`
2. Go to WordPress Admin → Plugins
3. Find "Knowella Chat Widget" and click "Activate"

## Configuration

1. Go to **Settings → Knowella Chat** in WordPress admin
2. Configure:
   - **API Endpoint URL**: Your RAG API URL (e.g., `https://api.knowella.com/chat/knowella`)
   - **Bot Tone**: Communication style
   - **Response Rules**: Guidelines for responses
   - **Disclaimer**: Legal/informational disclaimer
3. Click "Save Changes"

## API Endpoint Requirements

The widget expects a POST endpoint that:

**Request:**
```json
{
  "question": "What services does Knowella offer?"
}
```

**Response:**
```json
{
  "answer": "Knowella offers...",
  "citations": [
    {
      "title": "Page Title",
      "url": "https://knowella.com/page"
    }
  ],
  "metadata": {
    "chunks_retrieved": 3,
    "elapsed_ms": 1234
  }
}
```

## File Structure

```
knowella-chat-widget/
├── knowella-chat-widget.php   # Main plugin file
├── assets/
│   ├── knowella-widget.css    # Widget styles
│   └── knowella-widget.js     # Widget functionality
├── templates/
│   ├── widget.php             # Widget HTML template
│   └── settings.php           # Admin settings page
└── README.md                  # This file
```

## Updating API Endpoint for Production

For production deployment, update the API URL in:
- WordPress Admin → Settings → Knowella Chat → API Endpoint URL

Or set a default in `knowella-chat-widget.php`:

```php
$this->api_url = get_option('knowella_chat_api_url', 'https://your-production-api.com/chat/knowella');
```

## Testing

1. Activate the plugin
2. Visit any page on your WordPress site
3. Look for the blue chat bubble in the bottom-right corner
4. Click to open and test the chat

## Troubleshooting

**Widget not appearing:**
- Check that the plugin is activated
- Clear browser cache
- Check browser console for JavaScript errors

**API connection failing:**
- Use the "Test API Connection" button in Settings
- Verify the API endpoint URL is correct
- Check CORS settings on your API server
- Ensure the API is accessible from your WordPress site

## Browser Support

- Chrome/Edge: ✅ Latest 2 versions
- Firefox: ✅ Latest 2 versions  
- Safari: ✅ Latest 2 versions
- Mobile browsers: ✅ iOS Safari, Chrome Mobile

## License

GPL v2 or later
