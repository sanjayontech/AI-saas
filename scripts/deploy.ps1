# Production Deployment Script for Windows
# This PowerShell script handles the deployment of the AI Chatbot SaaS platform on Windows

param(
    [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

# Configuration
$ProjectName = "ai-chatbot-saas"
$ComposeFile = "docker-compose.production.yml"
$EnvFile = ".env.production"

Write-Host "🚀 Starting deployment for $ProjectName in $Environment environment" -ForegroundColor Green

# Check if required files exist
if (-not (Test-Path $EnvFile)) {
    Write-Host "❌ Error: $EnvFile not found. Please create it from .env.production template" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ComposeFile)) {
    Write-Host "❌ Error: $ComposeFile not found" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Pre-deployment checks..." -ForegroundColor Yellow

# Check Docker and Docker Compose
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Create necessary directories
Write-Host "📁 Creating necessary directories..." -ForegroundColor Yellow
$directories = @("./backups", "./logs", "./logs/nginx")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Gray
    }
}

Write-Host "🔧 Building and starting services..." -ForegroundColor Yellow

# Pull latest images
Write-Host "Pulling latest images..." -ForegroundColor Gray
docker-compose -f $ComposeFile pull

# Build and start services
Write-Host "Building and starting services..." -ForegroundColor Gray
docker-compose -f $ComposeFile up -d --build

Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow

# Wait for services to be ready
Start-Sleep -Seconds 30

# Check PostgreSQL health
Write-Host "Checking PostgreSQL health..." -ForegroundColor Gray
$maxAttempts = 30
$attempt = 0
do {
    $attempt++
    try {
        $result = docker-compose -f $ComposeFile exec -T postgres pg_isready -U postgres 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ PostgreSQL is ready" -ForegroundColor Green
            break
        }
    } catch {
        # Continue trying
    }
    
    if ($attempt -ge $maxAttempts) {
        Write-Host "❌ PostgreSQL failed to become ready within timeout" -ForegroundColor Red
        exit 1
    }
    
    Start-Sleep -Seconds 2
} while ($true)

# Check Redis health
Write-Host "Checking Redis health..." -ForegroundColor Gray
$attempt = 0
do {
    $attempt++
    try {
        $result = docker-compose -f $ComposeFile exec -T redis redis-cli ping 2>$null
        if ($result -match "PONG") {
            Write-Host "✅ Redis is ready" -ForegroundColor Green
            break
        }
    } catch {
        # Continue trying
    }
    
    if ($attempt -ge 15) {
        Write-Host "❌ Redis failed to become ready within timeout" -ForegroundColor Red
        exit 1
    }
    
    Start-Sleep -Seconds 2
} while ($true)

# Run database migrations
Write-Host "🗄️ Running database migrations..." -ForegroundColor Yellow
docker-compose -f $ComposeFile exec -T server npm run db:migrate

Write-Host "🔍 Checking service health..." -ForegroundColor Yellow

# Check if all services are running
$services = docker-compose -f $ComposeFile ps --format "table {{.Name}}\t{{.Status}}"
Write-Host $services

# Display completion message
Write-Host ""
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
docker-compose -f $ComposeFile ps

Write-Host ""
Write-Host "🌐 Application URLs:" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost (or your domain)"
Write-Host "API: http://localhost:3000 (internal)"
Write-Host ""
Write-Host "📝 Logs:" -ForegroundColor Cyan
Write-Host "View all logs: docker-compose -f $ComposeFile logs -f"
Write-Host "View server logs: docker-compose -f $ComposeFile logs -f server"
Write-Host "View client logs: docker-compose -f $ComposeFile logs -f client"
Write-Host ""
Write-Host "🔧 Management Commands:" -ForegroundColor Cyan
Write-Host "Stop services: docker-compose -f $ComposeFile down"
Write-Host "Restart services: docker-compose -f $ComposeFile restart"
Write-Host "Update services: .\scripts\deploy.ps1"