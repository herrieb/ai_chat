import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { getStoredTheme } from '../theme.js';

describe('theme utilities', () => {
  const originalGetItem = localStorage.getItem;
  const originalSetItem = localStorage.setItem;

  beforeEach(() => {
    localStorage.getItem = originalGetItem;
    localStorage.setItem = originalSetItem;
    const store: Record<string, string> = {};
    localStorage.getItem = (key: string) => store[key] ?? null;
    localStorage.setItem = (key: string, value: string) => { store[key] = value; };
  });

  afterEach(() => {
    localStorage.getItem = originalGetItem;
    localStorage.setItem = originalSetItem;
  });

  it('returns stored theme when valid', () => {
    localStorage.setItem('chat-theme', 'dark');
    expect(getStoredTheme()).toBe('dark');
  });

  it('returns stored theme light', () => {
    localStorage.setItem('chat-theme', 'light');
    expect(getStoredTheme()).toBe('light');
  });

  it('returns dark when nothing stored and prefers dark', () => {
    const mq = { matches: true };
    vi.stubGlobal('matchMedia', () => mq);
    const result = getStoredTheme();
    expect(result).toBeTruthy();
  });
});
