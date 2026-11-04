import { Browser, sleep } from './browser-test.mjs';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
process.env.TASTE_SKILL_TMP=resolve('previews/browser-profile');
const out=resolve('.taste-skill/curtain-correction');mkdirSync(out,{recursive:true});
const browser=await Browser.launch();
try {
  const page=await browser.newPage({width:1440,height:900});
  await page.goto('http://127.0.0.1:4173/');
  for(const state of ['closed','open']) {
    if(state==='open') {
      await page.eval(()=>document.querySelector('.scene-control[data-action="window"]').click());
      await sleep(750);
    }
    await page.screenshot({path:resolve(out,`${state}.jpg`),quality:95,clip:{x:576,y:74,width:670,height:230,scale:1.5}});
  }
  await page.eval(()=>window.tihoSceneEngine.setRunning(false));
  const order=await page.eval(()=>{
    const unit=document.querySelector('.transom-space'),curtains=document.querySelector('.scene-curtains');
    return Boolean(unit.compareDocumentPosition(curtains)&Node.DOCUMENT_POSITION_FOLLOWING);
  });
  if(!order) throw new Error('Curtains must be painted after the window unit');
  console.log('Curtains cover window assembly; closed and open close-ups saved.');
} finally {await browser.close();}
