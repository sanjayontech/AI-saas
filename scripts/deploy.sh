#!/bin/bash

# Production Deployment Script
# This script handles the deployment of the AI Chatbot SaaS platform

set -e

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_NAME="ai-chatbot-saas"
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"

echo "🚀 Starting deployment for $PROJECT_NAME in $ENVIRONMENT environment"

# Check if required files exist
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found. Please create it from .env.production template"
    exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: $COMPOSE_FILE not found"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' $ENV_FILE | xargs)

echo "📋 Pre-deployment checks..."

# Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
sudo mkdir -p /var/lib/ai-chatbot/postgres
sudo mkdir -p /var/lib/ai-chatbot/redis
mkdir -p ./backups
mkdir -p ./logs
mkdir -p ./logs/nginx

# Set proper permissions
sudo chown -R 999:999 /var/lib/ai-chatbot/postgres
sudo chown -R 999:999 /var/lib/ai-chatbot/redis

echo "🔧 Building and starting services..."

# Pull latest images
docker-compose -f $COMPOSE_FILE pull

# Build and start services
docker-compose -f $COMPOSE_FILE up -d --build

echo "⏳ Waiting for services to be healthy..."

# Wait for database to be ready
echo "Waiting for PostgreSQL..."
timeout 60 bash -c 'until docker-compose -f docker-compose.production.yml exec postgres pg_isready -U $DB_USER -d $DB_NAME; do sleep 2; done'

# Wait for Redis to be ready
echo "Waiting for Redis..."
timeout 30 bash -c 'until docker-compose -f docker-compose.production.yml exec redis redis-cli ping; do sleep 2; done'

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f $COMPOSE_FILE exec server npm run db:migrate

echo "🔍 Checking service health..."

# Check if all services are running
if docker-compose -f $COMPOSE_FILE ps | grep -q "Exit"; then
    echo "❌ Some services failed to start:"
    docker-compose -f $COMPOSE_FILE ps
    exit 1
fi

# Display service status
echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Service Status:"
docker-compose -f $COMPOSE_FILE ps

echo ""
echo "🌐 Application URLs:"
echo "Frontend: http://localhost (or your domain)"
echo "API: http://localhost:3000 (internal)"
echo ""
echo "📝 Logs:"
echo "View all logs: docker-compose -f $COMPOSE_FILE logs -f"
echo "View server logs: docker-compose -f $COMPOSE_FILE logs -f server"
echo "View client logs: docker-compose -f $COMPOSE_FILE logs -f client"
echo ""
echo "🔧 Management Commands:"
echo "Stop services: docker-compose -f $COMPOSE_FILE down"
echo "Restart services: docker-compose -f $COMPOSE_FILE restart"
echo "Update services: ./scripts/deploy.sh"