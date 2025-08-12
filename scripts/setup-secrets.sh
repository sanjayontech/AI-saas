#!/bin/bash

# Production Secrets Setup Script
# This script helps set up secure secrets management for production deployment

set -e

echo "🔐 Setting up production secrets management"

# Check if running as root (required for some operations)
if [[ $EUID -eq 0 ]]; then
   echo "⚠️  This script should not be run as root for security reasons"
   exit 1
fi

# Create secrets directory with proper permissions
SECRETS_DIR="/opt/ai-chatbot-saas/secrets"
echo "📁 Creating secrets directory: $SECRETS_DIR"

sudo mkdir -p "$SECRETS_DIR"
sudo chown $(whoami):$(whoami) "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR"

# Generate strong JWT secrets
echo "🔑 Generating JWT secrets..."
JWT_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)

# Generate database password
echo "🗄️ Generating database password..."
DB_PASSWORD=$(openssl rand -base64 32)

# Generate Redis password
echo "📦 Generating Redis password..."
REDIS_PASSWORD=$(openssl rand -base64 32)

# Create secrets file
SECRETS_FILE="$SECRETS_DIR/.env.secrets"
echo "📝 Creating secrets file: $SECRETS_FILE"

cat > "$SECRETS_FILE" << EOF
# Production Secrets - Generated $(date)
# DO NOT COMMIT THIS FILE TO VERSION CONTROL

# JWT Secrets
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET

# Database Credentials
DB_PASSWORD=$DB_PASSWORD

# Redis Credentials
REDIS_PASSWORD=$REDIS_PASSWORD

# Additional secrets (update these manually)
GOOGLE_API_KEY=your-google-api-key-here
GOOGLE_AI_API_KEY=your-google-ai-api-key-here
SMTP_PASS=your-smtp-password-here
SENTRY_DSN=your-sentry-dsn-here
EOF

# Set proper permissions on secrets file
chmod 600 "$SECRETS_FILE"

echo "✅ Secrets generated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit $SECRETS_FILE and update the placeholder values:"
echo "   - GOOGLE_API_KEY"
echo "   - GOOGLE_AI_API_KEY"
echo "   - SMTP_PASS"
echo "   - SENTRY_DSN"
echo ""
echo "2. Update your .env.production file to source these secrets:"
echo "   source $SECRETS_FILE"
echo ""
echo "3. Ensure the secrets file is included in your backup strategy"
echo "4. Consider using a proper secrets management service like:"
echo "   - AWS Secrets Manager"
echo "   - Azure Key Vault"
echo "   - HashiCorp Vault"
echo "   - Google Secret Manager"
echo ""
echo "⚠️  IMPORTANT: Never commit the secrets file to version control!"

# Create .gitignore entry if it doesn't exist
if ! grep -q "secrets/" .gitignore 2>/dev/null; then
    echo "secrets/" >> .gitignore
    echo "📝 Added secrets/ to .gitignore"
fi