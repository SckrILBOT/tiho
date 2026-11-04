import { Browser, sleep } from './browser-test.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const output = resolve('.taste-skill/rigid-continuous');
mkdirSync(output, {recursive:true});
process.env.TASTE_SKILL_TMP = resolve('previews/browser-profile');
const browser = await Browser.launch();
const checks = [];
let page;
function check(name, passed, details) {
  checks.push({name,passed,details});
  if (!passed) throw new Error(`${name}: ${JSON.stringify(details)}`);
}
async function center(selector) {
  return page.eval(selector=>{
    const element=document.querySelector(selector);
    element.scrollIntoView({block:'nearest'});
    const box=element.getBoundingClientRect();
    return {x:box.x+box.width/2,y:box.y+box.height/2};
  },selector);
}
async function mouse(type,x,y,buttons=0) {
  await page.send('Input.dispatchMouseEvent',{type,x,y,button:buttons?'left':'none',buttons,...(type==='mousePressed'||type==='mouseReleased'?{button:'left',clickCount:1}:{})});
}
async function click(selector) {
  const point=await center(selector);
  await mouse('mouseMoved',point.x,point.y);
  await mouse('mousePressed',point.x,point.y,1);
  await mouse('mouseReleased',point.x,point.y);
  await sleep(70);
}
async function key(key,code=key,virtual=0) {
  await page.send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:virtual,...(key==='Enter'?{text:'\r',unmodifiedText:'\r'}:{})});
  await page.send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:virtual});
}
async function pull(distance) {
  const point=await center('.hotspot-cord');
  await mouse('mouseMoved',point.x,point.y);
  await mouse('mousePressed',point.x,point.y,1);
  await mouse('mouseMoved',point.x,point.y+distance,1);
  await mouse('mouseReleased',point.x,point.y+distance);
  await sleep(800);
}
async function lightIsOn() {
  const snapshot=await page.eval(()=>({on:!document.querySelector('.scene').classList.contains('is-light-off')}));
  return snapshot.on;
}
async function capture(name) { await page.screenshot({path:resolve(output,`${name}.jpg`),quality:88}); }

try {
  page=await browser.newPage({width:1440,height:900});
  await page.goto('http://127.0.0.1:4173/');
  check('No motion before entry',await page.eval(()=>!document.querySelector('.scene').classList.contains('has-entered') && getComputedStyle(document.querySelector('.rain-track')).animationPlayState==='paused'));
  await capture('desktop-idle');
  await click('.welcome [data-enter]');
  check('Entry activates scene',await page.eval(()=>document.querySelector('.scene').classList.contains('has-entered')));
  const travelBefore=await page.eval(()=>({forest:window.tihoSceneEngine.snapshot().totalTravel,interior:getComputedStyle(document.querySelector('.scene-interior')).transform,rain:getComputedStyle(document.querySelector('.rain-track-near')).transform}));
  await sleep(300);
  const travelAfter=await page.eval(()=>({forest:window.tihoSceneEngine.snapshot().totalTravel,interior:getComputedStyle(document.querySelector('.scene-interior')).transform,rain:getComputedStyle(document.querySelector('.rain-track-near')).transform}));
  check('Forest and rain move; interior remains stationary',travelBefore.forest!==travelAfter.forest && travelBefore.rain!==travelAfter.rain && travelAfter.interior==='none',{travelBefore,travelAfter});
  await pull(28);
  check('Pull toggles light exactly once',(await lightIsOn())===false);
  check('Cord returns to rest',await page.eval(()=>Math.abs(Number(document.querySelector('.cord-line').getAttribute('y2'))-409)<.01));
  check('Wall and table lighting turn off',await page.eval(()=>Number(getComputedStyle(document.querySelector('.scene-warm-light')).opacity)===0));
  await capture('desktop-light-off');
  const scale=await page.eval(()=>document.querySelector('.scene-art').getScreenCTM().d);
  await pull(Math.max(6,22*scale*.65));
  check('Incomplete pull does not toggle light',(await lightIsOn())===false);
  await page.eval(()=>{
    window.__keyEvents=[];
    for(const name of ['keydown','keyup','click']) document.addEventListener(name,event=>window.__keyEvents.push({type:event.type,key:event.key,action:event.target.dataset.action}),{capture:true});
    document.querySelector('.hotspot-cord').focus();
  });
  await key('Enter','Enter',13);
  await sleep(750);
  check('Keyboard operates cord',await lightIsOn(),await page.eval(()=>({events:window.__keyEvents,focus:document.activeElement.outerHTML,scene:document.querySelector('.scene').className,announced:document.querySelector('#scene-announcement').textContent})));
  await click('.scene-control[data-action="lamp"]');
  check('Visible light button matches scene',(await lightIsOn())===false);
  await click('.scene-control[data-action="lamp"]');
  const mainGlassPosition=()=>page.eval(()=>{
    const glass=document.querySelector('.main-window > path').getBoundingClientRect();
    return {x:glass.x+scrollX,y:glass.y+scrollY,height:glass.height};
  });
  const mainGlassBefore=await mainGlassPosition();
  const hingeClosed=await page.eval(()=>window.tihoSceneEngine.snapshot().hinges);
  await click('.hotspot-window');
  await sleep(750);
  check('Upper transom opens in projective perspective',await page.eval(()=>{
    const windowState=window.tihoSceneEngine.snapshot();
    return document.querySelector('.scene').classList.contains('is-window-open')
      && windowState.assembly==='shared-3d-frame-rebate-sash-glass' && windowState.angle===42;
  }));
  const hingeOpen=await page.eval(()=>window.tihoSceneEngine.snapshot().hinges);
  check('Both hinge corners stay fixed',hingeClosed.every((p,i)=>Math.hypot(p[0]-hingeOpen[i][0],p[1]-hingeOpen[i][1])<.01),{hingeClosed,hingeOpen});
  const mainGlassAfter=await mainGlassPosition();
  check('Main pane remains fixed when transom opens',Math.abs(mainGlassBefore.x-mainGlassAfter.x)<.01 && Math.abs(mainGlassBefore.y-mainGlassAfter.y)<.01 && Math.abs(mainGlassBefore.height-mainGlassAfter.height)<.01,{mainGlassBefore,mainGlassAfter});
  check('Rain remains clipped to stationary main glass',await page.eval(()=>document.querySelector('.scene-rain').getAttribute('clip-path')==='url(#rain-glass)' && document.querySelector('.main-window').parentElement.getAttribute('clip-path')==='url(#rain-aperture)'));
  check('Continuous painted sprites replace crossfading images',await page.eval(()=>!document.querySelector('.landscape-pass') && window.tihoSceneEngine.snapshot().loaded && window.tihoSceneEngine.snapshot().speeds[2]>=400));
  await capture('desktop-window-open');
  await click('.scene-control[data-action="window"]');
  await sleep(750);
  check('Window closes and toolbar state follows',await page.eval(()=>!document.querySelector('.scene').classList.contains('is-window-open') && document.querySelector('.scene-control[data-action="window"]').getAttribute('aria-pressed')==='false'));
  await click('.scene-control[data-action="motion"]');
  const pausedBefore=await page.eval(()=>window.tihoSceneEngine.snapshot().totalTravel);
  await sleep(200);
  check('Manual pause freezes landscape',pausedBefore===await page.eval(()=>window.tihoSceneEngine.snapshot().totalTravel));
  await click('.scene-control[data-action="motion"]');
  await click('.scene-control[data-action="notebook"]');
  check('Notebook opens and focuses text field',await page.eval(()=>document.querySelector('#notebook-dialog').open && document.activeElement.id==='task-text'));
  await capture('desktop-notebook');
  await page.send('Input.insertText',{text:'Дописываю главу'});
  await click('.notebook-form [type="submit"]');
  check('Save closes notebook and restores trigger focus',await page.eval(()=>!document.querySelector('#notebook-dialog').open && document.activeElement.matches('.scene-control[data-action="notebook"]')));
  await click('.scene-control[data-action="notebook"]');
  check('Entry is retained within current page session',await page.eval(()=>document.querySelector('#task-text').value==='Дописываю главу'));
  await key('Tab','Tab',9);
  await key('Tab','Tab',9);
  check('Modal keyboard focus remains inside notebook',await page.eval(()=>document.querySelector('#notebook-dialog').contains(document.activeElement)));
  await key('Escape','Escape',27);
  check('Escape closes notebook and restores focus',await page.eval(()=>!document.querySelector('#notebook-dialog').open && document.activeElement.matches('.scene-control[data-action="notebook"]')));
  await page.eval(()=>window.scrollTo(0,document.body.scrollHeight));
  await sleep(150);
  check('Scene pauses when it leaves viewport',await page.eval(()=>document.querySelector('.scene').classList.contains('motion-paused')));

  await page.setViewport({width:390,height:844,mobile:true});
  await page.goto('http://127.0.0.1:4173/');
  await click('.welcome [data-enter]');
  await sleep(360);
  const targets=await page.eval(()=>[...document.querySelectorAll('.scene-hotspot,.scene-control')].map(button=>{
    const box=button.getBoundingClientRect();return {action:button.dataset.action,width:box.width,height:box.height};
  }));
  check('All scene controls and hotspots are at least 44px on mobile',targets.every(target=>target.width>=43.99&&target.height>=43.99),targets);
  let touch=await center('.hotspot-cord');
  await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x,y:touch.y,id:1}]});
  await page.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touch.x,y:touch.y+24,id:1}]});
  await page.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await sleep(850);
  check('Touch pull toggles light once',(await lightIsOn())===false);
  touch=await center('.hotspot-cord');
  await page.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x,y:touch.y,id:2}]});
  await page.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touch.x,y:touch.y+30,id:2}]});
  await page.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  await sleep(800);
  check('Cancelled touch pull does not toggle',(await lightIsOn())===false);
  await click('.scene-control[data-action="lamp"]');
  await click('.scene-control[data-action="window"]');
  await sleep(750);
  await capture('mobile-window-open');
  await click('.hotspot-notebook');
  await capture('mobile-notebook');
  await page.setViewport({width:390,height:430,mobile:true});
  await sleep(150);
  const keyboardLayout=await page.eval(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth,dialog:document.querySelector('#notebook-dialog').getBoundingClientRect().toJSON()}));
  check('Notebook fits shortened viewport',keyboardLayout.dialog.top>=0 && keyboardLayout.dialog.bottom<=431 && keyboardLayout.scrollWidth<=keyboardLayout.innerWidth,keyboardLayout);
  await capture('mobile-short-notebook');
  await key('Escape','Escape',27);
  for(const width of [360,768,1440]) {
    await page.setViewport({width,height:width===768?1024:900});
    await page.goto('http://127.0.0.1:4173/',{settleMs:300});
    check(`No horizontal overflow at ${width}px`,await page.eval(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.setViewport({width:390,height:844,mobile:true});
  await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await page.goto('http://127.0.0.1:4173/');
  await click('.welcome [data-enter]');
  check('Reduced motion removes background animations',await page.eval(()=>getComputedStyle(document.querySelector('.rain-track')).animationName==='none' && getComputedStyle(document.querySelector('.continuous-forest')).visibility==='hidden' && !window.tihoSceneEngine.snapshot().running && document.querySelector('[data-action="motion"]').disabled));
  const beforeReducedToggle=await page.eval(()=>({lightOff:document.querySelector('.scene').classList.contains('is-light-off'),windowOpen:window.tihoSceneEngine.snapshot().angle===42}));
  await click('.scene-control[data-action="lamp"]');
  await click('.scene-control[data-action="window"]');
  check('Light and window still work with reduced motion',await page.eval(previous=>document.querySelector('.scene').classList.contains('is-light-off')!==previous.lightOff && (window.tihoSceneEngine.snapshot().angle===42)!==previous.windowOpen,beforeReducedToggle));
  await capture('mobile-reduced-motion');
  await page.goto(pathToFileURL(resolve('public/index.html')).href);
  await click('[data-entry-close]');
  await click('.scene-control[data-action="notebook"]');
  check('Interactions work when opened as a local file',await page.eval(()=>document.querySelector('#notebook-dialog').open));
  check('No uncaught JavaScript errors',page.consoleErrors.length===0,page.consoleErrors);
} catch(error) {
  console.error(error.stack);
  process.exitCode=1;
} finally {
  writeFileSync(resolve(output,'checks.json'),JSON.stringify({scope:'Object interactions and native-browser touch emulation. No physical device/audio/timer validation.',checks},null,2));
  await browser.close();
}
console.log(checks.map(item=>`${item.passed?'PASS':'FAIL'} ${item.name}`).join('\n'));
