const STORAGE_KEY = "myrpg-settings";

const DEFAULTS = {
  rapidEnhance: false
};

let cache = null;

function sanitize(data) {
  const rapidEnhance = data?.rapidEnhance === true || data?.confirmEnhance === false;
  return {
    rapidEnhance
  };
}

export function loadSettings() {
  if (cache) {
    return cache;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = sanitize(raw ? JSON.parse(raw) : DEFAULTS);
  } catch (error) {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export function getSetting(name) {
  const settings = loadSettings();
  return Object.prototype.hasOwnProperty.call(settings, name) ? settings[name] : DEFAULTS[name];
}

export function setSetting(name, value) {
  const settings = { ...loadSettings(), [name]: value };
  cache = sanitize(settings);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.log("[settings] save failed");
  }
  return cache;
}
