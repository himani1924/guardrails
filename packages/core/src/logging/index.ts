import fs from 'node:fs';
import path from 'node:path';

import pino, { type Logger } from 'pino';

import { loadConfig } from '../config/index';

let root: Logger | undefined;

function build(): Logger {
  const cfg = loadConfig();
  const isDev = cfg.NODE_ENV === 'development';
  // #region agent log
  {
    const vendorWorker = path.join(process.cwd(), '.next/server/vendor-chunks/lib/worker.js');
    const threadWorker = path.join(process.cwd(), '../../node_modules/thread-stream/lib/worker.js');
    const pinoWorker = path.join(process.cwd(), '../../node_modules/pino/lib/worker.js');
    fetch('http://127.0.0.1:7322/ingest/363266d2-671e-41b8-8614-9660cd345a57',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0685fc'},body:JSON.stringify({sessionId:'0685fc',runId:'pre-fix',hypothesisId:'A',location:'packages/core/src/logging/index.ts:build',message:'pino logger build',data:{isDev,nodeEnv:cfg.NODE_ENV,cwd:process.cwd(),hasPrettyTransport:isDev,vendorWorkerExists:fs.existsSync(vendorWorker),threadWorkerExists:fs.existsSync(threadWorker),pinoWorkerExists:fs.existsSync(pinoWorker),hasBundlerOverrides:typeof (globalThis as { __bundlerPathsOverrides?: unknown }).__bundlerPathsOverrides !== 'undefined'},timestamp:Date.now()})}).catch(()=>{});
  }
  // #endregion
  // pino-pretty uses thread-stream workers. Next.js webpack rewrites
  // __dirname to `.next/server/vendor-chunks`, so `lib/worker.js` is missing
  // and later log.info/log.error throw "the worker has exited".
  const inNextApp =
    process.env.NEXT_RUNTIME === 'nodejs' ||
    process.env.NEXT_RUNTIME === 'edge' ||
    fs.existsSync(path.join(process.cwd(), 'next.config.mjs'));
  const usePrettyTransport = isDev && !inNextApp;
  // #region agent log
  fetch('http://127.0.0.1:7322/ingest/363266d2-671e-41b8-8614-9660cd345a57',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0685fc'},body:JSON.stringify({sessionId:'0685fc',runId:'post-fix',hypothesisId:'A',location:'packages/core/src/logging/index.ts:build',message:'pino transport decision',data:{inNextApp,usePrettyTransport,nextRuntime:process.env.NEXT_RUNTIME ?? null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  try {
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
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7322/ingest/363266d2-671e-41b8-8614-9660cd345a57',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0685fc'},body:JSON.stringify({sessionId:'0685fc',runId:'pre-fix',hypothesisId:'B',location:'packages/core/src/logging/index.ts:build',message:'pino constructor failed',data:{errorMessage:err instanceof Error ? err.message : String(err)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw err;
  }
}

export function getLogger(bindings?: Record<string, unknown>): Logger {
  if (!root) root = build();
  return bindings ? root.child(bindings) : root;
}

export type { Logger };
