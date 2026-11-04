import { Browser } from './browser-test.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

const output = resolve('previews');
mkdirSync(resolve('previews/browser-profile'), { recursive: true });
process.env.TASTE_SKILL_TMP = resolve('previews/browser-profile');
const browser = await Browser.launch();
const report = [];
try {
  const page = await browser.newPage({width:1672,height:941});
  await page.goto(pathToFileURL(resolve('previews/scene-assembled.svg')).href, {settleMs:400});
  await page.screenshot({path:resolve(output,'scene-assembled.png'),format:'png'});
  for (const [name,width,height,viewBox] of [
    ['desktop-scene',864,700,'475 0 1161 941'],
    ['tablet-scene',768,624,'475 0 1158 941'],
    ['mobile-scene',390,330,'470 0 1112 941'],
    ['mobile360-scene',360,305,'470 0 1110 941']
  ]) {
    await page.setViewport({width,height});
    await page.eval(box=>document.documentElement.setAttribute('viewBox',box),viewBox);
    await page.screenshot({path:resolve(output,`${name}.png`),format:'png'});
    report.push({name,width,height,viewBox});
  }
  await page.setViewport({width:1672,height:941});
  await page.goto(pathToFileURL(resolve('previews/scene-masks.svg')).href,{settleMs:400});
  await page.screenshot({path:resolve(output,'scene-masks.png'),format:'png'});
  writeFileSync(resolve(output,'checks.json'),JSON.stringify({
    type:'Asset assembly and crop screenshots, not a site functionality test',
    crops:report, physicalMobileDevice:false, browser:'Installed Chromium via CDP',
    note:'Inspect all images visually; geometry checks alone do not prove visual alignment.'
  },null,2));
  console.log('Saved scene assembly, masks and four crop screenshots to previews/.');
} finally { await browser.close(); }
