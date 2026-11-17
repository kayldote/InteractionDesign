const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { join } = require('node:path');

function fixture(vibrate = () => true) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      textContent: '', innerHTML: '', classList: { toggle() {} },
      setAttribute() {}, removeAttribute() {}, addEventListener() {},
      querySelectorAll() { return []; }, querySelector() { return { textContent: 'Medium' }; }
    });
    return elements.get(id);
  }
  const calls = [];
  const navigator = { vibrate: pattern => { calls.push(pattern); return vibrate(pattern); }, userActivation: { hasBeenActive: true } };
  const document = { hidden: false, getElementById: element, body: element('body'), addEventListener() {} };
  const context = vm.createContext({ navigator, document, window: { addEventListener() {} }, localStorage: { getItem() { return null; }, setItem() {} }, setInterval() {} });
  vm.runInContext(readFileSync(join(__dirname, '../dist/haptics.js'), 'utf8'), context);
  vm.runInContext(readFileSync(join(__dirname, '../dist/app.js'), 'utf8'), context);
  return { calls, navigator, document, element, run: source => vm.runInContext(source, context) };
}
const plain = value => JSON.parse(JSON.stringify(value));

test('menus count options; Back remains separate from the count', () => {
  const f = fixture();
  assert.deepEqual(plain(f.run("Haptics.option('menu',2).pattern")), [70,110,70,110,70]);
  assert.deepEqual(plain(f.run("Haptics.option('menu',-1).pattern")), [70]);
});
test('all four routes have distinct rhythms, including both Figma examples', () => {
  const f = fixture();
  const patterns = plain(f.run("[0,1,2,3].map(i=>Haptics.option('routes',i).pattern)"));
  assert.equal(new Set(patterns.map(JSON.stringify)).size, 4);
  assert.deepEqual(patterns[0], [280,110,70,110,70]);
  assert.deepEqual(patterns[1], [280,110,280,110,70]);
});
test('navigation and accessibility cues use the specified rhythms', () => {
  const f = fixture();
  assert.deepEqual(plain(f.run("Haptics.option('leave',0).pattern")), [70,110,70]);
  assert.deepEqual(plain(f.run("Haptics.entry('directions',0).pattern")), [70,110,70,110,70]);
  assert.deepEqual(plain(f.run("Haptics.entry('reached',0).pattern")), [280,110,70,110,70]);
  assert.deepEqual(plain(f.run("Haptics.option('reached',0,'Accessibility info').pattern")), [280]);
  assert.deepEqual(plain(f.run("Haptics.option('access',0).pattern")), [70]);
});
test('selecting a navigation step never overwrites its cue with a generic buzz', () => {
  const f = fixture();
  f.run("go('leave')"); f.calls.length = 0;
  f.run('select()');
  assert.deepEqual(plain(f.calls), [[70,110,70,110,70]]);
  f.calls.length = 0;
  f.run('select()');
  assert.deepEqual(plain(f.calls), [[280,110,70,110,70]]);
});
test('hover feedback cannot truncate a navigation entry cue', () => {
  const f = fixture();
  f.run("go('directions'); pulse(Haptics.option('directions',1,'Repeat instruction'))");
  assert.deepEqual(plain(f.calls), [[70,110,70,110,70]]);
});
test('scroll boundaries do not buzz again; changed options do', () => {
  const f = fixture();
  f.run('move(-1)'); assert.equal(f.calls.length, 0);
  f.run('move(1)'); assert.deepEqual(plain(f.calls), [[70,110,70]]);
});
test('Off cancels vibration, including Test vibration', () => {
  const f = fixture();
  f.run('settings.vibration=0; testVibration()');
  assert.deepEqual(f.calls, [0]);
  assert.match(f.element('transcript').textContent, /off/);
});
test('duration scaling preserves pulse count, gaps, and long/short distinction', () => {
  const f = fixture();
  f.run("settings.vibration=1; pulse(Haptics.entry('reached',0))");
  f.run("settings.vibration=3; pulse(Haptics.entry('reached',0))");
  assert.deepEqual(plain(f.calls), [[182,110,46,110,46],[392,110,98,110,98]]);
});
test('unsupported hardware/API and rejected requests are reported without crashing', () => {
  const f = fixture(() => false);
  f.run('testVibration()');
  assert.match(f.element('transcript').textContent, /blocked/);
  delete f.navigator.vibrate;
  f.run('testVibration()');
  assert.match(f.element('transcript').textContent, /unavailable/);
});
test('hidden pages and missing activation do not request a vibration', () => {
  const f = fixture(); f.document.hidden = true;
  f.run('pulse()'); assert.equal(f.calls.length, 0);
  f.document.hidden = false; f.navigator.userActivation.hasBeenActive = false;
  f.run('pulse()'); assert.equal(f.calls.length, 0);
});
test('API exceptions cannot interrupt navigation', () => {
  const f = fixture(() => { throw new Error('not allowed'); });
  f.run("go('directions')");
  assert.equal(f.element('title').textContent, 'Directions');
  assert.match(f.element('haptic-status').textContent, /could not/);
});
