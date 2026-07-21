export const THEME_STORAGE_KEY = "forno-color-theme";
export const THEMES = ["light", "dark"];

export function readTheme() {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEMES.includes(savedTheme) ? savedTheme : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme, { persist = true } = {}) {
  const nextTheme = THEMES.includes(theme) ? theme : "light";
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;
  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Theme still applies when storage is unavailable.
    }
  }
  return nextTheme;
}

export function initializeTheme() {
  return applyTheme(readTheme(), { persist: false });
}
