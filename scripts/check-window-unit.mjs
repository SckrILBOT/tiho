import { Browser, sleep, localSiteUrl } from './browser-test.mjs';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const output=resolve('.taste-skill/window-assembly');
mkdirSync(output,{recursive:true});
process.env.TASTE_SKILL_TMP=resolve('previews/browser-profile');
const browser=await Browser.launch();
const checks=[],frames=[];
function check(name,passed,details) {
  checks.push({name,passed,details});
  if(!passed) throw new Error(`${name}: ${JSON.stringify(details)}`);
}
try {
  const page=await browser.newPage({width:1440,height:900});
  await page.goto('http://127.0.0.1:4173/');
  const closed=await page.eval(()=>window.tihoSceneEngine.snapshot());
  check('Single volumetric assembly replaces the independent sprite',closed.assembly==='shared-3d-frame-rebate-sash-glass' && closed.faceCount>100,closed.faceCount);
  check('Sash fits within common frame dimensions',closed.sashBounds.left>closed.frameBounds.left && closed.sashBounds.right<closed.frameBounds.right && closed.clearance<=1 && closed.sealOverlap>0,{clearance:closed.clearance,sealOverlap:closed.sealOverlap});
  check('All four closed seams are opaque seals',closed.sealSamples.every(sample=>sample.rgba[3]>240),closed.sealSamples);
  check('Background cutout shares the model contour',await page.eval(()=>document.querySelector('#unit-mount-mask path').getAttribute('d')===window.TihoWindowUnit.mountingPath));
  await page.screenshot({path:resolve(output,'desktop-closed.jpg'),quality:90});
  const mainBefore=await page.eval(()=>document.querySelector('.main-window > path').getBoundingClientRect().toJSON());
  await page.eval(()=>document.querySelector('.scene-control[data-action="window"]').click());
  for(let i=0;i<5;i++) {
    await sleep(125);
    const state=await page.eval(()=>window.tihoSceneEngine.snapshot());
    frames.push(state);
    await page.screenshot({path:resolve(output,`opening-${i}.jpg`),quality:88});
  }
  const open=frames.at(-1);
  check('All intermediate frames keep the two hinges fixed',frames.every(state=>state.hinges.every((p,i)=>Math.hypot(p[0]-closed.hinges[i][0],p[1]-closed.hinges[i][1])<.001)));
  check('Opened sash retains a visible glass plane',open.angle===42 && Math.hypot(open.corners[0][0]-open.corners[3][0],open.corners[0][1]-open.corners[3][1])>45,open.corners);
  const mainAfter=await page.eval(()=>document.querySelector('.main-window > path').getBoundingClientRect().toJSON());
  check('Main window remains stationary',Math.abs(mainBefore.x-mainAfter.x)<.01 && Math.abs(mainBefore.y-mainAfter.y)<.01 && Math.abs(mainBefore.height-mainAfter.height)<.01);
  await page.eval(()=>document.querySelector('.scene-control[data-action="window"]').click());
  await sleep(700);
  const reclosed=await page.eval(()=>window.tihoSceneEngine.snapshot());
  check('Closing seats sash back into all four seals',reclosed.angle===0 && reclosed.sealSamples.every(sample=>sample.rgba[3]>240),reclosed.sealSamples);
  await page.screenshot({path:resolve(output,'desktop-reclosed.jpg'),quality:90});
  const before=await page.eval(()=>window.tihoSceneEngine.snapshot().totalTravel);
  await sleep(200);
  check('Continuous forest is preserved',await page.eval(()=>window.tihoSceneEngine.snapshot().totalTravel)>before);
  for(const width of [768,390]) {
    await page.setViewport({width,height:width===768?1024:844});
    await page.goto('http://127.0.0.1:4173/');
    await page.screenshot({path:resolve(output,`${width}-closed.jpg`),quality:88,fullPage:true});
    await page.eval(()=>{
      document.querySelector('.scene-control[data-action="window"]').click();
      document.querySelector('#compartment').scrollIntoView({block:'start'});
    });
    await sleep(700);
    await page.screenshot({path:resolve(output,`${width}-open.jpg`),quality:88});
    check(`No page overflow at ${width}`,await page.eval(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await page.goto('http://127.0.0.1:4173/');
  await page.eval(()=>document.querySelector('.scene-control[data-action="window"]').click());
  check('Reduced motion snaps to correct assembly state',await page.eval(()=>window.tihoSceneEngine.snapshot().angle===42 && !window.tihoSceneEngine.snapshot().running));
  check('No uncaught script errors',page.consoleErrors.length===0,page.consoleErrors);
  await page.goto((localSiteUrl+'#compartment'));
  await page.eval(()=>document.querySelector('.scene-control[data-action="window"]').click());
  await sleep(700);
  check('Direct local file opens the shared assembly',await page.eval(()=>window.tihoSceneEngine.snapshot().angle===42));
} catch(error) {
  console.error(error.message);process.exitCode=1;
} finally {
  writeFileSync(resolve(output,'checks.json'),JSON.stringify({checks,frames},null,2));
  await browser.close();
}
console.log(checks.map(check=>`${check.passed?'PASS':'FAIL'} ${check.name}`).join('\n'));
