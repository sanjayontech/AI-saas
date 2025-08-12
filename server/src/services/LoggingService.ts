import fs from 'fs';
import path from 'path';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
  requestId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

class LoggingService {
  private logLevel: LogLevel;
  private logDirectory: string;
  private enableConsole: boolean;
  private enableFile: boolean;

  constructor() {
    this.logLevel = this.getLogLevel();
    this.logDirectory = process.env.LOG_DIRECTORY || './logs';
    this.enableConsole = process.env.ENABLE_CONSOLE_LOGGING !== 'false';
    this.enableFile = process.env.ENABLE_FILE_LOGGING !== 'false';

    // Create logs directory if it doesn't exist
    if (this.enableFile && !fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    switch (level) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatLogEntry(level: string, message: string, meta?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(meta && { meta }),
      ...(process.env.NODE_ENV === 'production' && {
        pid: process.pid,
        hostname: require('os').hostname()
      })
    };
  }

  private writeToConsole(entry: LogEntry) {
    if (!this.enableConsole) return;

    const colorMap = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[37m'  // White
    };

    const color = colorMap[entry.level as keyof typeof colorMap] || '\x1b[37m';
    const reset = '\x1b[0m';

    const logString = `${color}[${entry.timestamp}] ${entry.level}: ${entry.message}${reset}`;
    
    if (entry.level === 'ERROR') {
      console.error(logString, entry.meta || '');
    } else if (entry.level === 'WARN') {
      console.warn(logString, entry.meta || '');
    } else {
      console.log(logString, entry.meta || '');
    }
  }

  private writeToFile(entry: LogEntry) {
    if (!this.enableFile) return;

    try {
      const logString = JSON.stringify(entry) + '\n';
      const logFile = path.join(this.logDirectory, `app-${new Date().toISOString().split('T')[0]}.log`);
      
      fs.appendFileSync(logFile, logString);

      // Also write errors to separate error log
      if (entry.level === 'ERROR') {
        const errorLogFile = path.join(this.logDirectory, `error-${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(errorLogFile, logString);
      }
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private log(level: LogLevel, levelName: string, message: string, meta?: any) {
    if (!this.shouldLog(level)) return;

    const entry = this.formatLogEntry(levelName, message, meta);
    
    this.writeToConsole(entry);
    this.writeToFile(entry);
  }

  error(message: string, meta?: any) {
    this.log(LogLevel.ERROR, 'ERROR', message, meta);
  }

  warn(message: string, meta?: any) {
    this.log(LogLevel.WARN, 'WARN', message, meta);
  }

  info(message: string, meta?: any) {
    this.log(LogLevel.INFO, 'INFO', message, meta);
  }

  debug(message: string, meta?: any) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, meta);
  }

  // Request logging with context
  logRequest(req: any, res: any, responseTime: number) {
    const entry = this.formatLogEntry('INFO', 'HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.id,
      userId: req.user?.id
    });

    this.writeToConsole(entry);
    this.writeToFile(entry);
  }

  // Database query logging
  logQuery(query: string, duration: number, error?: Error) {
    const level = error ? LogLevel.ERROR : LogLevel.DEBUG;
    const levelName = error ? 'ERROR' : 'DEBUG';
    
    this.log(level, levelName, 'Database Query', {
      query: query.substring(0, 500), // Truncate long queries
      duration: `${duration}ms`,
      ...(error && { error: error.message, stack: error.stack })
    });
  }

  // External API call logging
  logApiCall(service: string, endpoint: string, method: string, duration: number, statusCode?: number, error?: Error) {
    const level = error || (statusCode && statusCode >= 400) ? LogLevel.ERROR : LogLevel.INFO;
    const levelName = error || (statusCode && statusCode >= 400) ? 'ERROR' : 'INFO';

    this.log(level, levelName, 'External API Call', {
      service,
      endpoint,
      method,
      duration: `${duration}ms`,
      statusCode,
      ...(error && { error: error.message })
    });
  }

  // Security event logging
  logSecurityEvent(event: string, details: any) {
    this.log(LogLevel.WARN, 'SECURITY', event, details);
  }

  // Performance logging
  logPerformance(operation: string, duration: number, details?: any) {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.INFO; // Warn if operation takes > 1s
    const levelName = duration > 1000 ? 'WARN' : 'INFO';

    this.log(level, levelName, 'Performance', {
      operation,
      duration: `${duration}ms`,
      ...details
    });
  }

  // Business logic logging
  logBusinessEvent(event: string, details: any) {
    this.log(LogLevel.INFO, 'BUSINESS', event, details);
  }

  // Get recent logs (for debugging)
  getRecentLogs(lines: number = 100): LogEntry[] {
    if (!this.enableFile) return [];

    try {
      const logFile = path.join(this.logDirectory, `app-${new Date().toISOString().split('T')[0]}.log`);
      
      if (!fs.existsSync(logFile)) return [];

      const content = fs.readFileSync(logFile, 'utf8');
      const logLines = content.trim().split('\n').slice(-lines);
      
      return logLines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: line
          };
        }
      });
    } catch (error) {
      this.error('Failed to read recent logs', { error: error instanceof Error ? error.message : 'Unknown error' });
      return [];
    }
  }

  // Clean up old log files
  cleanupOldLogs(daysToKeep: number = 7) {
    if (!this.enableFile) return;

    try {
      const files = fs.readdirSync(this.logDirectory);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      files.forEach(file => {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.logDirectory, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            this.info(`Cleaned up old log file: ${file}`);
          }
        }
      });
    } catch (error) {
      this.error('Failed to cleanup old logs', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}

// Create singleton instance
export const logger = new LoggingService();

// Express middleware for request logging
export const requestLoggingMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  // Generate request ID
  req.id = Math.random().toString(36).substring(2, 15);
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logger.logRequest(req, res, responseTime);
  });

  next();
};