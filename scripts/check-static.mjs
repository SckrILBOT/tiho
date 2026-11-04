import { Browser } from './browser-test.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const output = resolve('.taste-skill/static-checks');
mkdirSync(output, {recursive:true});
process.env.TASTE_SKILL_TMP = resolve('previews/browser-profile');
const browser = await Browser.launch();
const checks = [];
function record(name, passed, details) {
  checks.push({name,passed,details});
  if (!passed) throw new Error(`${name}: ${JSON.stringify(details)}`);
}
try {
  const page = await browser.newPage({width:390,height:844});
  const failures = [];
  await page.send('Network.enable');
  browser.on(page.sessionId,'Network.responseReceived',({response})=>{
    if(response.status>=400) failures.push({url:response.url,status:response.status});
  });
  await page.goto('http://127.0.0.1:4173/');
  await page.eval(()=>document.fonts.ready.then(()=>true));
  const structure = await page.eval(()=>({
    invalidAnchors: [...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash),
    smallTargets: [...document.querySelectorAll('a')].filter(a=>{
      const box=a.getBoundingClientRect();
      return box.width>0 && (box.height<44 || box.width<44);
    }).map(a=>({text:a.textContent.trim(),height:a.getBoundingClientRect().height})),
    fonts:[document.fonts.check('400 18px "Golos Text"','Тихо'),document.fonts.check('400 96px Literata','Тихо')]
  }));
  record('All local anchors resolve',structure.invalidAnchors.length===0,structure.invalidAnchors);
  record('Visible links have 44px targets',structure.smallTargets.length===0,structure.smallTargets);
  record('Both Cyrillic fonts load',structure.fonts.every(Boolean),structure.fonts);
  await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  const skip = await page.eval(()=>({isSkip:document.activeElement.classList.contains('skip-link'),top:document.activeElement.getBoundingClientRect().top}));
  record('Keyboard skip link is first and visible',skip.isSkip && skip.top>=0,skip);
  await page.eval(()=>document.querySelector('[data-enter]').focus());
  await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  const entry=await page.eval(()=>({hash:location.hash,focus:document.activeElement.id,top:document.querySelector('#compartment').getBoundingClientRect().top}));
  record('Keyboard entry reaches and focuses scene',entry.hash==='#compartment' && entry.focus==='compartment' && entry.top>=-1 && entry.top<80,entry);
  for(const [width,height] of [[360,800],[1024,768],[1440,700]]) {
    await page.setViewport({width,height});
    await page.goto('http://127.0.0.1:4173/',{settleMs:300});
    const layout=await page.eval(()=>({overflow:document.documentElement.scrollWidth-innerWidth,viewBox:document.querySelector('.scene-art').getAttribute('viewBox')}));
    record(`No horizontal overflow at ${width}x${height}`,layout.overflow<=1,layout);
    await page.screenshot({path:resolve(output,`viewport-${width}x${height}.jpg`),quality:85,fullPage:true});
  }
  await page.setViewport({width:390,height:844});
  await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await page.goto('http://127.0.0.1:4173/',{settleMs:300});
  const reduced=await page.eval(()=>({visible:getComputedStyle(document.querySelector('.welcome-copy')).opacity==='1',animations:document.getAnimations().length}));
  record('Reduced motion keeps content visible',reduced.visible && reduced.animations===0,reduced);
  await page.send('Emulation.setScriptExecutionDisabled',{value:true});
  await page.goto('http://127.0.0.1:4173/',{settleMs:300});
  await page.screenshot({path:resolve(output,'mobile-no-js.jpg'),quality:85,fullPage:true});
  await page.send('Emulation.setScriptExecutionDisabled',{value:false});
  const noJs=await page.eval(()=>({title:document.querySelector('h1').textContent,overflow:document.documentElement.scrollWidth-innerWidth,content:!!document.querySelector('.scene-art')}));
  record('Content and scene exist without JavaScript',noJs.title==='Тихо' && noJs.overflow<=1 && noJs.content,noJs);
  await page.goto(pathToFileURL(resolve('public/index.html')).href,{settleMs:300});
  await page.eval(()=>Promise.all([...document.images].map(image=>{
    image.loading='eager';
    return image.decode().then(()=>true,()=>false);
  })));
  const filePage=await page.eval(()=>({title:document.title,stylesheet:document.styleSheets.length,background:getComputedStyle(document.body).backgroundColor,errors:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src)}));
  record('Direct file opens with stylesheet and images',filePage.stylesheet>0 && filePage.background==='rgb(16, 25, 35)' && filePage.errors.length===0,filePage);
  record('No HTTP resource failures',failures.length===0,failures);
  record('No uncaught JavaScript errors',page.consoleErrors.length===0,page.consoleErrors);
} catch(error) {
  console.error(error.message);
  process.exitCode=1;
} finally {
  writeFileSync(resolve(output,'checks.json'),JSON.stringify({scope:'Static page only. No audio, timer, gesture or physical device tests.',checks},null,2));
  await browser.close();
}
console.log(checks.map(c=>`${c.passed?'PASS':'FAIL'} ${c.name}`).join('\n'));
