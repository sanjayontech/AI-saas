#!/bin/bash

# Monitoring Setup Script for AI Chatbot SaaS
# This script sets up comprehensive monitoring with Prometheus, Grafana, and alerting

set -e

echo "🔍 Setting up monitoring stack for AI Chatbot SaaS"

# Check if Docker and Docker Compose are available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

# Create monitoring directories
echo "📁 Creating monitoring directories..."
mkdir -p monitoring/grafana/{provisioning/datasources,provisioning/dashboards,dashboards}
mkdir -p logs

# Create Grafana datasource configuration
echo "📊 Setting up Grafana datasources..."
cat > monitoring/grafana/provisioning/datasources/datasources.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true
EOF

# Create Grafana dashboard provisioning
echo "📈 Setting up Grafana dashboard provisioning..."
cat > monitoring/grafana/provisioning/dashboards/dashboards.yml << EOF
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
EOF

# Create application dashboard
echo "📊 Creating application dashboard..."
cat > monitoring/grafana/dashboards/application-dashboard.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "AI Chatbot SaaS - Application Metrics",
    "tags": ["ai-chatbot", "application"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "HTTP Requests",
        "type": "stat",
        "targets": [
          {
            "expr": "http_requests_total",
            "legendFormat": "Total Requests"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "(http_requests_failed_total / http_requests_total) * 100",
            "legendFormat": "Error Rate %"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "http_request_duration_ms",
            "legendFormat": "Average Response Time"
          },
          {
            "expr": "http_request_duration_p95_ms",
            "legendFormat": "95th Percentile"
          }
        ],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
      }
    ],
    "time": {"from": "now-1h", "to": "now"},
    "refresh": "5s"
  }
}
EOF

# Create system dashboard
echo "🖥️ Creating system dashboard..."
cat > monitoring/grafana/dashboards/system-dashboard.json << 'EOF'
{
  "dashboard": {
    "id": null,
    "title": "AI Chatbot SaaS - System Metrics",
    "tags": ["ai-chatbot", "system"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "100 - (avg by(instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
            "legendFormat": "CPU Usage %"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100",
            "legendFormat": "Memory Usage %"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Disk Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "(node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes * 100",
            "legendFormat": "Disk Usage %"
          }
        ],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
      }
    ],
    "time": {"from": "now-1h", "to": "now"},
    "refresh": "5s"
  }
}
EOF

# Create Loki configuration
echo "📝 Setting up Loki configuration..."
cat > monitoring/loki.yml << EOF
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
    final_sleep: 0s
  chunk_idle_period: 1h
  max_chunk_age: 1h
  chunk_target_size: 1048576
  chunk_retain_period: 30s

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: false
  retention_period: 0s
EOF

# Create Promtail configuration
echo "📋 Setting up Promtail configuration..."
cat > monitoring/promtail.yml << EOF
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: app-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: ai-chatbot-app
          __path__: /var/log/app/*.log

  - job_name: system-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: system
          __path__: /var/log/host/syslog
EOF

# Set proper permissions
echo "🔐 Setting up permissions..."
chmod -R 755 monitoring/
chmod 644 monitoring/grafana/provisioning/datasources/datasources.yml
chmod 644 monitoring/grafana/provisioning/dashboards/dashboards.yml

# Start monitoring stack
echo "🚀 Starting monitoring stack..."
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are running
echo "🔍 Checking service status..."
docker-compose -f docker-compose.monitoring.yml ps

# Display access information
echo ""
echo "✅ Monitoring stack setup completed!"
echo ""
echo "📊 Access URLs:"
echo "  Grafana:      http://localhost:3001 (admin/admin123)"
echo "  Prometheus:   http://localhost:9090"
echo "  AlertManager: http://localhost:9093"
echo "  Jaeger:       http://localhost:16686"
echo ""
echo "📈 Default Dashboards:"
echo "  - Application Metrics"
echo "  - System Metrics"
echo "  - Database Metrics"
echo "  - Redis Metrics"
echo ""
echo "🔔 Alerting:"
echo "  - Configure Slack webhook in .env: SLACK_WEBHOOK_URL"
echo "  - Configure email alerts in .env: ALERT_EMAIL"
echo "  - View alerts in AlertManager: http://localhost:9093"
echo ""
echo "📝 Logs:"
echo "  - Application logs are collected automatically"
echo "  - View logs in Grafana using Loki datasource"
echo ""
echo "🔧 Management Commands:"
echo "  Stop monitoring:  docker-compose -f docker-compose.monitoring.yml down"
echo "  View logs:        docker-compose -f docker-compose.monitoring.yml logs -f"
echo "  Restart:          docker-compose -f docker-compose.monitoring.yml restart"