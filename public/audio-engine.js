/* Local recordings, one shared clock and click-free gain changes. No autoplay. */
(() => {
  let context,master,analyser,loading,suspendTimer;
  let wanted=false,ready=false,failed=false,opened=false,volume=.3;
  let trainMoving=true;
  let lastError=null;
  const tracks={};
  const trackNames=['train','rain','wind'];
  const toggle=document.querySelector('[data-audio-toggle]');
  const status=document.querySelector('[data-audio-status]');
  const slider=document.querySelector('#audio-volume');
  const output=document.querySelector('[data-volume-value]');
  const compact=document.querySelector('[data-audio-compact]');
  const feedback=document.querySelector('[data-audio-feedback]');
  const savedVolume=window.tihoSettings.get('volume');
  if(Number.isFinite(savedVolume)) volume=Math.max(0,Math.min(1,savedVolume));
  slider.value=String(Math.round(volume*100));
  output.textContent=slider.value+' %';

  function render() {
    const playing=ready && wanted && context?.state==='running';
    toggle.textContent=loading && wanted?'Загружаем…':failed?'Повторить':playing?'Пауза звука':ready?'Продолжить звук':'Включить звук';
    toggle.setAttribute('aria-pressed',String(playing));
    toggle.setAttribute('aria-busy',String(Boolean(loading && wanted)));
    const ambience=opened?'дождь и ветер':'дождь за стеклом';
    const playingStatus=trainMoving?`Поезд и ${ambience}`:opened?'Дождь и ветер':'Дождь за стеклом';
    status.textContent=failed?'Не удалось включить звук. Попробуй ещё раз.':loading && wanted?'Готовим звуки купе…':playing?playingStatus:ready?'Звук на паузе':'Звук выключен';
    const pending=Boolean(loading && wanted);
    compact.dataset.audioState=failed?'error':pending?'loading':playing?'playing':'paused';
    compact.setAttribute('aria-label',pending?'Отменить включение звука':failed?'Повторить включение звука':playing?'Выключить звук':'Включить звук');
    compact.setAttribute('aria-busy',String(pending));
    compact.setAttribute('aria-pressed',String(playing));
    compact.title=compact.getAttribute('aria-label');
    compact.querySelector('[data-compact-label]').textContent=failed?'Повторить':pending?'Отменить':playing?'Выключить звук':'Включить звук';
    feedback.hidden=!failed && !pending;
    feedback.textContent=failed?'Звук не включился. Нажми «Повторить».':pending?'Загружаем звуки купе…':'';
    if(feedback.hidden) compact.removeAttribute('aria-describedby');
    else compact.setAttribute('aria-describedby',feedback.id);
  }
  function ramp(parameter,value,seconds=.8) {
    const now=context.currentTime;
    parameter.cancelScheduledValues(now);
    parameter.setValueAtTime(parameter.value,now);
    parameter.linearRampToValueAtTime(value,now+seconds);
  }
  function mix() {
    if(!ready) return;
    ramp(tracks.train.gain.gain,trainMoving?(opened?.72:.9):0,.3);
    ramp(tracks.rain.gain.gain,opened?.75:.32);
    ramp(tracks.wind.gain.gain,opened?.28:0);
    ramp(tracks.rain.filter.frequency,opened?9500:1600);
  }
  function loadBundle() {
    if(window.tihoAudioData) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      const timer=setTimeout(()=>{script.remove();reject(new Error('Audio loading timed out'));},20000);
      script.src='./audio-data.js';
      script.onload=()=>{clearTimeout(timer);window.tihoAudioData?resolve():reject(new Error('Missing audio data'));};
      script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('Audio bundle unavailable'));};
      document.head.append(script);
    });
  }
  async function prepare() {
    try { await loadBundle(); }
    catch(error) { error.audioPhase='load'; throw error; }
    const bundle=window.tihoAudioData;
    for(const name of trackNames) {
      if(typeof bundle?.[name]!=='string' || !bundle[name]) {
        throw Object.assign(new Error('Missing audio track: '+name),{audioPhase:'load',audioTrack:name});
      }
    }
    const decoded=await Promise.all(trackNames.map(async name=>{
      try {
        const bytes=Uint8Array.from(atob(bundle[name]),character=>character.charCodeAt(0));
        return [name,await context.decodeAudioData(bytes.buffer)];
      }
      catch(error) { error.audioPhase='decode'; error.audioTrack=name; throw error; }
    }));
    const when=context.currentTime+.05;
    for(const [name,buffer] of decoded) {
      const source=context.createBufferSource(),gain=context.createGain(),filter=context.createBiquadFilter();
      source.buffer=buffer;source.loop=true;gain.gain.value=0;
      filter.type='lowpass';filter.frequency.value=name==='train'?2600:9500;
      source.connect(filter).connect(gain).connect(master);source.start(when);
      tracks[name]={source,gain,filter};
    }
    ready=true;mix();
  }
  async function start() {
    wanted=true;failed=false;lastError=null;clearTimeout(suspendTimer);
    try {
      if(!context) {
        const AudioContext=window.AudioContext||window.webkitAudioContext;
        if(!AudioContext) throw Object.assign(new Error('Web Audio unavailable'),{audioPhase:'unsupported'});
        context=new AudioContext();master=context.createGain();master.gain.value=0;
        analyser=context.createAnalyser();analyser.fftSize=2048;
        master.connect(analyser).connect(context.destination);
        context.addEventListener('statechange',render);
      }
      // Resume while still in the explicit user gesture, before async decoding.
      const resume=context.resume();
      if(!ready && !loading) {
        loading=prepare().catch(error=>{
          delete window.tihoAudioData;
          throw error;
        }).finally(()=>{loading=null;});
      }
      render();
      await Promise.all([resume,loading]);
      if(wanted) ramp(master.gain,volume,1.2);
      else await context.suspend();
      render();
    } catch(error) {
      wanted=false;failed=true;
      lastError={phase:error.audioPhase || (context?'resume':'initialise'),name:error.name || 'Error',message:error.message || String(error),track:error.audioTrack || null};
      console.warn('Тихо: ошибка звука',lastError);
      if(context) {master.gain.value=0;context.suspend().catch(()=>{});}
      render();
    }
  }
  function pause() {
    wanted=false;
    if(context) {
      ramp(master.gain,0,.18);
      clearTimeout(suspendTimer);
      suspendTimer=setTimeout(()=>{if(!wanted) context.suspend().catch(()=>{});},210);
    }
    render();
  }
  function click() {
    if(!wanted || !ready || context.state!=='running') return;
    const buffer=context.createBuffer(1,Math.floor(context.sampleRate*.045),context.sampleRate);
    const samples=buffer.getChannelData(0);
    let seed=38491;
    for(let i=0;i<samples.length;i++) {
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      samples[i]=(seed/4294967296*2-1)*Math.exp(-i/(context.sampleRate*.005));
    }
    const source=context.createBufferSource(),gain=context.createGain(),filter=context.createBiquadFilter();
    source.buffer=buffer;filter.type='bandpass';filter.frequency.value=1800;filter.Q.value=.6;gain.gain.value=.2;
    source.connect(filter).connect(gain).connect(master);source.start();
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  for(const button of [toggle,compact]) button.addEventListener('click',()=>{if(wanted && (loading || context?.state==='running')) pause();else start();});
  slider.addEventListener('input',()=>{
    volume=Number(slider.value)/100;output.textContent=`${slider.value} %`;
    window.tihoSettings.set('volume',volume);
    if(ready && wanted) ramp(master.gain,volume,.12);
  });
  document.querySelector('.audio-controls').hidden=false;
  window.tihoAudio={start,pause,click,setWindow(value){opened=value;mix();render();},setTrainMoving(value){trainMoving=value;mix();render();},snapshot(){
    const samples=new Float32Array(2048);analyser?.getFloatTimeDomainData(samples);
    return {wanted,ready,loading:Boolean(loading),failed,lastError,opened,volume,contextState:context?.state||'uncreated',
      rms:Math.sqrt(samples.reduce((sum,value)=>sum+value*value,0)/samples.length),
      master:master?.gain.value||0,tracks:Object.fromEntries(Object.entries(tracks).map(([name,track])=>[name,{gain:track.gain.gain.value,frequency:track.filter.frequency.value,duration:track.source.buffer.duration,loop:track.source.loop}]))};
  }};
  window.addEventListener('pagehide',pause);
  render();
})();
