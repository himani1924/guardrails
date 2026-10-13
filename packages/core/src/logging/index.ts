import fs from 'node:fs';
import path from 'node:path';

import pino, { type Logger } from 'pino';

import { loadConfig } from '../config/index';

let root: Logger | undefined;

function build(): Logger {
  const cfg = loadConfig();
  const isDev = cfg.NODE_ENV === 'development';
  // pino-pretty uses thread-stream workers. Next.js webpack rewrites
  // __dirname to `.next/server/vendor-chunks`, so `lib/worker.js` is missing
  // and later log.info/log.error throw "the worker has exited".
  const inNextApp =
    process.env.NEXT_RUNTIME === 'nodejs' ||
    process.env.NEXT_RUNTIME === 'edge' ||
    fs.existsSync(path.join(process.cwd(), 'next.config.mjs'));
  const usePrettyTransport = isDev && !inNextApp;
  return pino({
    level: cfg.LOG_LEVEL,
    base: { service: 'guardrail' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['req.headers.authorization', 'password', '*.password', 'apiKey', '*.apiKey'],
      remove: true,
    },
    transport: usePrettyTransport
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', singleLine: false },
        }
      : undefined,
  });
}

export function getLogger(bindings?: Record<string, unknown>): Logger {
  if (!root) root = build();
  return bindings ? root.child(bindings) : root;
}

export type { Logger };
