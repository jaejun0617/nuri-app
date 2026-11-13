'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createClient } = require('@supabase/supabase-js');

// Explicit local-only service process. No cron, API-triggered delivery or external push.
async function main() {
  const [configPath, receiptPath] = process.argv.slice(2);
  if (!configPath || !receiptPath)
    throw new Error('CONFIG_AND_RECEIPT_REQUIRED');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (config.API_URL !== 'http://127.0.0.1:56321' || !config.SERVICE_ROLE_KEY)
    throw new Error('LOCAL_ENVIRONMENT_REQUIRED');
  const client = createClient(config.API_URL, config.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, options) =>
        fetch(url, { ...options, signal: AbortSignal.timeout(10000) }),
    },
  });
  const { processSupportReplies } = await import(
    pathToFileURL(
      path.resolve(
        __dirname,
        '../../supabase/functions/_shared/support-reply-worker.js',
      ),
    ).href
  );
  const log = event =>
    fs.appendFileSync(
      receiptPath,
      JSON.stringify({
        at: new Date().toISOString(),
        pid: process.pid,
        ...event,
      }) + '\n',
      { mode: 0o600 },
    );
  let stopped = false;
  let wake;
  const stop = () => {
    stopped = true;
    wake?.();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  log({ state: 'started', api: config.API_URL });
  while (!stopped) {
    try {
      const results = await processSupportReplies(client);
      log({ state: 'poll', results });
    } catch {
      // No tokens, raw backend errors or message text in execution receipts.
      log({ state: 'poll_failed' });
    }
    if (!stopped)
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 1000);
        wake = () => {
          clearTimeout(timer);
          resolve();
        };
      });
  }
  log({ state: 'stopped' });
}
main().catch(() => {
  console.error('LOCAL_SUPPORT_WORKER_STOPPED');
  process.exitCode = 1;
});
