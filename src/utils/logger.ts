/**
 * src/utils/logger.ts
 *
 * Structured logger for THE ASHER STORE backend API services,
 * Delhivery API requests/responses, Webhooks, and Error tracing.
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogPayload {
  event: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: unknown;
}

function formatLog(level: LogLevel, payload: LogPayload): string {
  const timestamp = new Date().toISOString();
  const meta = {
    timestamp,
    level,
    event: payload.event,
    context: payload.context || "App",
    ...(payload.data ? { data: payload.data } : {}),
    ...(payload.error
      ? {
          error:
            payload.error instanceof Error
              ? { message: payload.error.message, stack: payload.error.stack }
              : payload.error,
        }
      : {}),
  };
  return JSON.stringify(meta);
}

export const logger = {
  info(payload: LogPayload) {
    console.log(formatLog("info", payload));
  },
  warn(payload: LogPayload) {
    console.warn(formatLog("warn", payload));
  },
  error(payload: LogPayload) {
    console.error(formatLog("error", payload));
  },
  debug(payload: LogPayload) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatLog("debug", payload));
    }
  },
};
