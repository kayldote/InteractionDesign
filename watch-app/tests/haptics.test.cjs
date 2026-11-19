const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { join } = require('node:path');

function fixture(supportsAudio = true) {
  const documentHandlers=new Map();let focused=null;
  const elements = new Map(), tones = [], utterances = [], timers = new Map();let timerId=0;
  const element = id => {
    if (!elements.has(id)) elements.set(id, { id,tagName:'BUTTON',focus(){focused=this},closest(){return this.id==='watch'?null:this},textContent:'', innerHTML:'', classList:{toggle(){}}, setAttribute(){}, removeAttribute(){}, addEventListener(){}, querySelectorAll(){return []}, querySelector(){return {textContent:'Standard'}} });
    return elements.get(id);
  };
  class AudioContext {
    constructor(){ this.state='suspended';this.currentTime=0;this.destination={} }
    async resume(){this.state='running'}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}}
    createOscillator(){const tone={frequency:{},connect(){},disconnect(){},start(time){this.startTime=time},stop(time){this.stopTime=time}};tones.push(tone);return tone}
  }
  const document={hidden:false,getElementById:element,body:element('body'),addEventListener(name,fn){documentHandlers.set(name,fn)}};
  const navigator={vibrate(){throw new Error('Sound mode must never request vibration')}};
  const window={addEventListener(){},...(supportsAudio?{AudioContext}:{})};
  const speechSynthesis={cancel(){},speak(utterance){utterances.push(utterance)}};
  const context=vm.createContext({document,navigator,window,speechSynthesis,SpeechSynthesisUtterance:class{constructor(text){this.text=text}},setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,delay});return id},clearTimeout(id){timers.delete(id)},localStorage:{getItem(){return null},setItem(){}},setInterval(){}});
  for(const file of ['haptics.js','rhythm-audio.js','app.js'])vm.runInContext(readFileSync(join(__dirname,'../dist',file),'utf8'),context);
  return {tones,document,element,utterances,timers,focused:()=>focused,key(key,target=focused||element('watch')){let prevented=false;documentHandlers.get('keydown')({key,target,preventDefault(){prevented=true}});return prevented},enableSpeech(){window.speechSynthesis=speechSynthesis},flush(){const pending=[...timers.values()];timers.clear();for(const timer of pending)timer.fn()},run:source=>vm.runInContext(source,context)};
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

test('Back restores the previous screen and selection; Home clears navigation history',()=>{
  const f=fixture();f.run("index=1;go('customize');go('audioSettings');back()");
  assert.equal(f.run('page'),'customize');
  f.run('back()');assert.equal(f.run('page'),'menu');assert.equal(f.run('index'),1);
  f.run("go('directions');menu()");assert.equal(f.run('page'),'menu');assert.equal(f.run('history.length'),0);
});
test('tutorial is available, skippable, and includes all five explanations',()=>{
  const f=fixture();f.run('openTutorial()');assert.equal(f.run('page'),'tutorial');
  assert.match(f.element('content').innerHTML,/Option counts/);
  f.run('lessonMove(3)');assert.match(f.element('content').innerHTML,/Stop reached/);
  f.run('lessonMove(1)');assert.match(f.element('content').innerHTML,/Finish tutorial/);
  f.run('menu()');assert.equal(f.run('page'),'menu');
});
test('speech ends before rhythm starts, with a 250 ms separation',async()=>{
  const f=fixture();await f.run('toggleSounds()');f.tones.length=0;f.enableSpeech();
  f.run("audio=true;go('directions')");
  assert.equal(f.tones.length,0);assert.equal(f.utterances.length,1);
  f.utterances[0].onend();assert.equal(f.tones.length,0);
  assert.equal([...f.timers.values()][0].delay,250);f.flush();
  assert.deepEqual(f.tones.map(t=>Math.round((t.stopTime-t.startTime)*1000)),[70,70,70]);
});
test('new navigation invalidates old speech completion and queued rhythms',async()=>{
  const f=fixture();await f.run('toggleSounds()');f.tones.length=0;f.enableSpeech();
  f.run("audio=true;go('directions')");const old=f.utterances.at(-1);
  f.run('menu()');old.onend();f.flush();assert.equal(f.tones.length,0);
  f.utterances.at(-1).onend();f.flush();assert.equal(f.tones.length,1);
});
test('muting rhythm sounds cancels the cue waiting for speech to finish',async()=>{
  const f=fixture();await f.run('toggleSounds()');f.tones.length=0;f.enableSpeech();
  f.run("audio=true;go('reached')");await f.run('toggleSounds()');
  f.utterances.at(-1).onend();f.flush();assert.equal(f.tones.length,0);
});
test('tutorial example unlocks sound and waits for its explanation',async()=>{
  const f=fixture();f.enableSpeech();f.run('audio=true;openTutorial()');
  await f.run('playLesson()');assert.equal(f.tones.length,0);
  f.utterances.at(-1).onend();f.flush();
  assert.equal(f.tones.length,2);
});

test('arrow navigation wraps forward and backward through menu options',()=>{
  const f=fixture();const count=f.run('view.items.length');
  f.run('move(-1)');assert.equal(f.run('index'),count-1);
  f.run('move(1)');assert.equal(f.run('index'),0);
});
test('nested screen loops exclude Home and Back',()=>{
  const f=fixture();f.run("go('route');index=view.items.length-1;move(1)");
  assert.equal(f.run('index'),0);
  f.run('move(-1)');assert.equal(f.run('index'),f.run('view.items.length-1'));
});
test('flat and bottom Home buttons still return to the main menu',()=>{
  const f=fixture();f.run("go('route')");f.element('side').onclick();
  assert.equal(f.run('page'),'menu');
  f.run("go('directions')");f.element('control-home').onclick();
  assert.equal(f.run('page'),'menu');assert.equal(f.run('history.length'),0);
});

test('clicking a navigation arrow returns focus to the watch so Enter selects',()=>{
  const f=fixture();f.element('next').onclick();
  assert.equal(f.focused().id,'watch');assert.equal(f.run('index'),1);
  assert.equal(f.key('Enter'),true);assert.equal(f.run('page'),'customize');
});
test('keyboard arrows move focus away from a previously clicked Home button',()=>{
  const f=fixture();f.key('ArrowDown',f.element('control-home'));
  assert.equal(f.focused().id,'watch');f.key('Enter');assert.equal(f.run('page'),'customize');
});
test('Enter on an arrow selects the highlight; Tab-focused Home retains native behavior',()=>{
  const f=fixture();f.run('index=1');f.key('Enter',f.element('next'));
  assert.equal(f.run('page'),'customize');
  assert.equal(f.key('Enter',f.element('control-home')),false);
});

test('Left highlights the flat Back button; Enter returns to the previous screen',()=>{
  const f=fixture();f.run("go('route')");f.key('ArrowLeft');
  assert.equal(f.focused().id,'side-back');assert.equal(f.run('sideSelection'),'back');
  f.key('Enter');assert.equal(f.run('page'),'menu');
});
test('Right highlights the flat Home button; Enter returns Home',()=>{
  const f=fixture();f.run("go('route');go('directions')");f.key('ArrowRight');
  assert.equal(f.focused().id,'side');assert.equal(f.run('sideSelection'),'home');
  f.key('Enter');assert.equal(f.run('page'),'menu');assert.equal(f.run('history.length'),0);
});
test('vertical navigation exits side selection and selects options normally',()=>{
  const f=fixture();f.key('ArrowRight');f.key('ArrowDown');
  assert.equal(f.run('sideSelection'),null);assert.equal(f.focused().id,'watch');
  f.key('Enter');assert.equal(f.run('page'),'customize');
});
test('Left does not select a disabled Back button on Home',()=>{
  const f=fixture();f.key('ArrowLeft');assert.equal(f.run('sideSelection'),null);
  assert.match(f.element('transcript').textContent,/unavailable/);
});

test('returning to the first option restores the top of the watch viewport',()=>{
  const f=fixture(), content=f.element('content');
  content.offsetTop=100;content.clientHeight=220;
  content.querySelector=()=>({offsetTop:500,offsetHeight:60});
  f.run('index=2;render()');assert.equal(content.scrollTop,355);
  f.run('move(-1);move(-1)');assert.equal(f.run('index'),0);assert.equal(content.scrollTop,0);
});
test('wrapping to the first option and restoring it with Back reset scrolling',()=>{
  const f=fixture(), content=f.element('content');content.scrollTop=250;
  f.run('index=view.items.length-1;move(1)');assert.equal(content.scrollTop,0);
  f.run("go('route')");content.scrollTop=250;f.run('back()');assert.equal(content.scrollTop,0);
});
test('upper options that fit in the viewport keep the screen scrolled to the top',()=>{
  const f=fixture(), content=f.element('content');
  content.offsetTop=100;content.clientHeight=220;
  content.querySelector=()=>({offsetTop:180,offsetHeight:60});content.scrollTop=200;
  f.run('index=1;render()');assert.equal(content.scrollTop,0);
});
