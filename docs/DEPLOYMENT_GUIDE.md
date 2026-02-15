# Deployment Guide - Knowella RAG Chatbot

How to deploy your chatbot for testing on different machines.

---

## 📋 What You Have

1. **Backend API** - Express.js server (port 3000)
2. **Chat UI** - `chat-demo.html` (standalone HTML file)

---

## 🚀 Deployment Options

### **Option 1: Local Testing (Quick Start)**

**On your machine:**

1. **Start your services:**
```bash
cd /c/Users/ASUS/OneDrive/Desktop/knowella_rag
docker-compose up -d
```

2. **Open the chat UI:**
```bash
# Just open the HTML file in browser
start chat-demo.html
# Or:
open chat-demo.html  # Mac
xdg-open chat-demo.html  # Linux
```

3. **Test from other machines on same network:**

```bash
# Find your local IP:
ipconfig  # Windows
ifconfig  # Mac/Linux

# Your IP will be something like: 192.168.1.100
```

**On other machine's browser:**
- Open `chat-demo.html`
- Change API URL to: `http://192.168.1.100:3000`
- Click "Test Connection"
- Start chatting!

---

### **Option 2: Deploy to Free Hosting** (Best for Remote Testing)

#### **A. Deploy Frontend (Chat UI)**

**GitHub Pages (Free):**

1. **Create repository:**
```bash
cd /c/Users/ASUS/OneDrive/Desktop/knowella_rag
git init
git add chat-demo.html
git commit -m "Add chat demo"
gh repo create knowella-chat-demo --public --source=. --push
```

2. **Enable GitHub Pages:**
- Go to repo → Settings → Pages
- Source: main branch
- Save

3. **Access at:** `https://YOUR_USERNAME.github.io/knowella-chat-demo/chat-demo.html`

**Netlify (Even Easier):**

1. **Drag & drop:**
   - Go to https://app.netlify.com/drop
   - Drag `chat-demo.html` file
   - Get instant URL!

2. **Or via CLI:**
```bash
npm install -g netlify-cli
cd /c/Users/ASUS/OneDrive/Desktop/knowella_rag
netlify deploy --prod
# Drag chat-demo.html when prompted
```

**Vercel:**
```bash
npm install -g vercel
cd /c/Users/ASUS/OneDrive/Desktop/knowella_rag
vercel --prod
```

#### **B. Deploy Backend API**

**For DigitalOcean Droplet:**

1. **Create droplet** (Ubuntu 22.04, 4GB RAM)

2. **SSH into server:**
```bash
ssh root@YOUR_DROPLET_IP
```

3. **Install Docker:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install docker-compose -y
```

4. **Upload your code:**
```bash
# On your machine:
scp -r /c/Users/ASUS/OneDrive/Desktop/knowella_rag root@YOUR_DROPLET_IP:/root/
```

5. **Start services:**
```bash
cd /root/knowella_rag
docker-compose up -d
```

6. **Update chat UI:**
   - Change API URL to: `http://YOUR_DROPLET_IP:3000`
   - Or setup domain with HTTPS (recommended)

---

### **Option 3: Docker + Nginx (Production-Ready)**

**Full stack deployment:**

1. **Create `docker-compose.prod.yml`:**
```yaml
version: '3.8'

services:
  api:
    build: ./api
    environment:
      - NODE_ENV=production
      - LLM_PROVIDER=groq
    ports:
      - "3000:3000"
    depends_on:
      - qdrant
      - ollama

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant-data:/qdrant/storage

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./chat-demo.html:/usr/share/nginx/html/index.html
    depends_on:
      - api

volumes:
  qdrant-data:
  ollama-data:
```

2. **Create `nginx.conf`:**
```nginx
events {}

http {
    server {
        listen 80;
        server_name your-domain.com;

        # Serve chat UI
        location / {
            root /usr/share/nginx/html;
            index index.html;
        }

        # Proxy API requests
        location /api/ {
            proxy_pass http://api:3000/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

3. **Deploy:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🌐 Option 4: Railway.app (Easiest Full Stack)

**Deploy everything in 5 minutes:**

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create knowella-rag --public --source=. --push
```

2. **Deploy to Railway:**
   - Go to https://railway.app
   - "New Project" → "Deploy from GitHub"
   - Select your repo
   - Add services: API, Qdrant, Ollama
   - Railway auto-detects and deploys!

3. **Get public URL:**
   - Railway provides: `https://your-app.up.railway.app`
   - Update chat UI API URL

---

## 🔧 Configuration for Different Environments

### **Update API URL in Chat UI:**

Edit `chat-demo.html` line 319:
```javascript
let apiUrl = 'http://localhost:3000';  // Local
// let apiUrl = 'http://192.168.1.100:3000';  // LAN
// let apiUrl = 'http://YOUR_DROPLET_IP:3000';  // DigitalOcean
// let apiUrl = 'https://your-api.railway.app';  // Railway
```

### **CORS Configuration:**

Update `api/.env`:
```bash
# For local network testing:
WORDPRESS_DOMAIN=http://*

# For specific domain:
WORDPRESS_DOMAIN=https://your-domain.com

# For Railway:
WORDPRESS_DOMAIN=https://your-app.up.railway.app
```

---

## 🧪 Testing Scenarios

### **1. Local Testing (Development)**
- **Frontend:** Open `chat-demo.html` locally
- **Backend:** `http://localhost:3000`
- **Users:** Just you

### **2. LAN Testing (Team Testing)**
- **Frontend:** Open `chat-demo.html` on any device
- **Backend:** `http://YOUR_LOCAL_IP:3000`
- **Users:** Anyone on same WiFi

### **3. Internet Testing (Remote Testing)**
- **Frontend:** Netlify/GitHub Pages
- **Backend:** DigitalOcean/Railway
- **Users:** Anyone with link

### **4. Production (Public)**
- **Frontend + Backend:** Railway/Vercel + DigitalOcean
- **Domain:** your-domain.com
- **Users:** Public

---

## 📊 Recommended Setup for Your Use Case

### **For Testing (Now):**
```
Frontend: Netlify (free, instant)
Backend: DigitalOcean Droplet ($24/month)
LLM: Groq API (free tier)

Total Cost: $24/month
Setup Time: 30 minutes
```

### **For Production (Later):**
```
Frontend: Vercel (free)
Backend: DigitalOcean (8GB RAM droplet, $48/month)
LLM: Groq API (paid tier if needed)
CDN: Cloudflare (free)

Total Cost: $48-78/month
Setup Time: 1 hour
```

---

## 🚀 Quick Deploy Script

Create `deploy.sh`:
```bash
#!/bin/bash

echo "🚀 Deploying Knowella RAG Chatbot..."

# Build and push to GitHub
git add .
git commit -m "Update"
git push origin main

# Deploy frontend to Netlify
echo "📦 Deploying frontend..."
netlify deploy --prod --dir=. --site=your-site-id

# Deploy backend to DigitalOcean
echo "🔧 Deploying backend..."
ssh root@YOUR_DROPLET_IP << 'EOF'
cd /root/knowella_rag
git pull
docker-compose down
docker-compose up -d --build
EOF

echo "✅ Deployment complete!"
echo "Frontend: https://your-app.netlify.app"
echo "Backend: http://YOUR_DROPLET_IP:3000"
```

---

## 🔒 Security Considerations

### **For Production:**

1. **Enable HTTPS:**
```bash
# Install Certbot
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

2. **Add rate limiting:**
   - Already configured in API (30 req/min)

3. **Protect ingestion endpoint:**
   - Use strong `INGESTION_TOKEN`

4. **Environment variables:**
```bash
# Never commit .env file!
echo ".env" >> .gitignore
```

---

## 📱 Mobile Testing

The chat UI is responsive and works on mobile:

1. **Deploy to Netlify**
2. **Open URL on phone**
3. **Test performance on mobile networks**

---

## 🎯 Next Steps

1. ✅ **Local test:** Open `chat-demo.html` now
2. ✅ **Deploy frontend:** Netlify (5 mins)
3. ✅ **Deploy backend:** DigitalOcean (30 mins)
4. ✅ **Test from different devices**
5. ✅ **Share link with team**

---

**Want me to help you deploy to Netlify or DigitalOcean right now?** 🚀
