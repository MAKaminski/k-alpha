let logSize = 0;
const MAX_LOG_SIZE = 100 * 1024; // 100KB

export const log = (message: string): void => {
  const logMessage = `${new Date().toISOString()} - ${message}`;
  const messageSize = Buffer.byteLength(logMessage, 'utf8');
  
  if (logSize + messageSize < MAX_LOG_SIZE) {
    console.log(logMessage);
    logSize += messageSize;
  }
};

export const reset_log_size = (): void => {
  logSize = 0;
};

