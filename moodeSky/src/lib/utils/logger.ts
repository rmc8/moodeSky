/**
 * Logger Utility
 * 環境に応じたログレベル制御と機密情報のマスキング機能を提供
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  OFF = 4
}

interface LogConfig {
  level: LogLevel;
  enableColors: boolean;
  enableTimestamp: boolean;
  maskSensitiveInfo: boolean;
}

class Logger {
  private config: LogConfig;

  constructor() {
    // 環境変数から設定を読み込み（デフォルトは開発環境想定）
    const isDev = import.meta.env.DEV;
    const logLevelEnv = import.meta.env.VITE_LOG_LEVEL;
    
    this.config = {
      level: isDev ? LogLevel.DEBUG : LogLevel.WARN,
      enableColors: isDev,
      enableTimestamp: true,
      maskSensitiveInfo: !isDev
    };

    // 環境変数でログレベルを上書き
    if (logLevelEnv) {
      const levelMap: Record<string, LogLevel> = {
        'DEBUG': LogLevel.DEBUG,
        'INFO': LogLevel.INFO,
        'WARN': LogLevel.WARN,
        'ERROR': LogLevel.ERROR,
        'OFF': LogLevel.OFF
      };
      this.config.level = levelMap[logLevelEnv.toUpperCase()] ?? this.config.level;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: LogLevel, component: string, message: string, data?: any): string {
    const timestamp = this.config.enableTimestamp ? new Date().toISOString() : '';
    const levelStr = LogLevel[level];
    
    let formattedMessage = '';
    
    if (this.config.enableTimestamp) {
      formattedMessage += `[${timestamp}] `;
    }
    
    formattedMessage += `[${levelStr}] [${component}] ${message}`;
    
    if (data) {
      const maskedData = this.config.maskSensitiveInfo ? this.maskSensitiveData(data) : data;
      formattedMessage += ` ${JSON.stringify(maskedData, null, 2)}`;
    }
    
    return formattedMessage;
  }

  private maskSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const masked = { ...data };
    const sensitiveKeys = [
      'accessJwt', 'refreshJwt', 'password', 'token', 'did', 'handle',
      'accountId', 'email', 'phone', 'privateKey', 'secret'
    ];

    for (const key in masked) {
      if (sensitiveKeys.some(sensitiveKey => 
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      )) {
        if (typeof masked[key] === 'string') {
          masked[key] = '*'.repeat(Math.min(masked[key].length, 8));
        } else {
          masked[key] = '[MASKED]';
        }
      } else if (typeof masked[key] === 'object' && masked[key] !== null) {
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    }

    return masked;
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }

  private log(level: LogLevel, component: string, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, component, message, data);
    const consoleMethod = this.getConsoleMethod(level);
    
    if (this.config.enableColors && import.meta.env.DEV) {
      const colors: Record<LogLevel, string> = {
        [LogLevel.DEBUG]: '\x1b[36m', // cyan
        [LogLevel.INFO]: '\x1b[32m',  // green  
        [LogLevel.WARN]: '\x1b[33m',  // yellow
        [LogLevel.ERROR]: '\x1b[31m', // red
        [LogLevel.OFF]: '\x1b[0m',    // no color for OFF
      };
      const resetColor = '\x1b[0m';
      const color = colors[level] || '';
      consoleMethod(`${color}${formattedMessage}${resetColor}`);
    } else {
      consoleMethod(formattedMessage);
    }
  }

  debug(component: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, component, message, data);
  }

  info(component: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, component, message, data);
  }

  warn(component: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, component, message, data);
  }

  error(component: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, component, message, data);
  }

  // 設定の動的更新（テスト用）
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getLevel(): LogLevel {
    return this.config.level;
  }
}

// シングルトンインスタンス
export const logger = new Logger();

// 便利な関数エクスポート
export const createComponentLogger = (componentName: string) => ({
  debug: (message: string, data?: any) => logger.debug(componentName, message, data),
  info: (message: string, data?: any) => logger.info(componentName, message, data),
  warn: (message: string, data?: any) => logger.warn(componentName, message, data),
  error: (message: string, data?: any) => logger.error(componentName, message, data),
});