#!/bin/bash

# Production Database Setup Script
# This script sets up PostgreSQL for production with security and performance optimizations

set -e

# Configuration
DB_NAME=${DB_NAME:-ai_chatbot_saas}
DB_USER=${DB_USER:-ai_chatbot_user}
DB_PASSWORD=${DB_PASSWORD:-$(openssl rand -base64 32)}
POSTGRES_VERSION=${POSTGRES_VERSION:-15}

echo "🗄️ Setting up production PostgreSQL database"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL $POSTGRES_VERSION first."
    exit 1
fi

# Check if running as postgres user or with sudo
if [[ $EUID -ne 0 ]] && [[ $(whoami) != "postgres" ]]; then
    echo "⚠️  This script should be run as postgres user or with sudo"
    exit 1
fi

echo "📋 Database Configuration:"
echo "  Database Name: $DB_NAME"
echo "  Database User: $DB_USER"
echo "  PostgreSQL Version: $POSTGRES_VERSION"

# Create database user
echo "👤 Creating database user..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" || echo "User may already exist"

# Create database
echo "🗄️ Creating database..."
sudo -u postgres createdb -O $DB_USER $DB_NAME || echo "Database may already exist"

# Grant privileges
echo "🔐 Setting up database privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"

# Configure PostgreSQL for production
echo "⚙️ Configuring PostgreSQL for production..."

# Find PostgreSQL config directory
PG_CONFIG_DIR=$(sudo -u postgres psql -t -P format=unaligned -c 'SHOW config_file;' | xargs dirname)
PG_CONFIG_FILE="$PG_CONFIG_DIR/postgresql.conf"
PG_HBA_FILE="$PG_CONFIG_DIR/pg_hba.conf"

echo "📁 PostgreSQL config directory: $PG_CONFIG_DIR"

# Backup original configuration
sudo cp "$PG_CONFIG_FILE" "$PG_CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$PG_HBA_FILE" "$PG_HBA_FILE.backup.$(date +%Y%m%d_%H%M%S)"

# Update PostgreSQL configuration for production
echo "📝 Updating PostgreSQL configuration..."

# Performance settings
sudo tee -a "$PG_CONFIG_FILE" << EOF

# Production Performance Settings - Added $(date)
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 8
max_parallel_workers_per_gather = 2
max_parallel_workers = 8
max_parallel_maintenance_workers = 2

# Connection settings
max_connections = 100
listen_addresses = 'localhost'
port = 5432

# Security settings
ssl = on
password_encryption = scram-sha-256

# Logging settings
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0

# Monitoring
track_activities = on
track_counts = on
track_io_timing = on
track_functions = all
EOF

# Update pg_hba.conf for security
echo "🔒 Updating authentication configuration..."
sudo sed -i 's/local   all             all                                     peer/local   all             all                                     scram-sha-256/' "$PG_HBA_FILE"
sudo sed -i 's/host    all             all             127.0.0.1\/32            ident/host    all             all             127.0.0.1\/32            scram-sha-256/' "$PG_HBA_FILE"
sudo sed -i 's/host    all             all             ::1\/128                 ident/host    all             all             ::1\/128                 scram-sha-256/' "$PG_HBA_FILE"

# Restart PostgreSQL to apply changes
echo "🔄 Restarting PostgreSQL..."
sudo systemctl restart postgresql

# Wait for PostgreSQL to start
sleep 5

# Test connection
echo "🧪 Testing database connection..."
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();"

# Create backup script
echo "📦 Setting up automated backups..."
BACKUP_SCRIPT="/usr/local/bin/backup-ai-chatbot-db.sh"
sudo tee "$BACKUP_SCRIPT" << EOF
#!/bin/bash
# Automated backup script for AI Chatbot SaaS database

BACKUP_DIR="/var/backups/ai-chatbot-saas"
TIMESTAMP=\$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="\$BACKUP_DIR/backup_${DB_NAME}_\$TIMESTAMP.sql"

mkdir -p "\$BACKUP_DIR"
PGPASSWORD=$DB_PASSWORD pg_dump -h localhost -U $DB_USER -d $DB_NAME > "\$BACKUP_FILE"
gzip "\$BACKUP_FILE"

# Keep only last 7 days of backups
find "\$BACKUP_DIR" -name "backup_${DB_NAME}_*.sql.gz" -mtime +7 -delete

echo "Backup completed: \$BACKUP_FILE.gz"
EOF

sudo chmod +x "$BACKUP_SCRIPT"

# Set up cron job for daily backups
echo "⏰ Setting up daily backup cron job..."
(sudo crontab -l 2>/dev/null; echo "0 2 * * * $BACKUP_SCRIPT") | sudo crontab -

# Create monitoring script
echo "📊 Setting up database monitoring..."
MONITOR_SCRIPT="/usr/local/bin/monitor-ai-chatbot-db.sh"
sudo tee "$MONITOR_SCRIPT" << EOF
#!/bin/bash
# Database monitoring script

DB_NAME=$DB_NAME
DB_USER=$DB_USER

echo "=== Database Status Report - \$(date) ==="
echo ""

# Connection count
echo "Active Connections:"
PGPASSWORD=$DB_PASSWORD psql -h localhost -U \$DB_USER -d \$DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Database size
echo "Database Size:"
PGPASSWORD=$DB_PASSWORD psql -h localhost -U \$DB_USER -d \$DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('\$DB_NAME'));"

# Slow queries
echo "Slow Queries (>1s):"
PGPASSWORD=$DB_PASSWORD psql -h localhost -U \$DB_USER -d \$DB_NAME -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements WHERE mean_time > 1000 ORDER BY mean_time DESC LIMIT 5;" 2>/dev/null || echo "pg_stat_statements extension not available"

echo ""
echo "=== End Report ==="
EOF

sudo chmod +x "$MONITOR_SCRIPT"

echo ""
echo "✅ Production database setup completed successfully!"
echo ""
echo "📋 Summary:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo ""
echo "🔧 Management Commands:"
echo "  Backup: $BACKUP_SCRIPT"
echo "  Monitor: $MONITOR_SCRIPT"
echo "  Connect: PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME"
echo ""
echo "⚠️  IMPORTANT:"
echo "  1. Save the database password securely"
echo "  2. Update your .env.production file with the database credentials"
echo "  3. Test the backup script: $BACKUP_SCRIPT"
echo "  4. Monitor database performance regularly: $MONITOR_SCRIPT"