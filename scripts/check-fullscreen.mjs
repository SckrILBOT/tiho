import { Browser,sleep, localSiteUrl } from './browser-test.mjs';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
process.env.TASTE_SKILL_TMP=resolve('previews/browser-profile');
const out=resolve('.taste-skill/fullscreen');mkdirSync(out,{recursive:true});
const browser=await Browser.launch();const checks=[];
function check(name,passed,details){checks.push({name,passed,details});if(!passed)throw new Error(name+': '+JSON.stringify(details));}
async function click(page,selector){
  const p=await page.eval(selector=>{const e=document.querySelector(selector);e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};},selector);
  await page.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});
  await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});
}
async function until(page,fn){for(let i=0;i<100;i++){if(await page.eval(fn))return;await sleep(100);}throw new Error('State timeout');}
try{
 const page=await browser.newPage({width:1440,height:900});
 for(const [width,height] of [[1440,900],[1920,1080],[768,1024],[390,844],[360,740],[1440,700]]){
  await page.setViewport({width,height,mobile:width<600});
  await page.goto(`http://127.0.0.1:4173/?viewport=${width}x${height}#compartment`);
  let s=await page.eval(()=>({modal:document.querySelector('#entry-dialog').open,context:tihoAudio.snapshot().contextState,w:document.querySelector('.scene-stage').getBoundingClientRect().width,h:document.querySelector('.scene-stage').getBoundingClientRect().height,caption:document.querySelector('#scene-caption').getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth,active:document.activeElement.matches('[data-enter]'),activeMarkup:document.activeElement.outerHTML.slice(0,180)}));
  check(`Fullscreen initial scene ${width}x${height}`,s.modal&&s.active&&s.context==='uncreated'&&Math.abs(s.w-width)<2&&Math.abs(s.h-height)<2&&s.caption>=height-1&&!s.overflow,s);
  await page.screenshot({path:resolve(out,`${width}-${height}-welcome.jpg`),quality:88});
  await click(page,'#entry-dialog [data-enter]');
  await until(page,()=>!document.querySelector('#entry-dialog').open&&tihoAudio.snapshot().ready);await sleep(1300);
  check(`Entry closes modal and plays sound ${width}`,await page.eval(()=>document.activeElement.id==='compartment'&&tihoAudio.snapshot().rms>.00001&&!document.body.classList.contains('has-entry-open')));
  await page.eval(()=>scrollTo(0,0));
  await page.screenshot({path:resolve(out,`${width}-${height}-entered.jpg`),quality:88});
  const targets=await page.eval(()=>[...document.querySelectorAll('.scene-hotspot')].map(e=>{const b=e.getBoundingClientRect();return {action:e.dataset.action,hidden:e.hidden,x:b.x,y:b.y,w:b.width,h:b.height};}));
  check(`Interactive targets fit viewport ${width}`,targets.every(b=>!b.hidden&&b.x>=-.5&&b.y>=-.5&&b.x+b.w<=width+.5&&b.y+b.h<=height+.5),targets);
  await click(page,'[data-audio-compact]');await sleep(350);
  check(`Scene sound button pauses ${width}`,await page.eval(()=>!tihoAudio.snapshot().wanted&&document.querySelector('[data-audio-toggle]').getAttribute('aria-pressed')==='false'));
  const wasOpen=await page.eval(()=>tihoAudio.snapshot().opened);
  await click(page,'.hotspot-window');await sleep(700);
  check(`Window remains interactive ${width}`,await page.eval(open=>tihoSceneEngine.snapshot().angle===(open?0:42)&&tihoAudio.snapshot().opened!==open,wasOpen));
  const wasOff=await page.eval(()=>document.querySelector('#compartment').classList.contains('is-light-off'));
  await click(page,'.hotspot-lamp');
  check(`Lamp remains interactive ${width}`,await page.eval(off=>document.querySelector('#compartment').classList.contains('is-light-off')!==off,wasOff));
  await click(page,'.hotspot-notebook');
  check(`Notebook opens ${width}`,await page.eval(()=>document.querySelector('#notebook-dialog').open));
  await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await click(page,'.scene-down');await sleep(250);
  await page.screenshot({path:resolve(out,`${width}-${height}-controls.jpg`),quality:88});
  check(`Scroll reveals controls ${width}`,await page.eval(()=>document.querySelector('#scene-caption').getBoundingClientRect().top<100&&document.documentElement.scrollWidth<=innerWidth));
 }
 await page.goto((localSiteUrl+'#compartment'));
 await click(page,'[data-entry-close]');await sleep(450);
 check('Dismiss without sound stays silent',await page.eval(()=>!document.querySelector('#entry-dialog').open&&tihoAudio.snapshot().contextState==='uncreated'&&document.activeElement.id==='compartment'));
 await click(page,'[data-audio-compact]');await until(page,()=>tihoAudio.snapshot().ready);await sleep(1300);
 check('Local file sound button starts playback',await page.eval(()=>tihoAudio.snapshot().rms>.00001));
 await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await page.goto('http://127.0.0.1:4173/');
 await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 check('Escape closes welcome silently with reduced motion',await page.eval(()=>!document.querySelector('#entry-dialog').open&&tihoAudio.snapshot().contextState==='uncreated'&&!tihoSceneEngine.snapshot().running));
 check('No uncaught script errors',page.consoleErrors.length===0,page.consoleErrors);
}catch(error){console.error(error);process.exitCode=1;}
finally{writeFileSync(resolve(out,'checks.json'),JSON.stringify(checks,null,2));await browser.close();}
console.log(checks.map(c=>`${c.passed?'PASS':'FAIL'} ${c.name}`).join('\n'));
