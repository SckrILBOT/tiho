(() => {
  const durationButtons = [...document.querySelectorAll('[data-session-minutes]')];
  const time = document.querySelector('[data-session-time]');
  const status = document.querySelector('[data-session-state]');
  const action = document.querySelector('[data-session-action]');
  const reset = document.querySelector('[data-session-reset]');
  const openButton = document.querySelector('[data-session-open]');
  const badge = document.querySelector('[data-session-badge]');
  const announcement = document.querySelector('[data-session-announcement]');
  const notebook = document.querySelector('#notebook-dialog');

  let duration = 25 * 60_000;
  let remaining = duration;
  let deadline = 0;
  let interval = null;
  let state = 'idle';

  const labels = {
    idle: { action: 'Начать', status: '' },
    running: { action: 'Пауза', status: 'Идёт сессия' },
    paused: { action: 'Продолжить', status: 'На паузе' },
    finished: { action: 'Начать снова', status: 'Сессия завершена' }
  };

  function renderTime() {
    const seconds = Math.ceil(remaining / 1000);
    const formatted = String(Math.floor(seconds / 60)).padStart(2, '0')
      + ':' + String(seconds % 60).padStart(2, '0');
    if (time.textContent === formatted && state === 'running' && badge.textContent === formatted) return;
    time.textContent = formatted;
    badge.textContent = state === 'paused' ? 'Пауза · ' + formatted : formatted;
  }

  function setState(next) {
    state = next;
    action.textContent = labels[state].action;
    status.textContent = labels[state].status;
    openButton.hidden = state !== 'running' && state !== 'paused';
    reset.disabled = state === 'idle';
    for (const button of durationButtons) {
      button.disabled = state === 'running' || state === 'paused';
      button.setAttribute('aria-pressed', String(Number(button.dataset.sessionMinutes) * 60_000 === duration));
    }
    renderTime();
  }

  function stopInterval() {
    clearInterval(interval);
    interval = null;
  }

  function syncTime() {
    if (state !== 'running') return;
    remaining = Math.max(0, deadline - Date.now());
    if (remaining === 0) {
      stopInterval();
      setState('finished');
      if (!notebook.open) announcement.textContent = labels.finished.status;
      return;
    }
    renderTime();
  }

  for (const button of durationButtons) {
    button.addEventListener('click', () => {
      duration = Number(button.dataset.sessionMinutes) * 60_000;
      remaining = duration;
      announcement.textContent = '';
      setState('idle');
    });
  }

  action.addEventListener('click', () => {
    if (state === 'running') {
      syncTime();
      if (state === 'finished') return;
      stopInterval();
      setState('paused');
      return;
    }

    if (state !== 'paused') remaining = duration;
    announcement.textContent = '';
    deadline = Date.now() + remaining;
    setState('running');
    interval = setInterval(syncTime, 250);
  });

  reset.addEventListener('click', () => {
    stopInterval();
    remaining = duration;
    announcement.textContent = '';
    setState('idle');
    action.focus();
  });

  document.addEventListener('visibilitychange', syncTime);
  window.addEventListener('pageshow', syncTime);
  setState('idle');
})();
