# Monitoring Setup Script for AI Chatbot SaaS (Windows PowerShell)
# This script sets up comprehensive monitoring with Prometheus, Grafana, and alerting

$ErrorActionPreference = "Stop"

Write-Host "🔍 Setting up monitoring stack for AI Chatbot SaaS" -ForegroundColor Green

# Check if Docker and Docker Compose are available
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

# Create monitoring directories
Write-Host "📁 Creating monitoring directories..." -ForegroundColor Yellow
$directories = @(
    "monitoring\grafana\provisioning\datasources",
    "monitoring\grafana\provisioning\dashboards", 
    "monitoring\grafana\dashboards",
    "logs"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "Created directory: $dir" -ForegroundColor Gray
    }
}

# Create Grafana datasource configuration
Write-Host "📊 Setting up Grafana datasources..." -ForegroundColor Yellow
$datasourcesConfig = @"
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
"@

$datasourcesConfig | Out-File -FilePath "monitoring\grafana\provisioning\datasources\datasources.yml" -Encoding UTF8

# Create Grafana dashboard provisioning
Write-Host "📈 Setting up Grafana dashboard provisioning..." -ForegroundColor Yellow
$dashboardsConfig = @"
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
"@

$dashboardsConfig | Out-File -FilePath "monitoring\grafana\provisioning\dashboards\dashboards.yml" -Encoding UTF8

# Create application dashboard
Write-Host "📊 Creating application dashboard..." -ForegroundColor Yellow
$appDashboard = @'
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
'@

$appDashboard | Out-File -FilePath "monitoring\grafana\dashboards\application-dashboard.json" -Encoding UTF8

# Create Loki configuration
Write-Host "📝 Setting up Loki configuration..." -ForegroundColor Yellow
$lokiConfig = @"
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
"@

$lokiConfig | Out-File -FilePath "monitoring\loki.yml" -Encoding UTF8

# Create Promtail configuration
Write-Host "📋 Setting up Promtail configuration..." -ForegroundColor Yellow
$promtailConfig = @"
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
"@

$promtailConfig | Out-File -FilePath "monitoring\promtail.yml" -Encoding UTF8

# Start monitoring stack
Write-Host "🚀 Starting monitoring stack..." -ForegroundColor Yellow
docker-compose -f docker-compose.monitoring.yml up -d

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check if services are running
Write-Host "🔍 Checking service status..." -ForegroundColor Yellow
docker-compose -f docker-compose.monitoring.yml ps

# Display access information
Write-Host ""
Write-Host "✅ Monitoring stack setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Access URLs:" -ForegroundColor Cyan
Write-Host "  Grafana:      http://localhost:3001 (admin/admin123)"
Write-Host "  Prometheus:   http://localhost:9090"
Write-Host "  AlertManager: http://localhost:9093"
Write-Host "  Jaeger:       http://localhost:16686"
Write-Host ""
Write-Host "📈 Default Dashboards:" -ForegroundColor Cyan
Write-Host "  - Application Metrics"
Write-Host "  - System Metrics"
Write-Host "  - Database Metrics"
Write-Host "  - Redis Metrics"
Write-Host ""
Write-Host "🔔 Alerting:" -ForegroundColor Cyan
Write-Host "  - Configure Slack webhook in .env: SLACK_WEBHOOK_URL"
Write-Host "  - Configure email alerts in .env: ALERT_EMAIL"
Write-Host "  - View alerts in AlertManager: http://localhost:9093"
Write-Host ""
Write-Host "📝 Logs:" -ForegroundColor Cyan
Write-Host "  - Application logs are collected automatically"
Write-Host "  - View logs in Grafana using Loki datasource"
Write-Host ""
Write-Host "🔧 Management Commands:" -ForegroundColor Cyan
Write-Host "  Stop monitoring:  docker-compose -f docker-compose.monitoring.yml down"
Write-Host "  View logs:        docker-compose -f docker-compose.monitoring.yml logs -f"
Write-Host "  Restart:          docker-compose -f docker-compose.monitoring.yml restart"