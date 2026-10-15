const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const React = require('react');
const PropTypes = require('prop-types');
const source = fs.readFileSync(path.join(__dirname, '../imports/ui/components/wake-lock/component.jsx'), 'utf8');
const { code } = babel.transformSync(source, {
  configFile: false, babelrc: false,
  presets: [require.resolve('@babel/preset-react')],
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
});
const tick = () => new Promise((resolve) => setImmediate(resolve));
function setup() {
  const notices = [];
  const exports = {};
  const context = vm.createContext({ exports, require: (name) => {
    if (name === 'react') return React;
    if (name === 'prop-types') return PropTypes;
    if (name === 'react-intl') return { defineMessages: (v) => v, injectIntl: (v) => v };
    if (name === './styles') return { Title: 'strong' };
    if (name === '/imports/ui/services/notification') return { notify: (...args) => notices.push(args) };
    // A transient refusal must not call the settings persistence service.
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  vm.runInContext(code, context);
  let releases = 0;
  let requests = 0;
  let resolve;
  const props = { wakeLockSettings: true,
    intl: { formatMessage: (msg) => msg.id },
    request: () => { requests += 1; return new Promise((r) => { resolve = r; }); },
    release: () => { releases += 1; } };
  const component = new exports.default(props);
  return { component, notices, releases: () => releases, requests: () => requests,
    resolve: (v) => resolve(v) };
}
test('refusal warns without disabling or persisting the user setting', async () => {
  const e = setup(); e.component.componentDidMount();
  e.resolve({ error: 'denied', locale: 'wakeLockAcquireFailed' }); await tick();
  assert.equal(e.component.props.wakeLockSettings, true);
  assert.equal(e.notices.length, 1); assert.equal(e.notices[0][1], 'warning');
});
test('unmount releases lock and suppresses late feedback', async () => {
  const e = setup(); e.component.componentDidMount(); e.component.componentWillUnmount();
  e.resolve({ error: 'denied', locale: 'wakeLockAcquireFailed' }); await tick();
  assert.equal(e.releases(), 1); assert.equal(e.notices.length, 0);
});
test('turning the setting off cancels pending feedback; enabling requests again', async () => {
  const e = setup(); e.component.componentDidMount();
  const prev = e.component.props; e.component.props = { ...prev, wakeLockSettings: false };
  e.component.componentDidUpdate(prev);
  e.resolve({ error: 'denied', locale: 'wakeLockAcquireFailed' }); await tick();
  assert.equal(e.releases(), 1); assert.equal(e.notices.length, 0);
  const disabled = e.component.props; e.component.props = { ...disabled, wakeLockSettings: true };
  e.component.componentDidUpdate(disabled); e.resolve({ error: false }); await tick();
  assert.equal(e.requests(), 2); assert.equal(e.notices.length, 0);
});
test('background-deferred request does not show an error', async () => {
  const e = setup(); e.component.componentDidMount();
  e.resolve({ error: false, deferred: true }); await tick();
  assert.equal(e.notices.length, 0); assert.equal(e.component.props.wakeLockSettings, true);
});
