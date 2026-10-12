const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const StackTrace = require('stacktrace-js');

const sdkRoot = path.dirname(require.resolve('@react-native-firebase/crashlytics/package.json'));
const privateMarker = 'SEC014_SYNTHETIC_PRIVATE_VALUE';

// Exercise the installed SDK, not a replacement handler. Native and network sinks are stubs.
function loadHandlers(entry, options = {}) {
  const source = fs.readFileSync(path.join(sdkRoot, entry), 'utf8');
  const { code } = babel.transformSync(source, {
    filename: entry,
    configFile: false,
    babelrc: false,
    plugins: [
      ...(entry.endsWith('.ts') ? ['@babel/plugin-transform-typescript'] : []),
      '@babel/plugin-transform-modules-commonjs',
    ],
  });
  const originalHandler = jest.fn();
  let globalHandler;
  let rejectionHandler;
  const native = {
    isCrashlyticsCollectionEnabled: options.collection ?? true,
    isErrorGenerationOnJSCrashEnabled: options.jsGeneration ?? true,
    isCrashlyticsJavascriptExceptionHandlerChainingEnabled: options.chaining ?? true,
    setAttribute: jest.fn().mockResolvedValue(undefined),
    recordErrorPromise: jest.fn().mockResolvedValue(undefined),
    crashWithStackPromise: jest.fn().mockResolvedValue(undefined),
    logPromise: jest.fn().mockResolvedValue(undefined),
  };
  const exports = {};
  const context = {
    exports,
    Error,
    __DEV__: options.dev ?? false,
    ErrorUtils: {
      getGlobalHandler: () => originalHandler,
      setGlobalHandler: handler => { globalHandler = handler; },
    },
    require: name => {
      if (name === '.' || name === './index.js') {
        return { firebase: { app: () => ({ analytics: () => ({ logEvent: jest.fn() }) }) } };
      }
      if (name === '@react-native-firebase/app/dist/module/common') {
        return { isError: value => value instanceof Error, once: fn => fn };
      }
      if (name === 'stacktrace-js') return StackTrace;
      if (name === 'promise/setimmediate/rejection-tracking') {
        return { enable: value => { rejectionHandler = value.onUnhandled; } };
      }
      throw new Error('UNEXPECTED_SDK_IMPORT');
    },
  };
  vm.runInNewContext(code, context, { timeout: 1000 });
  exports.setGlobalErrorHandler(native);
  exports.setOnUnhandledPromiseRejectionHandler(native);
  return { exports, native, originalHandler, globalHandler, rejectionHandler };
}

function privateError() {
  const error = Object.assign(new TypeError(privateMarker), { cause: privateMarker });
  error.stack = `TypeError: ${privateMarker}\n    at privateFunction (https://example.invalid/private?token=${privateMarker}:19:23)`;
  return error;
}

function expectSafePayload(payload) {
  expect(payload.message).toBe('redacted_exception');
  expect(JSON.stringify(payload)).not.toContain(privateMarker);
  expect(JSON.stringify(payload)).not.toMatch(/privateFunction|example\.invalid|https:|token=/);
  expect(payload.frames).toEqual([
    expect.objectContaining({ file: 'index.android.bundle:19:23', line: 19, col: 23, fn: 'app' }),
  ]);
}

describe.each(['dist/module/handlers.js', 'lib/handlers.ts'])('automatic SDK privacy boundary: %s', entry => {
  it('sanitizes before automatic capture and before chaining the fatal error', async () => {
    const h = loadHandlers(entry);
    const input = privateError();
    await h.globalHandler(input, true);
    expect(h.native.recordErrorPromise).toHaveBeenCalledTimes(1);
    expectSafePayload(h.native.recordErrorPromise.mock.calls[0][0]);
    expect(h.originalHandler).toHaveBeenCalledTimes(1);
    const [safe, fatal] = h.originalHandler.mock.calls[0];
    expect(safe).not.toBe(input);
    expect(safe.message).toBe('redacted_exception');
    expect(safe.cause).toBeUndefined();
    expect(safe.stack).not.toContain(privateMarker);
    expect(fatal).toBe(true);
    expect(input.message).toBe(privateMarker);
  });

  it('sanitizes unhandled rejections while retaining their classification', async () => {
    const h = loadHandlers(entry);
    await h.rejectionHandler(1, privateError());
    expect(h.native.recordErrorPromise).toHaveBeenCalledTimes(1);
    const payload = h.native.recordErrorPromise.mock.calls[0][0];
    expectSafePayload(payload);
    expect(payload.isUnhandledRejection).toBe(true);
    expect(h.originalHandler).not.toHaveBeenCalled();
  });

  it.each([privateMarker, { message: privateMarker, details: privateMarker }, null])('never sends raw non-Error thrown values', async input => {
    const h = loadHandlers(entry);
    await h.globalHandler(input, false);
    expect(h.native.logPromise).not.toHaveBeenCalled();
    expect(h.native.recordErrorPromise).toHaveBeenCalledTimes(1);
    expect(h.native.recordErrorPromise.mock.calls[0][0].frames).toEqual([]);
    expect(h.originalHandler.mock.calls[0][0].message).toBe('redacted_exception');
    expect(h.originalHandler.mock.calls[0][1]).toBe(false);
    expect(JSON.stringify(h.native.recordErrorPromise.mock.calls)).not.toContain(privateMarker);
  });

  it('fails closed if a thrown object has a hostile stack accessor', async () => {
    const h = loadHandlers(entry);
    const input = Object.defineProperty({ message: privateMarker }, 'stack', {
      get() { throw new Error(privateMarker); },
    });
    await h.globalHandler(input, true);
    expect(h.native.recordErrorPromise).toHaveBeenCalledTimes(1);
    expect(h.originalHandler.mock.calls[0][0].message).toBe('redacted_exception');
    expect(JSON.stringify(h.native.recordErrorPromise.mock.calls)).not.toContain(privateMarker);
    expect(h.native.logPromise).not.toHaveBeenCalled();
  });

  it('reports a stackless rejection without capturing the sanitizer call stack', async () => {
    const h = loadHandlers(entry);
    await h.rejectionHandler(1, privateMarker);
    expect(h.native.recordErrorPromise).toHaveBeenCalledWith({
      message: 'redacted_exception', isUnhandledRejection: true, frames: [],
    });
  });

  it('bounds diagnostic coordinates and removes all custom error properties', async () => {
    const h = loadHandlers(entry);
    const input = privateError();
    input.stack = `Error: ${privateMarker}\n${Array(100).fill(`    at ${privateMarker} (private:19:23)`).join('\n')}`;
    input.componentStack = privateMarker;
    await h.globalHandler(input, true);
    const payload = h.native.recordErrorPromise.mock.calls[0][0];
    expect(payload.frames).toHaveLength(30);
    expect(JSON.stringify(payload)).not.toContain(privateMarker);
    const safe = h.originalHandler.mock.calls[0][0];
    expect(safe.componentStack).toBeUndefined();
    expect(safe.cause).toBeUndefined();
  });

  it('still chains a sanitized fatal error if native reporting rejects', async () => {
    const h = loadHandlers(entry);
    h.native.recordErrorPromise.mockRejectedValue(new Error(privateMarker));
    await h.globalHandler(privateError(), true);
    expect(h.originalHandler).toHaveBeenCalledTimes(1);
    expect(h.originalHandler.mock.calls[0][0].message).toBe('redacted_exception');
    expect(h.originalHandler.mock.calls[0][1]).toBe(true);
    expect(h.native.logPromise).not.toHaveBeenCalled();
  });

  it.each([{ collection: false }, { jsGeneration: false }])('preserves collection/generation gates without leaking into the chained native path', async options => {
    const h = loadHandlers(entry, options);
    await h.globalHandler(privateError(), true);
    expect(h.native.recordErrorPromise).not.toHaveBeenCalled();
    expect(h.native.crashWithStackPromise).not.toHaveBeenCalled();
    expect(h.originalHandler.mock.calls[0][0].message).toBe('redacted_exception');
    expect(h.originalHandler.mock.calls[0][1]).toBe(true);
  });

  it('preserves the no-chaining fatal sink with sanitized frames', async () => {
    const h = loadHandlers(entry, { chaining: false });
    await h.globalHandler(privateError(), true);
    expect(h.native.recordErrorPromise).not.toHaveBeenCalled();
    expect(h.native.crashWithStackPromise).toHaveBeenCalledTimes(1);
    expectSafePayload(h.native.crashWithStackPromise.mock.calls[0][0]);
    expect(h.originalHandler).not.toHaveBeenCalled();
  });

  it('does not alter development error details or enable development rejection capture', async () => {
    const h = loadHandlers(entry, { dev: true, collection: false });
    const input = privateError();
    await h.globalHandler(input, false);
    await h.rejectionHandler(1, input);
    expect(h.originalHandler).toHaveBeenCalledWith(input, false);
    expect(h.native.recordErrorPromise).not.toHaveBeenCalled();
  });

  it('preserves explicit sanitized app reports and stable error codes', () => {
    const h = loadHandlers(entry);
    const payload = h.exports.createNativeErrorObj(new Error('NURI_AUTH_REQUIRED'), [], false);
    expect(payload.message).toBe('NURI_AUTH_REQUIRED');
  });
});
