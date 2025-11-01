/**
 * Утилита для логирования с уровнями логирования
 * Поддерживает разные уровни: debug, info, warn, error
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    // Уровень логирования из переменной окружения или по умолчанию
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || (this.isDevelopment ? 'debug' : 'info');
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | any, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
      };
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  // Специальные методы для трейсинга
  trace(functionName: string, params?: any, context?: LogContext): void {
    this.debug(`→ ${functionName}`, { params, ...context });
  }

  traceEnd(functionName: string, result?: any, duration?: number, context?: LogContext): void {
    this.debug(`← ${functionName}`, { result, duration: duration ? `${duration}ms` : undefined, ...context });
  }

  // Логирование API вызовов
  apiCall(apiName: string, method: string, params?: any, context?: LogContext): void {
    this.info(`API: ${apiName}.${method}`, { params, ...context });
  }

  apiSuccess(apiName: string, method: string, duration: number, context?: LogContext): void {
    this.info(`API: ${apiName}.${method} SUCCESS`, { duration: `${duration}ms`, ...context });
  }

  apiError(apiName: string, method: string, error: any, duration?: number, context?: LogContext): void {
    this.error(`API: ${apiName}.${method} ERROR`, error, { duration: duration ? `${duration}ms` : undefined, ...context });
  }

  // Логирование производительности
  performance(operation: string, duration: number, context?: LogContext): void {
    const level = duration > 5000 ? 'warn' : duration > 2000 ? 'info' : 'debug';
    this[level](`PERF: ${operation}`, { duration: `${duration}ms`, ...context });
  }
}

// Экспортируем singleton экземпляр
export const logger = new Logger();

// Экспортируем класс для расширения
export { Logger };
export type { LogLevel, LogContext };

