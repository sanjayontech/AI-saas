#!/bin/bash

# Database Backup Script for Production
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
DB_HOST=${DB_HOST:-postgres}
DB_NAME=${DB_NAME:-ai_chatbot_saas}
DB_USER=${DB_USER:-postgres}
BACKUP_DIR=${BACKUP_DIR:-/backups}
RETENTION_DAYS=${RETENTION_DAYS:-7}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql"

echo "Starting database backup at $(date)"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "Backup file: $BACKUP_FILE"

# Create database backup
pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" --no-password --verbose > "$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "Backup completed: $BACKUP_FILE"
echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"

# Remove old backups (older than RETENTION_DAYS)
echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "backup_${DB_NAME}_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

echo "Backup process completed at $(date)"

# Optional: Upload to cloud storage (uncomment and configure as needed)
# aws s3 cp "$BACKUP_FILE" "s3://your-backup-bucket/database-backups/"
# gsutil cp "$BACKUP_FILE" "gs://your-backup-bucket/database-backups/"