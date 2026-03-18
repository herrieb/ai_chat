import { getStoredTheme, toggleTheme, applyTheme } from '../theme.js';

export function createThemeToggle(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'theme-toggle';
  btn.setAttribute('aria-label', 'Toggle theme');
  updateToggleIcon(btn);

  btn.addEventListener('click', () => {
    const newTheme = toggleTheme();
    updateToggleIcon(btn);
    dispatchThemeChange(newTheme);
  });

  applyTheme(getStoredTheme());
  return btn;
}

function updateToggleIcon(btn: HTMLButtonElement): void {
  const isDark = getStoredTheme() === 'dark';
  btn.textContent = isDark ? '\u2600' : '\u263D';
}

function dispatchThemeChange(theme: string): void {
  window.dispatchEvent(new CustomEvent('theme-change', { detail: theme }));
}
