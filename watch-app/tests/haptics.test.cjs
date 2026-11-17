const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { join } = require('node:path');

function fixture(supportsAudio = true) {
  const elements = new Map(), tones = [];
  const element = id => {
    if (!elements.has(id)) elements.set(id, { textContent:'', innerHTML:'', classList:{toggle(){}}, setAttribute(){}, removeAttribute(){}, addEventListener(){}, querySelectorAll(){return []}, querySelector(){return {textContent:'Standard'}} });
    return elements.get(id);
  };
  class AudioContext {
    constructor(){ this.state='suspended';this.currentTime=0;this.destination={} }
    async resume(){this.state='running'}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}}
    createOscillator(){const tone={frequency:{},connect(){},disconnect(){},start(time){this.startTime=time},stop(time){this.stopTime=time}};tones.push(tone);return tone}
  }
  const document={hidden:false,getElementById:element,body:element('body'),addEventListener(){}};
  const navigator={vibrate(){throw new Error('Sound mode must never request vibration')}};
  const window={addEventListener(){},...(supportsAudio?{AudioContext}:{})};
  const context=vm.createContext({document,navigator,window,localStorage:{getItem(){return null},setItem(){}},setInterval(){}});
  for(const file of ['haptics.js','rhythm-audio.js','app.js'])vm.runInContext(readFileSync(join(__dirname,'../dist',file),'utf8'),context);
  return {tones,document,element,run:source=>vm.runInContext(source,context)};
}
const plain=value=>JSON.parse(JSON.stringify(value));

test('routes preserve distinct Figma rhythms',()=>{
  const f=fixture(); const patterns=plain(f.run("[0,1,2,3].map(i=>Haptics.option('routes',i).pattern)"));
  assert.equal(new Set(patterns.map(JSON.stringify)).size,4);
  assert.deepEqual(patterns[0],[280,110,70,110,70]);
  assert.deepEqual(patterns[1],[280,110,280,110,70]);
});
test('no sound plays before the explicit activation gesture',()=>{
  const f=fixture();f.run("go('directions')");assert.equal(f.tones.length,0);
  assert.match(f.element('haptic-status').textContent,/off/);
});
test('enabling sounds unlocks audio and plays short-long-short with correct gaps',async()=>{
  const f=fixture();await f.run('toggleSounds()');
  assert.equal(f.tones.length,3);
  const durations=f.tones.map(t=>Math.round((t.stopTime-t.startTime)*1000));
  assert.deepEqual(durations,[70,280,70]);
  assert.equal(Math.round((f.tones[1].startTime-f.tones[0].stopTime)*1000),110);
  assert.match(f.element('haptic-status').textContent,/Playing/);
});
test('navigation requests three short tones then long-short-short without trailing generic tones',async()=>{
  const f=fixture();await f.run('toggleSounds()');f.tones.length=0;
  f.run("go('directions')");
  assert.deepEqual(f.tones.map(t=>Math.round((t.stopTime-t.startTime)*1000)),[70,70,70]);
  f.tones.length=0;f.run('select()');
  assert.deepEqual(f.tones.map(t=>Math.round((t.stopTime-t.startTime)*1000)),[280,70,70]);
});
test('turning sounds off cancels playback and prevents new tones',async()=>{
  const f=fixture();await f.run('toggleSounds()');await f.run('toggleSounds()');
  assert.ok(f.tones.every(t=>t.stopTime===undefined));
  f.tones.length=0;f.run("go('routes')");assert.equal(f.tones.length,0);
});
test('zero volume, Off rhythm length, and hidden pages remain silent',async()=>{
  const f=fixture();await f.run('toggleSounds()');f.tones.length=0;
  f.run('settings.volume=0;testVibration()');await Promise.resolve();assert.equal(f.tones.length,0);
  f.run("settings.volume=.5;settings.vibration=0;pulse(Haptics.entry('directions',0),true)");assert.equal(f.tones.length,0);
  f.document.hidden=true;f.run("settings.vibration=2;pulse(Haptics.entry('directions',0),true)");assert.equal(f.tones.length,0);
});
test('unsupported audio is reported without breaking navigation',async()=>{
  const f=fixture(false);await f.run('toggleSounds()');
  assert.match(f.element('haptic-status').textContent,/unavailable/);
  f.run("go('directions')");assert.equal(f.element('title').textContent,'Directions');
});
test('length scaling preserves rhythm ratios and menu option counts',async()=>{
  const f=fixture();await f.run('toggleSounds()');f.tones.length=0;
  f.run("settings.vibration=3;pulse(Haptics.entry('reached',0),true)");
  assert.deepEqual(f.tones.map(t=>Math.round((t.stopTime-t.startTime)*1000)),[392,98,98]);
  assert.deepEqual(plain(f.run("Haptics.option('menu',2).pattern")),[70,110,70,110,70]);
});
