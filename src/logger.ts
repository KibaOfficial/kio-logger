// Copyright (c) 2024 KibaOfficial
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

enum LoggerStatus {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
  DEBUG = "DEBUG"
}

interface LoggerProps {
  status: LoggerStatus;
  message: string;
}

const LOG_DIR = './logs';
const MAX_LOG_FILES = 7;
const LOG_EXTENSION = '.log';
const ARCHIVE_EXTENSION = '.zip';

/**
 * Ensure the log directory exists
 */
const ensureLogDirectoryExists = () => {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (err) {
    console.error(`Could not create log directory: ${err}`);
  }
};

/**
 * Get the log file name for a specific date
 */
const getLogFileName = (date: Date) => {
  const formattedDate = date.toISOString().slice(0, 10).replace(/-/g, '-'); // YYYY-MM-DD
  return `log-${formattedDate}${LOG_EXTENSION}`;
};

/**
 * Rename the latest log file if it exists
 */
const renameOldLogFile = () => {
  const todayLogFile = path.join(LOG_DIR, getLogFileName(new Date()));
  const latestLogFile = path.join(LOG_DIR, `latest${LOG_EXTENSION}`);

  if (fs.existsSync(latestLogFile)) {
    if (fs.existsSync(todayLogFile)) {
      fs.unlinkSync(todayLogFile);
    }
    fs.renameSync(latestLogFile, todayLogFile);
  }
};

/**
 * Compress old logs into a zip file
 */
const compressOldLogs = () => {
  const files = fs.readdirSync(LOG_DIR)
    .filter(file => file.endsWith(LOG_EXTENSION) && file !== `latest${LOG_EXTENSION}`);
  
  if (files.length > MAX_LOG_FILES) {
    const filesToCompress = files.slice(0, files.length - MAX_LOG_FILES);
    const startDate = new Date(filesToCompress[0].split('-')[1].slice(0, 10));
    const endDate = new Date(filesToCompress[filesToCompress.length - 1].split('-')[1].slice(0, 10));
    const zipFileName = path.join(LOG_DIR, `${startDate.toISOString().slice(0, 10).replace(/-/g, '')}-${endDate.toISOString().slice(0, 10).replace(/-/g, '')}${ARCHIVE_EXTENSION}`);
    
    const zip = zlib.createGzip();
    const output = fs.createWriteStream(zipFileName);
    
    output.on('finish', () => {
      filesToCompress.forEach(file => fs.unlinkSync(path.join(LOG_DIR, file)));
    });
    
    const zipStream = zip.pipe(output);
    
    filesToCompress.forEach((file, index) => {
      const filePath = path.join(LOG_DIR, file);
      const input = fs.createReadStream(filePath);
      input.pipe(zipStream, { end: false });
      input.on('end', () => {
        if (index === filesToCompress.length - 1) {
          zipStream.end();
        }
      });
    });
  }
};

/**
 * Logs a message to the console and a daily log file
 * @param {LoggerProps} props - Object that contains status, message, and optional metadata
 */
export const Logger = ({ status, message }: LoggerProps): void => {
  ensureLogDirectoryExists();
  
  renameOldLogFile();

  const currentDate = new Date();
  const logMessage = `[${currentDate.toISOString()}] [${status}] ${message}\n`;

  let color = '';

  switch (status) {
    case LoggerStatus.ERROR:
      color = '\x1b[31m';
      break;
    case LoggerStatus.WARN:
      color = '\x1b[33m';
      break;
    case LoggerStatus.INFO:
      color = '\x1b[34m';
      break;
    case LoggerStatus.DEBUG:
      color = '\x1b[32m';
      break;
    default:
      color = '\x1b[0m';
  }
  
  console.log(`${color}[${currentDate.toISOString()}] [${status}] ${message}\x1b[0m`);

  const logFile = path.join(LOG_DIR, `latest${LOG_EXTENSION}`);
  fs.appendFileSync(logFile, logMessage);

  compressOldLogs();
};
