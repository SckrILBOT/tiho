(() => {
  const key = 'tiho.settings.v1';
  let legacy = {};
  const unsaved = new Map();
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) legacy = saved;
  } catch {
    // The page can run with browser storage disabled.
  }

  window.tihoSettings = {
    get(name) {
      if (unsaved.has(name)) return unsaved.get(name);
      try {
        const saved = localStorage.getItem(`${key}.${name}`);
        if (saved !== null) return JSON.parse(saved);
      } catch {}
      return legacy[name];
    },
    set(name, value) {
      // Each setting has its own key so a write cannot overwrite another tab's changes.
      try {
        localStorage.setItem(`${key}.${name}`, JSON.stringify(value));
        unsaved.delete(name);
      } catch {
        unsaved.set(name, value);
      }
    }
  };
})();
