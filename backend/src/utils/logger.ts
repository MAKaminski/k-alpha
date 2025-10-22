let logSize = 0;
const MAX_LOG_SIZE = 100 * 1024; // 100KB

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  DEBUG = 'debug'
}

interface LogEntry {
  message: string;
  level: LogLevel;
  timestamp: string;
  service?: string;
}

const createLogEntry = (message: string, level: LogLevel, service = 'k-alpha'): LogEntry => ({
  message,
  level,
  timestamp: new Date().toISOString(),
  service
});

const logEntry = (entry: LogEntry): void => {
  const logMessage = JSON.stringify(entry);
  const messageSize = Buffer.byteLength(logMessage, 'utf8');
  
  if (logSize + messageSize < MAX_LOG_SIZE) {
    console.log(logMessage);
    logSize += messageSize;
  }
};

export const log = (message: string, level: LogLevel = LogLevel.INFO): void => {
  logEntry(createLogEntry(message, level));
};

export const logInfo = (message: string): void => {
  log(message, LogLevel.INFO);
};

export const logWarn = (message: string): void => {
  log(message, LogLevel.WARN);
};

export const logError = (message: string): void => {
  log(message, LogLevel.ERROR);
};

export const logDebug = (message: string): void => {
  log(message, LogLevel.DEBUG);
};

export const reset_log_size = (): void => {
  logSize = 0;
};

