/* Object interactions and explicit entry into the sound space. */
const scene = document.querySelector('#compartment');
const artwork = document.querySelector('.scene-art');
const stage = document.querySelector('.scene-stage');
const cord = document.querySelector('.scene-cord');
const knob = document.querySelector('.cord-knob');
const cordLines = [...document.querySelectorAll('.cord-line')];
const dialog = document.querySelector('#notebook-dialog');
const noteForm = dialog.querySelector('form');
const taskInput = document.querySelector('#task-text');
const pagePrevious = dialog.querySelector('[data-page-previous]');
const pageNext = dialog.querySelector('[data-page-next]');
const pageNumber = dialog.querySelector('[data-page-number]');
const pageAnnouncement = dialog.querySelector('[data-page-announcement]');
const notebookLeaf = dialog.querySelector('.notebook-leaf');
const announcement = document.querySelector('#scene-announcement');
const smallScreen = window.matchMedia('(max-width: 599px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const welcomeDialog = document.querySelector('#entry-dialog');
let dismissingWelcome = false;
const discovery = document.querySelector('[data-scene-discovery]');
let discoveryDismissed = false;

const settings = window.tihoSettings;
const savedTask = settings.get('task');
const savedNotebook = settings.get('notebook');
const pages = Array.isArray(savedNotebook?.pages) && savedNotebook.pages.length
  ? savedNotebook.pages.map(page => typeof page === 'string' ? page : '')
  : [typeof savedTask === 'string' ? savedTask : ''];
let currentPage = Number.isInteger(savedNotebook?.current)
  ? Math.max(0, Math.min(savedNotebook.current, pages.length - 1)) : 0;
let pageAnimation = null;
const state = {
  entered: false,
  light: settings.get('light') !== false,
  window: settings.get('window') === true,
  motion: true
};
const immersionEnter = document.querySelector('[data-enter-immersion]');
const immersionExit = document.querySelector('[data-exit-immersion]');
let immersionScroll = 0;
let immersionFrame = 0;
let sceneVisible = true;
let notebookTrigger = null;
let drag = null;
let recoilFrame = 0;
let cordSwing = null;
let suppressCordClick = false;

function announce(message) { announcement.textContent = message; }

function showDiscovery() {
  if (discoveryDismissed) return;
  discovery.hidden = false;
  scene.classList.add('is-discovering');
  scene.setAttribute('aria-describedby','scene-discovery-text');
}

function finishDiscovery() {
  discoveryDismissed = true;
  discovery.hidden = true;
  scene.classList.remove('is-discovering');
  scene.removeAttribute('aria-describedby');
}

function dismissWelcome() {
  if (!welcomeDialog.open || dismissingWelcome) return;
  dismissingWelcome = true;
  const finish = () => {
    welcomeDialog.close();
    document.body.classList.remove('has-entry-open');
    dismissingWelcome = false;
    showDiscovery();
    scene.focus({ preventScroll: true });
  };
  if (reducedMotion.matches) { finish(); return; }
  welcomeDialog.classList.add('is-leaving');
  welcomeDialog.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(12px)'}],{duration:360,easing:'ease-out',fill:'forwards'}).finished.then(finish,finish);
}

function updateMotion() {
  const enabled = state.entered && !reducedMotion.matches;
  const visible = enabled && sceneVisible && !document.hidden;
  const moving = enabled && state.motion;
  scene.classList.toggle('motion-paused', !visible);
  window.tihoSceneEngine?.setRunning(visible && state.motion);
  const rainSpeed = state.motion ? 1 : .45;
  for (const animation of scene.getAnimations({ subtree: true })) {
    if (animation.animationName === 'rain-fall' && animation.playbackRate !== rainSpeed) {
      animation.updatePlaybackRate(rainSpeed);
    }
  }
  scene.classList.toggle('prefers-reduced', reducedMotion.matches);
  const button = document.querySelector('[data-action="motion"]');
  button.disabled = reducedMotion.matches;
  button.setAttribute('aria-pressed', String(moving));
  document.querySelector('[data-motion-state]').textContent = reducedMotion.matches ? 'выключено' : moving ? 'остановить' : 'начать';
  button.title = reducedMotion.matches ? 'Движение отключено настройкой устройства' : moving ? 'Остановить поезд' : 'Продолжить поездку';
  document.querySelector('.scene-hint').textContent = reducedMotion.matches
    ? 'Управляй предметами кнопками. Движение отключено настройкой устройства.'
    : 'Потяни за шнурок, приоткрой верхнюю форточку или открой блокнот.';
}

function enterScene() {
  if (!state.entered) {
    state.entered = true;
    scene.classList.add('has-entered');
  }
  dismissWelcome();
  updateMotion();
}

function renderLight() {
  scene.classList.toggle('is-light-off', !state.light);
  for (const button of document.querySelectorAll('[data-action="lamp"]')) {
    button.setAttribute('aria-pressed', String(state.light));
    button.title = state.light ? 'Выключить лампу' : 'Включить лампу';
  }
  document.querySelector('[data-lamp-state]').textContent = state.light ? 'включён' : 'выключен';
}

function toggleLight() {
  finishDiscovery();
  enterScene();
  state.light = !state.light;
  settings.set('light', state.light);
  renderLight();
  window.tihoAudio?.click();
  announce(state.light ? 'Лампа включена.' : 'Лампа выключена.');
}

function toggleWindow() {
  finishDiscovery();
  enterScene();
  state.window = !state.window;
  settings.set('window', state.window);
  renderWindow(reducedMotion.matches);
  announce(state.window ? 'Верхняя форточка приоткрыта.' : 'Верхняя форточка закрыта.');
}

function renderWindow(immediate) {
  scene.classList.toggle('is-window-open', state.window);
  window.tihoSceneEngine?.setWindow(state.window, immediate);
  window.tihoAudio?.setWindow(state.window);
  for (const button of document.querySelectorAll('[data-action="window"]')) {
    button.setAttribute('aria-pressed', String(state.window));
    button.title = state.window ? 'Закрыть верхнюю форточку' : 'Приоткрыть верхнюю форточку';
  }
  document.querySelector('[data-window-state]').textContent = state.window ? 'приоткрыта' : 'закрыта';
}

function setCordLength(extension) {
  for (const line of cordLines) line.setAttribute('y2', String(409 + extension));
  knob.setAttribute('transform', `translate(0 ${extension})`);
}

function cancelCordRecoil() {
  cancelAnimationFrame(recoilFrame);
  recoilFrame = 0;
  cordSwing?.cancel();
  cordSwing = null;
}

function releaseCord(extension, sway = true) {
  cancelCordRecoil();
  if (reducedMotion.matches) { setCordLength(0); return; }
  const started = performance.now();
  function settle(now) {
    const progress = Math.min(1, (now - started) / 330);
    setCordLength(extension * (1 - progress) ** 3);
    if (progress < 1) recoilFrame = requestAnimationFrame(settle);
    else recoilFrame = 0;
  }
  recoilFrame = requestAnimationFrame(settle);
  if (sway) {
    cordSwing = cord.animate([
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(-2.2deg)', offset: .2 },
      { transform: 'rotate(1.5deg)', offset: .45 },
      { transform: 'rotate(-.7deg)', offset: .7 },
      { transform: 'rotate(0deg)' }
    ], { duration: 720, easing: 'ease-out' });
  }
}

function openNotebook(trigger) {
  finishDiscovery();
  enterScene();
  if (dialog.open) return;
  notebookTrigger = trigger;
  renderPage();
  updateDialogHeight();
  document.body.classList.add('has-notebook-open');
  dialog.showModal();
}

function updateDialogHeight() {
  dialog.style.setProperty('--dialog-viewport-height', `${window.visualViewport?.height || window.innerHeight}px`);
}

const bounds = [
  ['.hotspot-window', [600, 10, 640, 230]],
  ['.hotspot-lamp', [1399, 181, 166, 133], '.scene-lamp-prop'],
  ['.hotspot-cord', [1513, 296, 48, 151], '.scene-lamp-prop'],
  ['.hotspot-notebook', [1020, 666, 275, 111], '.scene-notebook-prop']
];

function positionHotspots() {
  const matrix = artwork.getScreenCTM();
  if (!matrix) return;
  const frame = stage.getBoundingClientRect();
  for (const [selector, [x, y, width, height], prop] of bounds) {
    const targetMatrix = prop ? document.querySelector(prop).getScreenCTM() : matrix;
    const first = new DOMPoint(x, y).matrixTransform(targetMatrix);
    const last = new DOMPoint(x + width, y + height).matrixTransform(targetMatrix);
    const x0 = Math.max(0,first.x-frame.left), x1 = Math.min(frame.width,last.x-frame.left);
    const y0 = Math.max(0,first.y-frame.top), y1 = Math.min(frame.height,last.y-frame.top);
    const target = document.querySelector(selector);
    target.hidden = x1 <= x0 || y1 <= y0;
    if (target.hidden) continue;
    const hitWidth = Math.min(frame.width,Math.max(44,x1-x0));
    const hitHeight = Math.min(frame.height,Math.max(44,y1-y0));
    const left = Math.max(0,Math.min(frame.width-hitWidth,(x0+x1-hitWidth)/2));
    const top = Math.max(0,Math.min(frame.height-hitHeight,(y0+y1-hitHeight)/2));
    Object.assign(target.style, {
      left: `${left}px`, top: `${top}px`, width: `${hitWidth}px`, height: `${hitHeight}px`
    });
  }
}

function updateSceneCrop() {
  const ratio = stage.clientWidth / stage.clientHeight;
  const portrait = ratio < 1;
  let width=1672,height=941,x=0,y=0;
  if (ratio >= 1672/941) { height=1672/ratio; y=(941-height)*.44; }
  else { width=941*ratio; x=portrait ? Math.max(0,1534-width) : (1672-width)/2; }
  artwork.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  // Compose the independent props on the existing wall/table for portrait.
  // Uniform scaling retains the book's perspective and its contact shadow.
  const lampShift = portrait ? -44 : 0;
  const bookScale = portrait ? Math.min(1,width*.56/255) : 1;
  const bookX = portrait ? Math.max(1030,x+width*.08) : 1030;
  document.querySelector('.scene-lamp-prop').setAttribute('transform',`translate(${lampShift} 0)`);
  document.querySelector('.scene-notebook-prop').setAttribute('transform',`matrix(${bookScale} 0 0 ${bookScale} ${bookX-1030*bookScale} ${767*(1-bookScale)})`);
  document.querySelector('.lamp-wall-glow').setAttribute('cx',String(1465+lampShift));
  const tableLightX=1340+lampShift;
  document.querySelector('.lamp-table-glow').setAttribute('cx',String(tableLightX));
  document.querySelector('.lamp-table-glow').setAttribute('transform',`rotate(-8 ${tableLightX} 717)`);
  positionHotspots();
}

document.querySelector('[data-close-discovery]').addEventListener('click',()=>{
  finishDiscovery(); scene.focus({preventScroll:true});
});

for (const entry of document.querySelectorAll('[data-enter], .scene-down')) {
  entry.addEventListener('click', event => {
    let target = scene;
    if (entry instanceof HTMLAnchorElement) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      target = document.getElementById(entry.hash.slice(1));
      if (location.hash !== entry.hash) history.pushState(null, '', entry.hash);
      target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }
    if (entry.hasAttribute('data-enter')) enterScene();
    if (entry.hasAttribute('data-start-audio')) window.tihoAudio?.start();
    target.focus({ preventScroll: true });
  });
}

// The sound button is also an explicit entry; object clicks stay silent.
for (const button of document.querySelectorAll('[data-audio-toggle], [data-audio-compact]')) button.addEventListener('click', enterScene);
document.querySelector('[data-entry-close]').addEventListener('click', enterScene);
welcomeDialog.addEventListener('cancel', event => { event.preventDefault(); enterScene(); });

for (const button of document.querySelectorAll('[data-action]')) {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'lamp') toggleLight();
    if (action === 'window') toggleWindow();
    if (action === 'notebook') openNotebook(button);
    if (action === 'motion') {
      if (!state.entered) enterScene();
      else state.motion = !state.motion;
      window.tihoAudio?.setTrainMoving(state.motion);
      updateMotion();
      announce(state.motion ? 'Поезд снова едет.' : 'Поезд остановился. Дождь продолжается.');
    }
    if (action === 'cord') {
      if (suppressCordClick) { suppressCordClick = false; return; }
      toggleLight();
      releaseCord(18);
    }
  });
}

const cordHandle = document.querySelector('[data-action="cord"]');
cordHandle.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0) return;
  cancelCordRecoil();
  setCordLength(0);
  suppressCordClick = false;
  drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, extension: 0, moved: false };
  cordHandle.setPointerCapture(event.pointerId);
});
cordHandle.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const deltaY = event.clientY - drag.startY;
  if (Math.hypot(event.clientX - drag.startX, deltaY) > 5) drag.moved = true;
  const scale = artwork.getScreenCTM()?.d || 1;
  drag.extension = Math.min(52, Math.max(0, deltaY / scale));
  setCordLength(drag.extension);
});

function finishDrag(event, cancelled) {
  if (!drag || event.pointerId !== drag.id) return;
  const finished = drag;
  drag = null;
  suppressCordClick = finished.moved || cancelled;
  if (!cancelled && finished.extension >= 22) toggleLight();
  releaseCord(finished.extension, !cancelled);
  if (cordHandle.hasPointerCapture(event.pointerId)) cordHandle.releasePointerCapture(event.pointerId);
}
cordHandle.addEventListener('pointerup', event => finishDrag(event, false));
cordHandle.addEventListener('pointercancel', event => finishDrag(event, true));
cordHandle.addEventListener('lostpointercapture', event => finishDrag(event, true));
cordHandle.addEventListener('keydown', () => { suppressCordClick = false; });

function renderNote() {
  document.querySelector('[data-note-state]').textContent = pages.some(page => page.trim()) ? 'есть запись' : 'записать задачу';
}

function renderPage() {
  taskInput.value = pages[currentPage];
  taskInput.scrollTop = 0;
  pagePrevious.disabled = currentPage === 0;
  pageNumber.textContent = `${currentPage + 1} / ${pages.length}`;
  pageAnnouncement.textContent = `Страница ${currentPage + 1} из ${pages.length}`;
}

function saveNotebook() {
  settings.set('notebook', { pages, current: currentPage });
  renderNote();
}

function turnPage(direction) {
  const next = currentPage + direction;
  if (next < 0) return;

  pages[currentPage] = taskInput.value;
  if (next === pages.length) pages.push('');
  currentPage = next;
  const previousHadFocus = document.activeElement === pagePrevious;
  renderPage();
  saveNotebook();
  if (previousHadFocus && pagePrevious.disabled) pageNext.focus({ preventScroll: true });

  pageAnimation?.cancel();
  if (reducedMotion.matches) return;
  const folded = `perspective(1300px) rotateY(${direction * -105}deg)`;
  const flat = 'perspective(1300px) rotateY(0deg)';
  pageAnimation = notebookLeaf.animate(
    direction > 0
      ? [{ transform: flat, opacity: 1 }, { transform: folded, opacity: 0 }]
      : [{ transform: folded, opacity: 0 }, { transform: flat, opacity: 0.85, offset: 0.78 }, { transform: flat, opacity: 0 }],
    { duration: 300, easing: 'ease-out' }
  );
}

pagePrevious.addEventListener('click', () => turnPage(-1));
pageNext.addEventListener('click', () => turnPage(1));

noteForm.addEventListener('submit', event => {
  event.preventDefault();
  pages[currentPage] = taskInput.value;
  saveNotebook();
  dialog.close('saved');
  announce(pages[currentPage].trim() ? 'Запись оставлена в блокноте.' : 'Пустая страница сохранена.');
});
document.querySelector('[data-close-notebook]').addEventListener('click', () => dialog.close('cancel'));
dialog.addEventListener('close', () => {
  pageAnimation?.cancel();
  document.body.classList.remove('has-notebook-open');
  let target = notebookTrigger;
  if (!target?.getClientRects().length) {
    const hotspot = document.querySelector('.hotspot-notebook');
    target = !immersionExit.hidden ? immersionExit
      : hotspot.getClientRects().length ? hotspot : document.querySelector('.scene-control[data-action="notebook"]');
  }
  target?.focus({ preventScroll: true });
});
dialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const fields = [...dialog.querySelectorAll('button:not(:disabled), textarea:not(:disabled)')];
  const first = fields[0];
  const last = fields[fields.length - 1];
  if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close('cancel');
});

immersionEnter.addEventListener('click', () => {
  if (immersionFrame) return;
  immersionScroll = window.scrollY;
  enterScene();
  const finish = () => {
    immersionFrame = 0;
    window.scrollTo(0, 0);
    finishDiscovery();
    document.body.classList.replace('is-entering-immersion', 'is-immersed');
    immersionExit.hidden = false;
    immersionExit.focus({ preventScroll: true });
  };
  document.body.classList.add('is-entering-immersion');
  if (reducedMotion.matches) { finish(); return; }
  const start = performance.now();
  function move(now) {
    const progress = Math.min(1, Math.max(0, (now - start) / 360));
    if (progress === 1 || reducedMotion.matches) { finish(); return; }
    window.scrollTo(0, immersionScroll * (1 - progress) ** 3);
    immersionFrame = requestAnimationFrame(move);
  }
  immersionFrame = requestAnimationFrame(move);
});

function leaveImmersion() {
  cancelAnimationFrame(immersionFrame);
  immersionFrame = 0;
  document.body.classList.remove('is-entering-immersion', 'is-immersed');
  immersionExit.hidden = true;
  window.scrollTo(0, immersionScroll);
  immersionEnter.focus({ preventScroll: true });
}

immersionExit.addEventListener('click', leaveImmersion);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && (immersionFrame || !immersionExit.hidden) && !dialog.open) leaveImmersion();
});

smallScreen.addEventListener('change', updateSceneCrop);
reducedMotion.addEventListener('change', () => {
  cancelCordRecoil(); setCordLength(0); updateMotion();
  if(reducedMotion.matches) window.tihoSceneEngine?.setWindow(state.window,true);
});
document.addEventListener('visibilitychange', updateMotion);
window.addEventListener('resize', updateSceneCrop);
window.visualViewport?.addEventListener('resize', updateDialogHeight);
new ResizeObserver(updateSceneCrop).observe(stage);
new IntersectionObserver(([entry]) => {
  sceneVisible = entry.isIntersecting;
  updateMotion();
}, { threshold: 0 }).observe(stage);

document.querySelector('.scene-controls').hidden = false;
document.querySelector('.scene-hotspots').hidden = false;
document.querySelector('[data-scene-edge]').hidden = false;
immersionEnter.hidden = false;
updateSceneCrop();
renderLight();
renderWindow(true);
renderNote();
updateMotion();
welcomeDialog.showModal();
document.body.classList.add('has-entry-open');
welcomeDialog.querySelector('[data-enter]').focus({preventScroll:true});
window.scrollTo(0,0);
window.addEventListener('load',()=>{
  if (!welcomeDialog.open) return;
  window.scrollTo(0,0);
  // Fragment navigation/history restoration can reset focus after the load event.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(welcomeDialog.open) welcomeDialog.querySelector('[data-enter]').focus({preventScroll:true});
  }));
},{once:true});
welcomeDialog.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const buttons = [...welcomeDialog.querySelectorAll('button:not(:disabled)')];
  const first = buttons[0], last = buttons[buttons.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault(); first.focus();
  }
});
