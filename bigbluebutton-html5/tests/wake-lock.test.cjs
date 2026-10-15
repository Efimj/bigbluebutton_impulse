/* Run with: node --test tests/wake-lock.test.cjs */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../imports/ui/components/wake-lock/service.js'), 'utf8')
  .replace(/^import .+;\r?\n/gm, '')
  .replace('export class WakeLock', 'class WakeLock')
  .replace('export default', 'globalThis.service =');
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
class Events extends EventTarget {
  constructor() { super(); this.listeners = new Map(); }
  addEventListener(type, fn, options) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    super.addEventListener(type, fn, options);
  }
  removeEventListener(type, fn) {
    this.listeners.get(type)?.delete(fn);
    super.removeEventListener(type, fn);
  }
  fire(type) { this.dispatchEvent(new Event(type)); }
  count() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}
class Sentinel extends Events {
  constructor() { super(); this.released = false; this.releases = 0; }
  async release() { this.released = true; this.releases += 1; this.fire('release'); }
}
function setup({ hidden = false, supported = true, mobile = true, enabled = true } = {}) {
  const document = new Events();
  document.visibilityState = hidden ? 'hidden' : 'visible';
  const window = new Events();
  window.meetingClientSettings = { public: { app: { wakeLock: { enabled } } } };
  let now = 10000;
  let calls = 0;
  let handler = () => Promise.resolve(new Sentinel());
  const warnings = [];
  const navigator = supported ? { wakeLock: { request: (type) => {
    assert.equal(type, 'screen'); calls += 1; return handler();
  } } } : {};
  const context = vm.createContext({ document, window, navigator, Promise,
    Date: { now: () => now }, deviceInfo: { isMobile: mobile },
    logger: { warn: (...args) => warnings.push(args) } });
  vm.runInContext(source, context);
  return { service: context.service, document, window, warnings,
    calls: () => calls, respond: (fn) => { handler = fn; },
    advance: () => { now += 5001; } };
}

test('visible page acquires once, reuses lock and exports configuration', async () => {
  const e = setup();
  assert.equal(e.service.isEnabled(), true);
  assert.equal((await e.service.request()).error, false);
  await e.service.request();
  e.document.fire('fullscreenchange'); await tick();
  assert.equal(e.calls(), 1); assert.equal(e.service.isActive(), true);
  assert.equal(e.document.count(), 4); assert.equal(e.window.count(), 1);
});
test('hidden page defers; becomes visible and acquires without error', async () => {
  const e = setup({ hidden: true });
  assert.equal((await e.service.request()).deferred, true);
  assert.equal(e.calls(), 0);
  e.document.visibilityState = 'visible'; e.document.fire('visibilitychange'); await tick();
  assert.equal(e.calls(), 1); assert.equal(e.service.isActive(), true);
  assert.equal(e.warnings.length, 0);
});
test('OS releases a hidden lock; page restores it without leaking listeners', async () => {
  const e = setup(); let sentinel;
  e.respond(() => { sentinel = new Sentinel(); return Promise.resolve(sentinel); });
  await e.service.request();
  for (let i = 0; i < 10; i += 1) {
    e.document.visibilityState = 'hidden'; await sentinel.release();
    assert.equal(e.service.isActive(), false);
    e.document.visibilityState = 'visible'; e.document.fire('visibilitychange'); await tick();
    assert.equal(e.service.isActive(), true);
  }
  assert.equal(e.calls(), 11); assert.equal(e.document.count(), 4); assert.equal(e.window.count(), 1);
});
test('a rejected request stays retryable, gesture retry is throttled', async () => {
  const e = setup();
  e.respond(() => Promise.reject(new DOMException('Denied', 'NotAllowedError')));
  assert.equal((await e.service.request()).error, 'wake_lock_request_error');
  for (let i = 0; i < 10; i += 1) e.document.fire('pointerup');
  assert.equal(e.calls(), 1);
  e.respond(() => Promise.resolve(new Sentinel())); e.advance();
  e.document.fire('pointerup'); await tick();
  assert.equal(e.calls(), 2); assert.equal(e.service.isActive(), true);
});
test('rejection while the page is being hidden is deferred, not a warning', async () => {
  const e = setup(); const p = deferred(); e.respond(() => p.promise);
  const result = e.service.request(); e.document.visibilityState = 'hidden';
  p.reject(new DOMException('Hidden', 'NotAllowedError'));
  assert.equal((await result).deferred, true); assert.equal(e.warnings.length, 0);
});
test('concurrent lifecycle events share an in-flight request', async () => {
  const e = setup(); const p = deferred(); e.respond(() => p.promise);
  const a = e.service.request(); const b = e.service.request();
  e.document.fire('visibilitychange'); e.window.fire('pageshow');
  assert.equal(e.calls(), 1); p.resolve(new Sentinel());
  await Promise.all([a, b]); assert.equal(e.service.isActive(), true);
});
test('disable releases lock and removes all automatic retry handlers', async () => {
  const e = setup(); const sentinel = new Sentinel(); e.respond(() => Promise.resolve(sentinel));
  await e.service.request(); await e.service.release();
  e.document.fire('visibilitychange'); e.document.fire('fullscreenchange');
  e.advance(); e.document.fire('pointerup'); e.window.fire('pageshow'); await tick();
  assert.equal(e.calls(), 1); assert.equal(sentinel.releases, 1);
  assert.equal(e.document.count() + e.window.count(), 0);
});
test('disable while acquiring releases the late result and does not warn', async () => {
  const e = setup(); const p = deferred(); const sentinel = new Sentinel(); e.respond(() => p.promise);
  const result = e.service.request(); await e.service.release(); p.resolve(sentinel);
  assert.equal((await result).deferred, true); assert.equal(sentinel.releases, 1);
  assert.equal(e.service.isActive(), false);
});
test('old pending result cannot replace or clear a new lock after off/on', async () => {
  const e = setup(); const old = deferred(); e.respond(() => old.promise);
  const a = e.service.request(); await e.service.release();
  const current = new Sentinel(); e.respond(() => Promise.resolve(current));
  await e.service.request(); const stale = new Sentinel(); old.resolve(stale); await a;
  assert.equal(stale.releases, 1); assert.equal(current.releases, 0);
  assert.equal(e.service.isActive(), true); await e.service.release();
  assert.equal(current.releases, 1);
});
test('acquisition finishing after page hides releases its stale lock', async () => {
  const e = setup(); const p = deferred(); const sentinel = new Sentinel(); e.respond(() => p.promise);
  const result = e.service.request(); e.document.visibilityState = 'hidden'; p.resolve(sentinel);
  assert.equal((await result).deferred, true); assert.equal(sentinel.releases, 1);
});
for (const options of [{ supported: false }, { mobile: false }, { enabled: false }]) {
  test(`unsupported/disabled environment is safe: ${JSON.stringify(options)}`, async () => {
    const e = setup(options);
    assert.equal(e.service.isSupported(), false);
    assert.equal((await e.service.request()).error, 'wake_lock_not_supported');
    await e.service.release(); assert.equal(e.calls(), 0);
    assert.equal(e.document.count() + e.window.count(), 0);
  });
}
test('release refusal is handled without an unhandled rejection', async () => {
  const e = setup(); const sentinel = new Sentinel();
  sentinel.release = () => Promise.reject(new Error('Already invalidated'));
  e.respond(() => Promise.resolve(sentinel)); await e.service.request(); await e.service.release();
  assert.equal(e.service.isActive(), false); assert.equal(e.warnings.length, 1);
});
