const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const filename = path.join(__dirname, '../imports/ui/components/audio/audio-graphql/audio-controls/input-stream-live-selector/buttons/LiveSelection.tsx');
const source = fs.readFileSync(filename, 'utf8');
const { code } = babel.transformSync(source, {
  filename, configFile: false, babelrc: false,
  presets: [require.resolve('@babel/preset-typescript'), require.resolve('@babel/preset-react')],
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
});
function render({ mobile, compact, listenOnly = false, transparent = true, locked = false }) {
  const exports = {};
  const plugins = React.createContext({ pluginsExtensibleAreasAggregatedState: {} });
  const context = vm.createContext({ exports, HTMLMediaElement: class {}, require: (name) => {
    if (name === 'react') return React;
    if (name === '/imports/utils/deviceInfo') return { isMobile: mobile };
    if (name === 'react-intl') return { defineMessages: v => v, useIntl: () => ({ formatMessage: v => v.id }) };
    if (name.endsWith('/useShortcut')) return { useShortcut: () => 'j' };
    if (name.endsWith('/menu/component')) return ({ trigger }) => React.createElement('div', null, trigger);
    if (name.endsWith('/enums')) return { AudioSettingsDropdownItemType: { OPTION: 'option', SEPARATOR: 'separator' } };
    if (name === '../styles') return { RelativePositioningContainer: 'div', AudioDropdown: () => React.createElement('button', { 'data-control': 'devices' }) };
    if (name === '../service') return { truncateDeviceName: v => v, handleLeaveAudio: () => {}, liveChangeInputDevice: () => {}, liveChangeOutputDevice: () => {}, notify: () => {} };
    if (name === './muteToggle') return props => React.createElement('button', { 'data-control': 'microphone', disabled: props.disabled, 'data-no-input': props.noInputDevice });
    if (name === './listenOnly') return () => React.createElement('button', { 'data-control': 'leave-audio' });
    if (name.endsWith('/plugin-context/context')) return { PluginsContext: plugins };
    throw Error(`Unexpected import: ${name}`);
  } });
  vm.runInContext(code, context);
  return renderToStaticMarkup(React.createElement(exports.LiveSelection, {
    listenOnly, supportsTransparentListenOnly: transparent, inputDevices: [], outputDevices: [],
    inputDeviceId: listenOnly ? 'listen-only' : 'default', outputDeviceId: '',
    isCompactMobile: compact, muted: true, disabled: false, isAudioLocked: locked,
  }));
}
for (const [name, mobile, compact] of [
  ['iPad with wide layout', true, false],
  ['Android tablet with wide layout', true, false],
  ['tablet with compact layout', true, true],
  ['phone', true, true],
  ['desktop', false, false],
]) {
  test(`${name}: joined microphone remains available to unmute`, () => {
    const html = render({ mobile, compact });
    assert.match(html, /data-control="microphone"/);
    assert.doesNotMatch(html, /data-control="leave-audio"/);
  });
}
test('tablet in transparent listen-only can select a microphone', () => {
  const html = render({ mobile: true, compact: false, listenOnly: true });
  assert.match(html, /data-control="microphone"/);
  assert.match(html, /data-no-input="true"/);
});
test('actual listen-only mode without duplex support keeps its audio control', () => {
  const html = render({ mobile: true, compact: false, listenOnly: true, transparent: false });
  assert.doesNotMatch(html, /data-control="microphone"/);
  assert.match(html, /data-control="leave-audio"/);
});
test('teacher microphone lock still disables the tablet microphone control', () => {
  const html = render({ mobile: true, compact: false, locked: true });
  assert.match(html, /data-control="microphone" disabled=""/);
});
