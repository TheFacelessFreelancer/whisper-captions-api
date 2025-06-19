// utils/logger.js

function getTimestamp() {
  return new Date().toISOString();
}

export function logInfo(...args) {
  console.log(`[🟢 INFO - ${getTimestamp()}]`, ...args);
}

export function logProgress(step, data = {}) {
  console.log(`[📍 ${step.toUpperCase()} - ${getTimestamp()}]`, data);
}

export function logError(label, error) {
  console.error(`[❌ ERROR - ${getTimestamp()}] ${label}:`, error.stack || error.message || error);
}
