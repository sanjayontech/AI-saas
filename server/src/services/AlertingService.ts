import { logger } from './LoggingService';
import { redisClient } from '../config/redis';

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertType {
  SYSTEM_ERROR = 'system_error',
  DATABASE_ERROR = 'database_error',
  EXTERNAL_API_ERROR = 'external_api_error',
  SECURITY_INCIDENT = 'security_incident',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  HIGH_ERROR_RATE = 'high_error_rate',
  RESOURCE_EXHAUSTION = 'resource_exhaustion'
}

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: string;
}

interface AlertRule {
  type: AlertType;
  condition: (data: any) => boolean;
  severity: AlertSeverity;
  title: string;
  messageTemplate: string;
  cooldownMinutes: number;
}

class AlertingService {
  private alertRules: AlertRule[] = [];
  private alertCooldowns: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultRules();
    this.startPeriodicChecks();
  }

  private initializeDefaultRules() {
    this.alertRules = [
      {
        type: AlertType.HIGH_ERROR_RATE,
        condition: (data) => data.errorRate > 0.05, // 5% error rate
        severity: AlertSeverity.HIGH,
        title: 'High Error Rate Detected',
        messageTemplate: 'Error rate is {{errorRate}}% over the last {{timeWindow}} minutes',
        cooldownMinutes: 15
      },
      {
        type: AlertType.PERFORMANCE_DEGRADATION,
        condition: (data) => data.averageResponseTime > 2000, // 2 seconds
        severity: AlertSeverity.MEDIUM,
        title: 'Performance Degradation',
        messageTemplate: 'Average response time is {{averageResponseTime}}ms',
        cooldownMinutes: 10
      },
      {
        type: AlertType.RESOURCE_EXHAUSTION,
        condition: (data) => data.memoryUsagePercent > 90,
        severity: AlertSeverity.CRITICAL,
        title: 'High Memory Usage',
        messageTemplate: 'Memory usage is at {{memoryUsagePercent}}%',
        cooldownMinutes: 5
      },
      {
        type: AlertType.DATABASE_ERROR,
        condition: (data) => data.databaseErrors > 0,
        severity: AlertSeverity.HIGH,
        title: 'Database Connection Issues',
        messageTemplate: 'Database connection errors detected: {{databaseErrors}}',
        cooldownMinutes: 5
      }
    ];
  }

  private startPeriodicChecks() {
    // Check system metrics every minute
    setInterval(() => {
      this.checkSystemMetrics();
    }, 60000);

    // Clean up old alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 3600000);
  }

  private async checkSystemMetrics() {
    try {
      // Get current metrics
      const memUsage = process.memoryUsage();
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      // Check memory usage
      await this.evaluateRule(AlertType.RESOURCE_EXHAUSTION, {
        memoryUsagePercent: Math.round(memoryUsagePercent)
      });

      // Get error metrics from Redis
      const errorMetrics = await this.getErrorMetrics();
      if (errorMetrics) {
        await this.evaluateRule(AlertType.HIGH_ERROR_RATE, errorMetrics);
      }

      // Get performance metrics
      const performanceMetrics = await this.getPerformanceMetrics();
      if (performanceMetrics) {
        await this.evaluateRule(AlertType.PERFORMANCE_DEGRADATION, performanceMetrics);
      }

    } catch (error) {
      logger.error('Failed to check system metrics for alerting', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async getErrorMetrics() {
    try {
      const metricsData = await redisClient.get('app:metrics');
      if (!metricsData) return null;

      const metrics = JSON.parse(metricsData);
      const errorRate = metrics.totalRequests > 0 ? (metrics.failedRequests / metrics.totalRequests) : 0;

      return {
        errorRate: Math.round(errorRate * 100),
        totalRequests: metrics.totalRequests,
        failedRequests: metrics.failedRequests,
        timeWindow: 5 // minutes
      };
    } catch (error) {
      return null;
    }
  }

  private async getPerformanceMetrics() {
    try {
      const metricsData = await redisClient.get('app:metrics');
      if (!metricsData) return null;

      const metrics = JSON.parse(metricsData);
      return {
        averageResponseTime: Math.round(metrics.averageResponseTime)
      };
    } catch (error) {
      return null;
    }
  }

  private async evaluateRule(alertType: AlertType, data: any) {
    const rule = this.alertRules.find(r => r.type === alertType);
    if (!rule) return;

    // Check if rule condition is met
    if (!rule.condition(data)) return;

    // Check cooldown
    const cooldownKey = `${alertType}`;
    const lastAlertTime = this.alertCooldowns.get(cooldownKey) || 0;
    const now = Date.now();
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;

    if (now - lastAlertTime < cooldownMs) return;

    // Create and send alert
    const alert = await this.createAlert(rule, data);
    await this.sendAlert(alert);

    // Update cooldown
    this.alertCooldowns.set(cooldownKey, now);
  }

  private async createAlert(rule: AlertRule, data: any): Promise<Alert> {
    const alert: Alert = {
      id: this.generateAlertId(),
      type: rule.type,
      severity: rule.severity,
      title: rule.title,
      message: this.interpolateMessage(rule.messageTemplate, data),
      timestamp: new Date().toISOString(),
      metadata: data
    };

    // Store alert in Redis
    await redisClient.lPush('app:alerts', JSON.stringify(alert));
    await redisClient.lTrim('app:alerts', 0, 999); // Keep last 1000 alerts

    logger.warn(`Alert created: ${alert.title}`, alert);

    return alert;
  }

  private interpolateMessage(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key]?.toString() || match;
    });
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async sendAlert(alert: Alert) {
    try {
      // Log the alert
      logger.error(`ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`, {
        alert: alert.message,
        metadata: alert.metadata
      });

      // Send to external services based on severity
      if (alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.HIGH) {
        await this.sendToExternalServices(alert);
      }

      // Store in database for dashboard
      await this.storeAlertInDatabase(alert);

    } catch (error) {
      logger.error('Failed to send alert', { 
        alertId: alert.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async sendToExternalServices(alert: Alert) {
    // Send to Slack (if configured)
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendToSlack(alert);
    }

    // Send to email (if configured)
    if (process.env.ALERT_EMAIL) {
      await this.sendToEmail(alert);
    }

    // Send to PagerDuty (if configured)
    if (process.env.PAGERDUTY_INTEGRATION_KEY && alert.severity === AlertSeverity.CRITICAL) {
      await this.sendToPagerDuty(alert);
    }
  }

  private async sendToSlack(alert: Alert) {
    try {
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (!webhookUrl) return;

      const color = {
        [AlertSeverity.LOW]: '#36a64f',
        [AlertSeverity.MEDIUM]: '#ff9500',
        [AlertSeverity.HIGH]: '#ff4500',
        [AlertSeverity.CRITICAL]: '#ff0000'
      }[alert.severity];

      const payload = {
        attachments: [{
          color,
          title: `🚨 ${alert.title}`,
          text: alert.message,
          fields: [
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Type',
              value: alert.type.replace('_', ' ').toUpperCase(),
              short: true
            },
            {
              title: 'Timestamp',
              value: alert.timestamp,
              short: false
            }
          ],
          footer: 'AI Chatbot SaaS Monitoring',
          ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
        }]
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.statusText}`);
      }

      logger.info('Alert sent to Slack', { alertId: alert.id });

    } catch (error) {
      logger.error('Failed to send alert to Slack', { 
        alertId: alert.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async sendToEmail(alert: Alert) {
    try {
      // This would integrate with your email service
      // For now, just log that we would send an email
      logger.info('Would send email alert', { 
        alertId: alert.id,
        to: process.env.ALERT_EMAIL,
        subject: `[${alert.severity.toUpperCase()}] ${alert.title}`
      });
    } catch (error) {
      logger.error('Failed to send email alert', { 
        alertId: alert.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async sendToPagerDuty(alert: Alert) {
    try {
      // This would integrate with PagerDuty API
      // For now, just log that we would send to PagerDuty
      logger.info('Would send PagerDuty alert', { 
        alertId: alert.id,
        integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY ? 'configured' : 'not configured'
      });
    } catch (error) {
      logger.error('Failed to send PagerDuty alert', { 
        alertId: alert.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async storeAlertInDatabase(alert: Alert) {
    try {
      // Store alert in Redis for now (in production, you might want to use the main database)
      await redisClient.setEx(`alert:${alert.id}`, 86400 * 7, JSON.stringify(alert)); // 7 days TTL
    } catch (error) {
      logger.error('Failed to store alert in database', { 
        alertId: alert.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  // Manual alert creation
  async createManualAlert(
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<Alert> {
    const alert: Alert = {
      id: this.generateAlertId(),
      type,
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
      metadata
    };

    await this.sendAlert(alert);
    return alert;
  }

  // Get recent alerts
  async getRecentAlerts(limit: number = 50): Promise<Alert[]> {
    try {
      const alerts = await redisClient.lRange('app:alerts', 0, limit - 1);
      return alerts.map(alert => JSON.parse(alert));
    } catch (error) {
      logger.error('Failed to get recent alerts', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  // Resolve alert
  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const alertData = await redisClient.get(`alert:${alertId}`);
      if (!alertData) return false;

      const alert: Alert = JSON.parse(alertData);
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();

      await redisClient.setEx(`alert:${alertId}`, 86400 * 7, JSON.stringify(alert));
      
      logger.info('Alert resolved', { alertId });
      return true;
    } catch (error) {
      logger.error('Failed to resolve alert', { 
        alertId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  private async cleanupOldAlerts() {
    try {
      // This would clean up old alerts from storage
      logger.debug('Cleaning up old alerts');
    } catch (error) {
      logger.error('Failed to cleanup old alerts', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Add custom alert rule
  addAlertRule(rule: AlertRule) {
    this.alertRules.push(rule);
    logger.info('Added custom alert rule', { type: rule.type, severity: rule.severity });
  }

  // Remove alert rule
  removeAlertRule(type: AlertType) {
    const index = this.alertRules.findIndex(rule => rule.type === type);
    if (index !== -1) {
      this.alertRules.splice(index, 1);
      logger.info('Removed alert rule', { type });
    }
  }
}

// Create singleton instance
export const alertingService = new AlertingService();

// Helper function to create manual alerts
export const createAlert = (
  type: AlertType,
  severity: AlertSeverity,
  title: string,
  message: string,
  metadata?: Record<string, any>
) => {
  return alertingService.createManualAlert(type, severity, title, message, metadata);
};