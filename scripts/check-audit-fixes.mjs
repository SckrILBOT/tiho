import {Browser,sleep,localSiteUrl} from './browser-test.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
process.env.TASTE_SKILL_TMP=resolve('previews/browser-profile');
const out=resolve('.taste-skill/audit-fixes');mkdirSync(out,{recursive:true});
const browser=await Browser.launch();const checks=[];
function check(name,passed,details){checks.push({name,passed,details});if(!passed)throw new Error(name+': '+JSON.stringify(details));}
async function click(page,selector){
 const point=await page.eval(selector=>{const e=document.querySelector(selector);const b=e.getBoundingClientRect();if(b.top<0||b.bottom>innerHeight)e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};},selector);
 await page.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
}
async function tab(page,shift=false){await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:shift?8:0});await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:shift?8:0});await sleep(80);}
async function until(page,fn){for(let i=0;i<100;i++){if(await page.eval(fn))return;await sleep(100);}throw new Error('State timeout');}
try{
 for(let attempt=1;attempt<=4;attempt++){
  const p=await browser.newPage({width:1440,height:900});await p.goto('http://127.0.0.1:4173/');
  await tab(p);check(`Tab reaches close immediately ${attempt}`,await p.eval(()=>document.activeElement.hasAttribute('data-entry-close')));
  await tab(p,true);check(`Shift+Tab wraps to entry ${attempt}`,await p.eval(()=>document.activeElement.hasAttribute('data-start-audio')));
  await click(p,'#entry-dialog [data-enter]');await until(p,()=>tihoAudio.snapshot().ready);await sleep(1300);
  check(`Explicit entry still plays ${attempt}`,await p.eval(()=>tihoAudio.snapshot().wanted&&tihoAudio.snapshot().rms>.00001));
  await click(p,'[data-audio-compact]');await sleep(300);
  await click(p,'.site-footer [data-enter]');await sleep(350);
  check(`Return preserves pause ${attempt}`,await p.eval(()=>!tihoAudio.snapshot().wanted&&tihoAudio.snapshot().contextState==='suspended'));
  await click(p,'.settle-in [data-enter]');await sleep(250);
  check(`Inspect link preserves pause ${attempt}`,await p.eval(()=>!tihoAudio.snapshot().wanted));
  check(`No script exceptions ${attempt}`,p.consoleErrors.length===0,p.consoleErrors);await p.close();
 }
 for(const [width,height] of [[1440,900],[390,844],[844,320],[844,280]]){
  const p=await browser.newPage({width,height,mobile:width<600});await p.goto('http://127.0.0.1:4173/');
  await p.send('Network.enable');await p.send('Network.setBlockedURLs',{urls:['*audio-data.js*']});
  await click(p,'#entry-dialog [data-enter]');await until(p,()=>tihoAudio.snapshot().failed);await sleep(450);await p.eval(()=>scrollTo(0,0));
  const state=await p.eval(()=>{
   const e=document.querySelector('[data-audio-feedback]'),b=e.getBoundingClientRect(),button=document.querySelector('[data-audio-compact]'),r=button.getBoundingClientRect();
   return {viewport:[innerWidth,innerHeight],sceneHeight:document.querySelector('.scene-stage').clientHeight,feedback:{hidden:e.hidden,text:e.textContent,x:b.x,y:b.y,right:b.right,bottom:b.bottom},button:{top:r.top,bottom:r.bottom,text:button.innerText},error:tihoAudio.snapshot().lastError};
  });
  check(`Error message and retry visible ${width}x${height}`,!state.feedback.hidden&&state.feedback.y>=0&&state.feedback.bottom<=height&&state.feedback.x>=0&&state.feedback.right<=width&&state.button.text.includes('Повторить'),state);
  check(`Full button fits short screen ${width}x${height}`,state.sceneHeight===height&&state.button.top>=0&&state.button.bottom<=height,state);
  check(`Load failure preserves diagnostics ${width}`,state.error?.phase==='load'&&Boolean(state.error.message),state.error);
  await p.screenshot({path:resolve(out,`${width}-${height}-error.jpg`),quality:90});
  await p.send('Network.setBlockedURLs',{urls:[]});await click(p,'[data-audio-compact]');await until(p,()=>tihoAudio.snapshot().ready);await sleep(1300);
  check(`Retry plays after error ${width}`,await p.eval(()=>!tihoAudio.snapshot().failed&&tihoAudio.snapshot().lastError===null&&tihoAudio.snapshot().rms>.00001));await p.close();
 }
 const p=await browser.newPage({width:320,height:640,mobile:true});await p.goto(localSiteUrl);
 await click(p,'[data-entry-close]');await sleep(450);await p.eval(()=>document.querySelector('#scene-caption').scrollIntoView());
 const volume=await p.eval(()=>{const e=document.querySelector('[data-volume-value]'),b=e.getBoundingClientRect();return {height:b.height,lineHeight:parseFloat(getComputedStyle(e).lineHeight),whiteSpace:getComputedStyle(e).whiteSpace,overflow:document.documentElement.scrollWidth>innerWidth};});
 check('Volume value stays on one line at 320',volume.height<=volume.lineHeight+1&&volume.whiteSpace==='nowrap'&&!volume.overflow,volume);
 await p.screenshot({path:resolve(out,'320-controls.jpg'),quality:90});
 await click(p,'.site-footer [data-enter]');check('Navigation before sound stays silent',await p.eval(()=>tihoAudio.snapshot().contextState==='uncreated'));
 await click(p,'[data-audio-compact]');await until(p,()=>tihoAudio.snapshot().ready);await sleep(1300);check('Local-file playback still works',await p.eval(()=>tihoAudio.snapshot().rms>.00001));await p.close();
 const bad=await browser.newPage({width:1440,height:900});await bad.goto('http://127.0.0.1:4173/');await bad.eval(()=>{window.tihoAudioData={train:btoa('Invalid audio bytes')};});
 await click(bad,'#entry-dialog [data-enter]');await until(bad,()=>tihoAudio.snapshot().failed);
 check('Decode failure identifies phase and track',await bad.eval(()=>tihoAudio.snapshot().lastError.phase==='decode'&&tihoAudio.snapshot().lastError.track==='train'));
 await until(bad,()=>!document.querySelector('#entry-dialog').open);
 await bad.eval(()=>{window.tihoAudioData={rain:'%%%'};});
 await click(bad,'[data-audio-compact]');await until(bad,()=>tihoAudio.snapshot().failed);
 const malformed=await bad.eval(()=>tihoAudio.snapshot().lastError);
 check('Malformed audio encoding identifies phase and track',malformed?.phase==='decode'&&malformed.track==='rain',malformed);await bad.close();
}catch(error){console.error(error);process.exitCode=1;}
finally{writeFileSync(resolve(out,'checks.json'),JSON.stringify(checks,null,2));await browser.close();}
console.log(checks.map(c=>`${c.passed?'PASS':'FAIL'} ${c.name}`).join('\n'));
