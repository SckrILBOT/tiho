(() => {
  const key = 'tiho.settings.v1';
  let values = {};
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) values = saved;
  } catch {
    // The page can run with browser storage disabled.
  }

  window.tihoSettings = {
    get(name) { return values[name]; },
    set(name, value) {
      values[name] = value;
      try { localStorage.setItem(key, JSON.stringify(values)); } catch {}
    }
  };
})();
