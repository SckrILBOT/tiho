import { Browser, sleep } from './browser-test.mjs';
import { resolve } from 'node:path';
import { mkdirSync,writeFileSync } from 'node:fs';
const output=resolve('.taste-skill/motion-sequence');
mkdirSync(output,{recursive:true});
process.env.TASTE_SKILL_TMP=resolve('previews/browser-profile');
const browser=await Browser.launch();
const frames=[];
try {
  const page=await browser.newPage({width:1440,height:900});
  await page.goto('http://127.0.0.1:4173/');
  await page.eval(()=>document.querySelector('.welcome [data-enter]').click());
  await sleep(500);
  const closed=await page.eval(()=>window.tihoSceneEngine.snapshot());
  await page.eval(()=>document.querySelector('.scene-control[data-action="window"]').click());
  for(let i=0;i<5;i++) {
    await sleep(130);
    const snapshot=await page.eval(()=>window.tihoSceneEngine.snapshot());
    await page.screenshot({path:resolve(output,`sash-${i}.jpg`),quality:86});
    frames.push({type:'sash',...snapshot});
  }
  await page.eval(()=>document.querySelector('.scene-control[data-action="window"]').click());
  await sleep(700);
  for(let i=0;i<5;i++) {
    await sleep(1800);
    const snapshot=await page.eval(()=>window.tihoSceneEngine.snapshot());
    await page.screenshot({path:resolve(output,`forest-${i}.jpg`),quality:86});
    frames.push({type:'forest',...snapshot});
  }
  const stream=frames.filter(frame=>frame.type==='forest');
  const continuous=stream.every((frame,i)=>!i||frame.totalTravel>stream[i-1].totalTravel);
  const freshTrees=stream.at(-1).spawned>stream[0].spawned;
  const open=frames.filter(frame=>frame.type==='sash').at(-1);
  const fixedHinges=closed.corners.slice(2).every((p,i)=>Math.hypot(p[0]-open.corners[i+2][0],p[1]-open.corners[i+2][1])<.001);
  const panelHeight=Math.hypot(open.corners[1][0]-open.corners[2][0],open.corners[1][1]-open.corners[2][1]);
  const checks={continuous,freshTrees,fixedHinges,panelHeight,angle:open.angle,errors:page.consoleErrors};
  writeFileSync(resolve(output,'sequence.json'),JSON.stringify({checks,frames},null,2));
  if(!continuous||!freshTrees||!fixedHinges||panelHeight<45||page.consoleErrors.length) throw new Error(JSON.stringify(checks));
  console.log(JSON.stringify(checks));
} finally {await browser.close();}
