export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

export type LogMeta = Record<string, unknown>;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
}

function serializeMeta(meta: LogMeta | undefined): string {
  if (!meta || Object.keys(meta).length === 0) {
    return "";
  }

  const ancestors: unknown[] = [];
  const serialized = JSON.stringify(meta, function (_key, value: unknown) {
    if (value instanceof Error) {
      return { name: value.name, message: value.message };
    }

    if (typeof value === "bigint") {
      return value.toString();
    }

    if (typeof value === "object" && value !== null) {
      while (ancestors.length > 0 && ancestors.at(-1) !== this) {
        ancestors.pop();
      }

      if (ancestors.includes(value)) {
        return "[Circular]";
      }

      ancestors.push(value);
    }

    return value;
  });

  return ` ${serialized}`;
}

export class LoggerService implements Logger {
  private readonly threshold: number;

  constructor(private readonly level: LogLevel = "info") {
    this.threshold = LEVEL_PRIORITY[level];
  }

  private write(
    entryLevel: Exclude<LogLevel, "silent">,
    message: string,
    meta?: LogMeta,
  ): void {
    if (LEVEL_PRIORITY[entryLevel] < this.threshold) {
      return;
    }

    const line = `[${new Date().toISOString()}] ${entryLevel.toUpperCase()} ${message}${serializeMeta(meta)}`;

    if (entryLevel === "error") {
      console.error(line);
    } else if (entryLevel === "warn") {
      console.warn(line);
    } else if (entryLevel === "debug") {
      console.debug(line);
    } else {
      console.info(line);
    }
  }

  debug(message: string, meta?: LogMeta): void {
    this.write("debug", message, meta);
  }

  info(message: string, meta?: LogMeta): void {
    this.write("info", message, meta);
  }

  warn(message: string, meta?: LogMeta): void {
    this.write("warn", message, meta);
  }

  error(message: string, meta?: LogMeta): void {
    this.write("error", message, meta);
  }
}

export function createLogger(level: LogLevel = "info"): Logger {
  return new LoggerService(level);
}

export const logger = createLogger();
