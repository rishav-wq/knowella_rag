# Setup Script for Knowella RAG Bot

Write-Host "`n🚀 Knowella RAG Setup Script`n" -ForegroundColor Green

# Check if Docker is running
Write-Host "📋 Checking Docker..." -ForegroundColor Cyan
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop.`n" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running`n" -ForegroundColor Green

# Pull required Ollama models
Write-Host "📥 Downloading Ollama models..." -ForegroundColor Cyan
Write-Host "This may take a few minutes...`n"

# Download embedding model (small, ~300MB)
Write-Host "Downloading nomic-embed-text (embedding model)..." -ForegroundColor Yellow
docker exec -it knowella_ollama ollama pull nomic-embed-text

# Download LLM model (larger, ~2GB for 3b model)
Write-Host "`nDownloading llama3.2:3b (language model)..." -ForegroundColor Yellow
docker exec -it knowella_ollama ollama pull llama3.2:3b

# List installed models
Write-Host "`n✅ Models installed:" -ForegroundColor Green
docker exec -it knowella_ollama ollama list

# Test API health
Write-Host "`n🏥 Testing API health..." -ForegroundColor Cyan
$response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -ErrorAction SilentlyContinue
if ($response.StatusCode -eq 200) {
    Write-Host "✅ API is healthy`n" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
} else {
    Write-Host "⚠️  API might not be ready yet. Try restarting containers.`n" -ForegroundColor Yellow
}

Write-Host "`n🎉 Setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Test single URL ingestion:" -ForegroundColor White
Write-Host "   curl -X POST http://localhost:3000/ingest/single -H 'Content-Type: application/json' -d '{""url"":""https://www.knowella.com/about""}'" -ForegroundColor Gray
Write-Host "`n2. Run full ingestion (first 5 pages for testing):" -ForegroundColor White
Write-Host "   curl -X POST 'http://localhost:3000/ingest/knowella?limit=5'" -ForegroundColor Gray
Write-Host "`n3. Open Qdrant dashboard:" -ForegroundColor White
Write-Host "   http://localhost:6333/dashboard`n" -ForegroundColor Gray
