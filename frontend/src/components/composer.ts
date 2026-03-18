import type { SendMessagePayload } from '../types.js';

export interface ComposerCallbacks {
  onSend: (payload: SendMessagePayload) => void;
}

export function createComposer(callbacks: ComposerCallbacks): HTMLElement {
  const form = document.createElement('form');
  form.className = 'composer';
  form.innerHTML = `
    <input type="text" class="composer-input" placeholder="Type a message..." autocomplete="off" required>
    <button type="submit" class="btn btn-icon" aria-label="Send message">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
      </svg>
    </button>
  `;

  const input = form.querySelector<HTMLInputElement>('.composer-input');
  if (!input) {
    return form;
  }

  return form;
}
