import { Browser,sleep, localSiteUrl } from './browser-test.mjs';
import { mkdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
process.env.TASTE_SKILL_TMP=resolve('previews/browser-profile');
const out=resolve('.taste-skill/audio');mkdirSync(out,{recursive:true});
const browser=await Browser.launch();const checks=[];
function check(name,passed,details){checks.push({name,passed,details});if(!passed)throw new Error(name+': '+JSON.stringify(details));}
async function click(page,selector){
  const point=await page.eval(selector=>{const e=document.querySelector(selector);e.scrollIntoView({block:'center'});const b=e.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};},selector);
  await page.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
  await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
}
async function until(page,predicate){for(let i=0;i<100;i++){if(await page.eval(predicate))return;await sleep(100);}throw new Error('Timeout waiting for audio');}
try {
  const page=await browser.newPage({width:1440,height:900});
  await page.goto('http://127.0.0.1:4173/');
  check('No context or audio download before entry',await page.eval(()=>tihoAudio.snapshot().contextState==='uncreated'&&!document.querySelector('script[src="./audio-data.js"]')));
  await click(page,'.scene-control[data-action="window"]');
  check('Object interaction does not start sound',await page.eval(()=>tihoAudio.snapshot().contextState==='uncreated'));
  await click(page,'.welcome [data-enter]');
  await until(page,()=>tihoAudio.snapshot().ready);await sleep(1500);
  let s=await page.eval(()=>tihoAudio.snapshot());
  check('Explicit entry produces a real nonzero signal',s.contextState==='running'&&s.rms>.00001,s);
  check('All three decoded tracks loop',Object.keys(s.tracks).length===3&&Object.values(s.tracks).every(t=>t.loop&&t.duration>5),s.tracks);
  check('Already open window uses external mix',s.tracks.wind.gain>.2&&s.tracks.rain.frequency>9000,s.tracks);
  await click(page,'.scene-control[data-action="window"]');await sleep(1000);
  s=await page.eval(()=>tihoAudio.snapshot());
  check('Closing muffles rain and removes wind',s.tracks.wind.gain===0&&s.tracks.rain.frequency<1700,s.tracks);
  await click(page,'.scene-control[data-action="lamp"]');
  await page.eval(()=>{const range=document.querySelector('#audio-volume');range.value='0';range.dispatchEvent(new Event('input',{bubbles:true}));});await sleep(250);
  s=await page.eval(()=>tihoAudio.snapshot());check('Zero volume silences output',s.master===0&&s.rms<.000001,s);
  await page.eval(()=>{const range=document.querySelector('#audio-volume');range.value='35';range.dispatchEvent(new Event('input',{bubbles:true}));});await sleep(250);
  check('Volume restores signal',await page.eval(()=>tihoAudio.snapshot().rms>.00001));
  await click(page,'[data-audio-toggle]');await sleep(350);
  check('Pause suspends context',await page.eval(()=>!tihoAudio.snapshot().wanted&&tihoAudio.snapshot().contextState==='suspended'));
  await click(page,'[data-audio-toggle]');await sleep(1400);
  check('Resume reuses three tracks',await page.eval(()=>tihoAudio.snapshot().contextState==='running'&&Object.keys(tihoAudio.snapshot().tracks).length===3));
  for(const width of [1440,768,390,360]){
    await page.setViewport({width,height:900,mobile:width<600});
    await page.eval(()=>document.querySelector('#compartment').scrollIntoView());await sleep(250);
    check(`No horizontal overflow ${width}`,await page.eval(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:resolve(out,`${width}-playing.jpg`),quality:88});
  }
  await page.goto((localSiteUrl+'#compartment'));
  check('Reload resets to silent',await page.eval(()=>tihoAudio.snapshot().contextState==='uncreated'));
  await click(page,'[data-audio-toggle]');await until(page,()=>tihoAudio.snapshot().ready);await sleep(1400);
  check('Local file also plays audio',await page.eval(()=>tihoAudio.snapshot().contextState==='running'&&tihoAudio.snapshot().rms>.00001));
  await page.goto('http://127.0.0.1:4173/');
  await page.send('Network.enable');await page.send('Network.setBlockedURLs',{urls:['*audio-data.js*']});
  await click(page,'[data-audio-toggle]');await until(page,()=>tihoAudio.snapshot().failed);
  check('Loading failure shows retry and keeps scene usable',await page.eval(()=>document.querySelector('[data-audio-toggle]').textContent==='Повторить'&&typeof tihoSceneEngine.setWindow==='function'));
  await page.send('Network.setBlockedURLs',{urls:[]});
  await click(page,'[data-audio-toggle]');await until(page,()=>tihoAudio.snapshot().ready);await sleep(1400);
  check('Retry recovers sound',await page.eval(()=>!tihoAudio.snapshot().failed&&tihoAudio.snapshot().rms>.00001));
  await page.goto('http://127.0.0.1:4173/');
  await page.send('Network.emulateNetworkConditions',{offline:false,latency:600,downloadThroughput:500000,uploadThroughput:500000});
  await click(page,'[data-audio-toggle]');await click(page,'[data-audio-toggle]');
  await until(page,()=>tihoAudio.snapshot().ready);await sleep(400);
  check('Pause during loading stays paused after decoding',await page.eval(()=>!tihoAudio.snapshot().wanted&&tihoAudio.snapshot().contextState==='suspended'));
  await click(page,'[data-audio-toggle]');await sleep(1400);
  check('Sound button also enters the visual scene',await page.eval(()=>document.querySelector('#compartment').classList.contains('has-entered')&&tihoAudio.snapshot().rms>.00001));
  check('No uncaught JS errors',page.consoleErrors.length===0,page.consoleErrors);
}catch(error){console.error(error);process.exitCode=1;}
finally{writeFileSync(resolve(out,'checks.json'),JSON.stringify(checks,null,2));await browser.close();}
console.log(checks.map(c=>`${c.passed?'PASS':'FAIL'} ${c.name}`).join('\n'));
