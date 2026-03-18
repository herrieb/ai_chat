import { beforeEach, describe, expect, it } from 'vitest';

import { applyTheme, setStoredTheme, toggleTheme } from '../theme.js';

describe('theme helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('applies a stored theme to the document', () => {
    setStoredTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggles between dark and light', () => {
    applyTheme('light');
    setStoredTheme('light');

    const next = toggleTheme();

    expect(next).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
