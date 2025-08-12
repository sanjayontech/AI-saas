# Production Deployment Guide

This guide covers the complete production deployment setup for the AI Chatbot SaaS platform.

## Prerequisites

- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- PostgreSQL 15+ (if not using Docker)
- Redis 7+ (if not using Docker)
- SSL certificates for HTTPS
- Domain name configured

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-chatbot-saas
   ```

2. **Set up environment variables**
   ```bash
   cp .env.production .env
   # Edit .env with your production values
   ```

3. **Deploy with Docker Compose**
   ```bash
   # Linux/macOS
   ./scripts/deploy.sh
   
   # Windows
   .\scripts\deploy.ps1
   ```

## Detailed Setup

### 1. Server Preparation

#### System Requirements
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 50GB minimum, SSD recommended
- **Network**: Stable internet connection

#### Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply group changes
```

### 2. Environment Configuration

#### Create Production Environment File
```bash
cp .env.production .env
```

#### Required Environment Variables
```bash
# Server Configuration
NODE_ENV=production
PORT=3000
CLIENT_URL=https://yourdomain.com

# Database (use Docker or external PostgreSQL)
DATABASE_URL=postgresql://username:password@host:port/database
DB_SSL=true

# Redis (use Docker or external Redis)
REDIS_URL=redis://username:password@host:port
REDIS_TLS=true

# JWT Secrets (generate strong secrets)
JWT_SECRET=your-256-bit-secret
JWT_REFRESH_SECRET=your-256-bit-refresh-secret

# External APIs
GOOGLE_API_KEY=your-google-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Email Configuration
SMTP_HOST=smtp.yourdomain.com
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-smtp-password

# Security
CORS_ORIGIN=https://yourdomain.com
BCRYPT_ROUNDS=12

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

### 3. SSL/TLS Setup

#### Option 1: Let's Encrypt (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Option 2: Custom Certificates
```bash
# Create SSL directory
mkdir -p ./ssl

# Copy your certificates
cp your-domain.crt ./ssl/
cp your-domain.key ./ssl/
cp ca-bundle.crt ./ssl/
```

### 4. Database Setup

#### Option 1: Docker PostgreSQL (Recommended)
The Docker Compose configuration includes PostgreSQL with production settings.

#### Option 2: External PostgreSQL
```bash
# Run the database setup script
sudo ./server/scripts/setup-production-db.sh

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://ai_chatbot_user:password@localhost:5432/ai_chatbot_saas
```

### 5. Secrets Management

#### Generate Secrets
```bash
./scripts/setup-secrets.sh
```

#### Manual Secret Generation
```bash
# JWT secrets
openssl rand -base64 64

# Database password
openssl rand -base64 32

# API keys (obtain from respective services)
```

### 6. Deployment

#### Using Deployment Script
```bash
# Make script executable
chmod +x scripts/deploy.sh

# Deploy
./scripts/deploy.sh production
```

#### Manual Deployment
```bash
# Create necessary directories
sudo mkdir -p /var/lib/ai-chatbot/{postgres,redis}
mkdir -p {backups,logs,logs/nginx}

# Pull and build images
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d --build

# Run migrations
docker-compose -f docker-compose.production.yml exec server npm run db:migrate

# Check status
docker-compose -f docker-compose.production.yml ps
```

### 7. Reverse Proxy Setup (Nginx)

#### Install Nginx
```bash
sudo apt install nginx
```

#### Configure Nginx
```nginx
# /etc/nginx/sites-available/ai-chatbot-saas
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

#### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/ai-chatbot-saas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Monitoring and Maintenance

### Health Checks
```bash
# Application health
curl -f https://yourdomain.com/health

# Service status
docker-compose -f docker-compose.production.yml ps

# Logs
docker-compose -f docker-compose.production.yml logs -f
```

### Database Maintenance
```bash
# Manual backup
./server/scripts/backup.sh

# Monitor database
./server/scripts/monitor-ai-chatbot-db.sh

# Database migrations
docker-compose -f docker-compose.production.yml exec server npm run db:migrate
```

### Updates and Scaling
```bash
# Update application
git pull origin main
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d --no-deps server client

# Scale services
docker-compose -f docker-compose.production.yml up -d --scale server=3
```

## CI/CD Pipeline

### GitHub Actions Setup
1. Add repository secrets:
   - `PRODUCTION_HOST`: Server IP/hostname
   - `PRODUCTION_USER`: SSH username
   - `PRODUCTION_SSH_KEY`: SSH private key
   - `PRODUCTION_PORT`: SSH port (default: 22)
   - `SLACK_WEBHOOK`: Slack webhook URL (optional)

2. Configure production environment in GitHub repository settings

3. Push to main branch to trigger deployment

### Manual CI/CD
```bash
# Run tests
cd server && npm run test:ci
cd client && npm run test:ci

# Build and deploy
./scripts/deploy.sh production
```

## Security Checklist

- [ ] Strong passwords and secrets generated
- [ ] SSL/TLS certificates configured
- [ ] Firewall configured (only necessary ports open)
- [ ] Database access restricted to application
- [ ] Regular security updates applied
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers implemented

## Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs

# Check system resources
df -h
free -h
docker system df
```

#### Database Connection Issues
```bash
# Test database connection
docker-compose -f docker-compose.production.yml exec postgres pg_isready

# Check database logs
docker-compose -f docker-compose.production.yml logs postgres
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check application metrics
curl https://yourdomain.com/health
```

### Support

For additional support:
1. Check application logs
2. Review monitoring dashboards
3. Consult the troubleshooting section
4. Contact system administrator

## Backup and Recovery

### Automated Backups
- Database backups run daily at 2 AM
- Backups retained for 7 days
- Stored in `/var/backups/ai-chatbot-saas/`

### Manual Backup
```bash
# Database backup
docker-compose -f docker-compose.production.yml exec postgres pg_dump -U postgres ai_chatbot_saas > backup.sql

# Full system backup
tar -czf backup-$(date +%Y%m%d).tar.gz .env docker-compose.production.yml backups/ logs/
```

### Recovery
```bash
# Restore database
docker-compose -f docker-compose.production.yml exec -T postgres psql -U postgres ai_chatbot_saas < backup.sql

# Restore application
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d
```