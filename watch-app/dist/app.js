const $=id=>document.getElementById(id);
const routes=[['01','Bonfire'],['03','Yell Practice'],['04','Gig Em'],['05','Bush School']];
let sideSelection=null;
let page='menu',index=0,route=0,history=[],audio=false,lastWheel=0,wheelTotal=0;
let settings={rate:1,volume:.5,vibration:2,sounds:false,contrast:false,large:false};
try{settings={...settings,...JSON.parse(localStorage.getItem('transit-settings')||'{}')}}catch{}
const save=()=>{try{localStorage.setItem('transit-settings',JSON.stringify(settings))}catch{}};
const routeName=()=>`Route ${routes[route][0]} — ${routes[route][1]}`;
const item=(label,action,icon='')=>({label,action,icon});
function go(next){history.push({page,index});page=next;index=0;render(true)}
function back(){const old=history.pop();if(old){page=old.page;index=old.index;render(true,true)}else if(page!=='menu'){page='menu';index=0;render(true)}}
function home(){history=[];page='routes';index=0;render(true)}
function menu(){history=[];page='menu';index=0;render(true)}
let tutorialStep=0;
const lessons=[
  {title:'Option counts',text:'One short pulse means the first option, two mean the second, and three mean the third. Back is a separate short pulse.',pattern:[70,110,70]},
  {title:'Route rhythms',text:'Each route has its own rhythm. Bonfire is long, short, short. Yell Practice is long, long, short. Gig Em is short, long, short. Bush School is short, short, long.',pattern:[280,110,70,110,70]},
  {title:'Continue and turn',text:'Two short pulses mean continue navigation. Three short pulses mean a turn is approaching. Listen to the turn cue.',pattern:[70,110,70,110,70]},
  {title:'Stop reached',text:'One long pulse followed by two short pulses means you have reached your stop.',pattern:[280,110,70,110,70]},
  {title:'Accessibility and repeats',text:'A long pulse identifies accessibility information. A short pulse identifies Repeat or Test. In this website, beeps represent vibrations. Spoken guidance finishes before the rhythm plays.',pattern:[280]}
];
function openTutorial(){tutorialStep=0;go('tutorial')}
async function playLesson(){
  if(!await RhythmAudio.unlock()){$('haptic-status').textContent='Audio unavailable. Read the written rhythm description.';return}
  settings.sounds=true;updateSoundsButton();save();
  const lesson=lessons[tutorialStep];speak(lesson.text);
  pulse({pattern:lesson.pattern,label:lesson.title},true);
}
function lessonMove(delta){tutorialStep=Math.max(0,Math.min(lessons.length-1,tutorialStep+delta));index=0;render(true)}
let feedbackVersion=0, speechActive=false, pendingRhythm=null, feedbackTimer=null;
function cancelFeedback(){
  feedbackVersion++;speechActive=false;pendingRhythm=null;clearTimeout(feedbackTimer);feedbackTimer=null;hapticProtectedUntil=0;
  RhythmAudio.stop();if('speechSynthesis'in window)speechSynthesis.cancel();
  $('feedback-status').textContent='Ready';
}
function speak(text,force=false){
  cancelFeedback();
  $('transcript').textContent=text;$('live').textContent=audio?'':text;
  if((audio||force)&&'speechSynthesis'in window){
    const version=feedbackVersion;
    const utterance=new SpeechSynthesisUtterance(text);
    utterance.rate=settings.rate;utterance.volume=settings.volume;utterance.lang='en-US';
    speechActive=true;$('feedback-status').textContent=settings.sounds?'Speaking guidance · rhythm follows':'Speaking guidance';
    const finished=()=>{
      if(version!==feedbackVersion)return;
      speechActive=false;$('feedback-status').textContent='Guidance finished';
      const cue=pendingRhythm;pendingRhythm=null;
      if(cue)feedbackTimer=setTimeout(()=>{feedbackTimer=null;if(version===feedbackVersion)playRhythm(cue,true)},250);
      else $('feedback-status').textContent='Ready';
    };
    utterance.onend=finished;utterance.onerror=finished;
    try{speechSynthesis.speak(utterance)}catch{finished()}
  }
}
let hapticProtectedUntil=0;
function playRhythm(cue,protect=false){
  const result=settings.sounds?RhythmAudio.play(cue.pattern,settings.volume,settings.vibration):'Rhythm sounds are off. Tap Enable rhythm sounds to hear them.';
  const duration=cue.pattern.reduce((total,value,i)=>total+(i%2?value:Math.round(value*[0,.65,1,1.4][settings.vibration]||0)),0);
  if(protect)hapticProtectedUntil=Date.now()+duration;
  $('haptic-status').textContent=`${cue.label}. ${result}`;
  if(result==='Playing rhythm sounds.'){
    $('feedback-status').textContent='Playing rhythm · spoken guidance paused';
    const version=feedbackVersion;clearTimeout(feedbackTimer);
    feedbackTimer=setTimeout(()=>{feedbackTimer=null;if(version===feedbackVersion)$('feedback-status').textContent='Ready'},duration+40);
  }
}
function pulse(cue=Haptics.option(page,index,view?.items[index]?.label),protect=false){
  if(speechActive){if(protect)pendingRhythm=cue;return}
  if(!protect&&(Date.now()<hapticProtectedUntil||feedbackTimer))return;
  playRhythm(cue,protect);
}
async function testVibration(){if(!settings.sounds){await toggleSounds();if(!settings.sounds)return}else await RhythmAudio.unlock();pulse({pattern:[70,110,280,110,70],label:'Rhythm test: short, long, short'},true)}
let view;
function getView(){switch(page){
case 'tutorial':{const lesson=lessons[tutorialStep];return {title:`Rhythm guide ${tutorialStep+1}/${lessons.length}`,intro:lesson.text,detail:`<strong>${lesson.title}</strong><p>${lesson.text}</p>`,items:[item('Play example',playLesson),...(tutorialStep<lessons.length-1?[item('Next lesson',()=>lessonMove(1))]:[item('Finish tutorial',menu)]),...(tutorialStep>0?[item('Previous lesson',()=>lessonMove(-1))]:[]),item('Skip to home',menu)]}}
case 'routes':return {title:'Bus routes',intro:'Bus routes. Scroll to explore, then press Enter or Left-click to select.',items:routes.map((r,i)=>item(`Route ${r[0]} — ${r[1]}`,()=>{route=i;go('route')},'bus'))};
case 'route':return {title:'My Transit',detail:`<span class="hero-icon"><img src="assets/bus.png" width="45" height="45" alt="" style="background:#770404;border-radius:12px;padding:5px"></span><strong>${routeName()}</strong><small>Sample arrival · 8 minutes</small>`,intro:`${routeName()}. Your demo bus arrives in eight minutes.`,items:[item('Navigate to stop',()=>go('leave'),'↗'),item('More options',()=>go('more'),'•••')]};
case 'more':return {title:'Route options',items:[item('Navigate to stop',()=>go('leave')),item('Next departures',()=>go('departures')),item('Customize',()=>go('customize')),item('Contact support',()=>go('support'))]};
case 'leave':return {title:'Time to leave',detail:`<span class="hero-icon">↗</span><strong>Navigation started</strong><span>Head to Ross &amp; Bizzell.</span><small>Practice route · Bus in 8 minutes</small>`,intro:`Demo navigation started. Head to Ross and Bizzell for ${routeName()}.`,items:[item('Continue',()=>go('directions')),item('Cancel navigation',menu)]};
case 'directions':return {title:'Directions',detail:'<span class="hero-icon">↱</span><strong>Turn right</strong>In 100 feet.<small>Practice directions</small>',intro:'Practice directions. In 100 feet, turn right.',items:[item('Continue demo',()=>go('reached')),item('Repeat instruction',()=>repeat()),item('Cancel navigation',menu)]};
case 'reached':return {title:'Stop reached',detail:`<span class="hero-icon">✓</span><strong>Ross &amp; Bizzell</strong>Wait here for Route ${routes[route][0]}.`,intro:`You have arrived at Ross and Bizzell in this demo. Wait here for Route ${routes[route][0]}.`,items:[item('Accessibility info',()=>go('access')),item('Repeat instruction',()=>repeat()),item('Cancel navigation',menu)]};
case 'arrival':return {title:'Bus arrived',detail:`<span class="hero-icon">▣</span><strong>Route ${routes[route][0]} arrived</strong>This is your demo bus.`,items:[item('Confirm & board',()=>go('boarded')),item('Cancel navigation',menu)]};
case 'boarded':return {title:'You’re on your way',detail:`<span class="hero-icon">✓</span><strong>Journey complete</strong>${routeName()}<small>Thanks for trying My Transit.</small>`,items:[item('Back to menu',menu)]};
case 'departures':return {title:'Next departures',detail:`<strong>${routeName()}</strong>Sample departures<br>8 min · 23 min · 38 min`,items:[item('Navigate to stop',()=>go('leave')),item('Back to route',back)]};
case 'access':return {title:'Accessibility info',detail:'<strong>Sample bus features</strong>Wheelchair access<br>Audio announcements<br>Kneeling bus<br>Ramp available<small>Verify with transit before travel.</small>',intro:'Sample accessibility information: wheelchair access, audio announcements, kneeling bus, and ramp. Verify with your transit service before travel.',items:[item('Repeat details',()=>repeat()),...(history.at(-1)?.page==='reached'?[item('Cancel navigation',menu)]:[])]};
case 'menu':return {title:'Main menu',items:[item('Access routes',()=>go('routes'),'bus'),item('Customize',()=>go('customize'),'⚙'),item('Contact support',()=>go('support'),'?'),item('Learn rhythm patterns',openTutorial,'?')]};
case 'customize':return {title:'Customize',items:[item('Audio settings',()=>go('audioSettings')),item('Rhythm length',()=>go('vibration')),item('Extra contrast',()=>toggle('contrast')),item(settings.large?'Smaller text':'Larger text',()=>toggle('large'))]};
case 'audioSettings':return {title:'Audio settings',items:[item(audio?'Spoken guidance: on':'Spoken guidance: off',toggleAudio),item(settings.sounds?'Rhythm sounds: on':'Rhythm sounds: off',toggleSounds),item('Voice speed',()=>go('rate')),item('Volume level',()=>go('volume'))]};
case 'rate':case 'volume':case 'vibration':{const title={rate:'Voice speed',volume:'Volume level',vibration:'Rhythm length'}[page];const value=page==='rate'?settings.rate.toFixed(1)+'×':page==='volume'?Math.round(settings.volume*100)+'%':['Off','Shorter','Standard','Longer'][settings.vibration];return {title,detail:`<div class="setting-value">${value}</div><div class="setting-hint">Scroll to adjust. Click an action below to activate.</div>${page==='vibration'?'<p class="setting-hint">Short and long beeps represent the watch’s vibration patterns.</p>':''}`,adjust:true,items:[item(page==='vibration'?'Test rhythm':'Test sound',()=>{if(page==='vibration'){testVibration()}else speak('Your journey. One turn away. This is your audio test.',true)}),item('Save & go back',back)]}}
case 'support':return {title:'Contact support',detail:'<strong>Prototype support</strong>No transit service is connected.<small>For real assistance, use your transit provider’s official contact details.</small>',items:[item('Back to menu',menu),item('Back to routes',home)]};
default:return {title:'Bus routes',items:[]};}}
function render(announce=false,restoreSelection=false){if(announce)sideSelection=null;view=getView();$('side').classList.toggle('selected',sideSelection==='home');$('side-back').classList.toggle('selected',sideSelection==='back');$('side').setAttribute('aria-current',page==='menu'?'page':'false');$('title').textContent=view.title;const backDisabled=!history.length&&page==='menu';$('control-back').disabled=backDisabled;$('side-back').disabled=backDisabled;const content=$('content');content.innerHTML=(view.detail?`<div class="detail">${view.detail}</div>`:'')+view.items.map((o,i)=>`<button tabindex="-1" class="option ${!sideSelection&&i===index?'selected':''}" aria-label="${o.label}" ${!sideSelection&&i===index?'aria-current="true"':''} data-option="${i}">${o.icon==='bus'?'<img src="assets/bus.png" width="28" height="28" alt="">':o.icon?`<span aria-hidden="true">${o.icon}</span>`:''}<span>${o.label}</span>${page==='routes'?'':'<span class="chevron" aria-hidden="true">›</span>'}</button>`).join('');content.querySelectorAll('.option').forEach((el,i)=>{el.addEventListener('click',()=>{sideSelection=null;index=i;select()});el.addEventListener('pointerenter',()=>pulse(Haptics.option(page,i,view.items[i]?.label)));el.addEventListener('focus',()=>pulse(Haptics.option(page,i,view.items[i]?.label)));});if(index===0||view.adjust||(announce&&!restoreSelection)){content.scrollTop=0}else{const el=content.querySelector('.selected');if(el){const top=el.offsetTop-content.offsetTop;content.scrollTop=top+el.offsetHeight<=content.clientHeight?0:Math.max(0,top-45)}}if(announce){speak(`${view.intro||view.title+'.'} ${view.items[index]?.label||view.title}.`);if(page!=='tutorial')pulse(Haptics.entry(page,index,view.items[index]?.label),true);}}
function adjustValue(delta){if(!view.adjust)return;sideSelection=null;$('watch').focus({preventScroll:true});const key=page;if(key==='rate')settings.rate=Math.round(Math.max(.5,Math.min(2,settings.rate+delta*.1))*10)/10;if(key==='volume')settings.volume=Math.round(Math.max(0,Math.min(1,settings.volume+delta*.1))*10)/10;if(key==='vibration')settings.vibration=Math.max(0,Math.min(3,settings.vibration+delta));save();render();speak(`${view.title}. ${$('content').querySelector('.setting-value').textContent}`);if(page==='vibration')pulse({pattern:[70],label:'Rhythm length preview: one short pulse'},true)}
function move(delta){const wasSideSelected=sideSelection;sideSelection=null;$('watch').focus({preventScroll:true});const previousIndex=index;const count=view.items.length;if(!count)return;index=((index+delta)%count+count)%count;if(index===previousIndex&&!wasSideSelected)return;render();speak(`${view.items[index]?.label||view.title}. ${index+1} of ${count}.`);pulse(undefined,true)}
function select(){if(sideSelection==='home'){menu();return}if(sideSelection==='back'){back();return}if(history.length&&!view.adjust&&index===-1){back();return}view.items[index]?.action()}
function repeat(){speak(`${view.intro||view.title+'.'} ${$('content').querySelector('.detail')?.textContent||''} ${view.items[index]?.label||''}.`,true)}
function toggleAudio(){audio=!audio;$('audio').textContent=audio?'Spoken guidance on':'Enable spoken guidance';$('audio').setAttribute('aria-pressed',String(audio));if(audio&&!('speechSynthesis'in window)){audio=false;$('audio').setAttribute('aria-pressed','false');$('audio').textContent='Speech unavailable';speak('Spoken guidance is unavailable in this browser. Written guidance and keyboard controls remain available.');return}if(audio)repeat();else cancelFeedback();if(page==='audioSettings')render()}
function applyPreferences(){document.body.classList.toggle('high-contrast',settings.contrast);document.body.classList.toggle('large-text',settings.large);$('contrast').checked=settings.contrast;$('large').checked=settings.large;$('large-label').textContent=settings.large?'Smaller text':'Larger text'}
function toggle(key){settings[key]=!settings[key];save();applyPreferences();if(page==='customize')render();speak(`${key==='contrast'?'Extra contrast':(settings.large?'Larger text':'Smaller text')} ${settings[key]?'on':'off'}.`)}
$('watch').addEventListener('wheel',e=>{e.preventDefault();const now=Date.now();if(now-lastWheel<180)return;wheelTotal+=e.deltaY;if(Math.abs(wheelTotal)>=30){(view.adjust?adjustValue:move)(Math.sign(wheelTotal));wheelTotal=0;lastWheel=now}},{passive:false});$('watch').addEventListener('contextmenu',e=>{e.preventDefault();back()});
function selectSide(direction){
  sideSelection=direction==='left'?'back':'home';
  const button=$(sideSelection==='back'?'side-back':'side');
  if(button.disabled){sideSelection=null;speak('Back is unavailable. You are on the home screen.');return}
  render();button.focus({preventScroll:true});
  speak(`${sideSelection==='back'?'Back':'Home'} selected. Press Enter or Select to activate.`);
  pulse({pattern:[70],label:`${sideSelection==='back'?'Back':'Home'}: one short pulse`},true);
}
document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey)return;const nativeControl=e.target.closest('button,input,a');if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&e.target.tagName!=='INPUT'){e.preventDefault();selectSide(e.key==='ArrowLeft'?'left':'right')}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(view.adjust)adjustValue(e.key==='ArrowDown'?1:-1);else move(e.key==='ArrowDown'?1:-1)}else if(e.key==='Enter'&&(!nativeControl||['previous','next'].includes(nativeControl.id)||sideSelection&&['side','side-back','select','crown'].includes(nativeControl.id))){e.preventDefault();select()}else if(e.key==='Escape'||e.key==='Backspace'){e.preventDefault();back()}else if(e.target.tagName!=='INPUT'&&e.key.toLowerCase()==='r'){e.preventDefault();repeat()}});
$('previous').onclick=()=>view.adjust?adjustValue(-1):move(-1);$('next').onclick=()=>view.adjust?adjustValue(1):move(1);$('select').onclick=select;$('crown').onclick=select;$('side').onclick=menu;$('side-back').onclick=back;$('control-home').onclick=menu;$('control-back').onclick=back;$('tutorial').onclick=openTutorial;$('menu').onclick=menu;$('home').onclick=e=>{e.preventDefault();menu()};$('audio').onclick=toggleAudio;$('start').onclick=()=>{if(!audio)toggleAudio();$('watch').focus()};$('repeat').onclick=repeat;['contrast','large'].forEach(key=>$(key).onchange=()=>toggle(key));
function clock(){ $('time').textContent=new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}clock();setInterval(clock,30000);applyPreferences();render();

document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelFeedback()});
window.addEventListener('pagehide',cancelFeedback);

async function toggleSounds(){
  if(settings.sounds){settings.sounds=false;pendingRhythm=null;clearTimeout(feedbackTimer);feedbackTimer=null;RhythmAudio.stop();if(!speechActive)$('feedback-status').textContent='Ready';$('haptic-status').textContent='Rhythm sounds are off.'}
  else {settings.sounds=await RhythmAudio.unlock();if(settings.sounds)pulse({pattern:[70,110,280,110,70],label:'Rhythm test: short, long, short'},true);else $('haptic-status').textContent='Audio is unavailable. Try enabling rhythm sounds again.'}
  save();updateSoundsButton();if(page==='audioSettings')render();
}
function updateSoundsButton(){$('sounds').textContent=settings.sounds?'Turn rhythm sounds off':'Enable rhythm sounds';$('sounds').setAttribute('aria-pressed',String(settings.sounds))}
$('sounds').onclick=toggleSounds;
// Always ask for a fresh tap on a new page load to unlock mobile audio.
settings.sounds=false;updateSoundsButton();

// Move the existing buttons rather than duplicate them, preserving audio state
// and activation handlers when the viewport changes.
if(window.matchMedia){
  const mobileAudioLayout=window.matchMedia('(max-width: 700px)');
  function positionAudioControls(){
    const controls=$('mobile-audio-controls');
    if(mobileAudioLayout.matches){controls.append($('audio'),$('sounds'))}
    else{$('audio-home').append($('audio'));$('sounds-home').append($('sounds'))}
  }
  mobileAudioLayout.addEventListener('change',positionAudioControls);
  positionAudioControls();
}
