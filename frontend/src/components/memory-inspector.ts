import type { BotMemory, MemoryLedgerResponse } from '../types.js';
import { fetchMemory } from '../socket.js';

export interface MemoryInspectorCallbacks {
  onClose: () => void;
}

export function createMemoryInspector(
  botName: string,
  memoryKey: string,
  callbacks: MemoryInspectorCallbacks
): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'memory-inspector-overlay';
  overlay.innerHTML = `
    <div class="memory-inspector">
      <header class="memory-inspector__header">
        <div class="memory-inspector__title-row">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a9 9 0 0 0-9 9c0 3.6 3.4 6.2 6 8.3V22l3-3 3 3v-2.7c2.6-2.1 6-4.7 6-8.3a9 9 0 0 0-9-9z"/>
          </svg>
          <h2 class="memory-inspector__title">${escapeHtml(botName)}'s Memory</h2>
        </div>
        <button class="memory-inspector__close" type="button" aria-label="Close">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </header>
      <div class="memory-inspector__content">
        <div class="memory-inspector__loading">
          <svg class="spinner" viewBox="0 0 24 24" width="32" height="32">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-linecap="round"/>
          </svg>
          <span>Loading memory...</span>
        </div>
        <div class="memory-inspector__list" hidden></div>
        <div class="memory-inspector__empty" hidden>
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 2a9 9 0 0 0-9 9c0 3.6 3.4 6.2 6 8.3V22l3-3 3 3v-2.7c2.6-2.1 6-4.7 6-8.3a9 9 0 0 0-9-9z"/>
            <line x1="8" y1="11" x2="16" y2="11"/>
          </svg>
          <p>No memories yet</p>
          <span>Memories will appear as your AI companion learns</span>
        </div>
        <div class="memory-inspector__error" hidden>
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>Failed to load memory</p>
          <span>An error occurred while fetching memories</span>
        </div>
      </div>
      <footer class="memory-inspector__footer">
        <span class="memory-inspector__key">Key: ${escapeHtml(memoryKey)}</span>
      </footer>
    </div>
  `;

  const closeBtn = overlay.querySelector<HTMLButtonElement>('.memory-inspector__close');
  closeBtn?.addEventListener('click', callbacks.onClose);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      callbacks.onClose();
    }
  });

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      callbacks.onClose();
    }
  });

  const loading = overlay.querySelector<HTMLElement>('.memory-inspector__loading');
  const list = overlay.querySelector<HTMLElement>('.memory-inspector__list');
  const empty = overlay.querySelector<HTMLElement>('.memory-inspector__empty');
  const error = overlay.querySelector<HTMLElement>('.memory-inspector__error');

  loadMemory();

  async function loadMemory() {
    try {
      const response: MemoryLedgerResponse = await fetchMemory(memoryKey);

      if (loading) loading.hidden = true;
      if (error) error.hidden = true;

      if (response.memories.length === 0) {
        if (empty) empty.hidden = false;
      } else {
        if (list) {
          list.hidden = false;
          list.innerHTML = response.memories.map(memory => renderMemory(memory)).join('');
        }
      }
    } catch {
      if (loading) loading.hidden = true;
      if (list) list.hidden = true;
      if (empty) empty.hidden = true;
      if (error) error.hidden = false;
    }
  }

  function renderMemory(memory: BotMemory): string {
    const date = formatDate(memory.createdAt);
    const kindBadge = `<span class="memory-kind memory-kind--${memory.kind}">${memory.kind}</span>`;
    return `
      <article class="memory-entry">
        <div class="memory-entry__header">
          ${kindBadge}
          <time class="memory-entry__date">${date}</time>
        </div>
        <p class="memory-entry__content">${escapeHtml(memory.fact)}</p>
      </article>
    `;
  }

  function formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return overlay;
}

export function showMemoryInspector(container: HTMLElement, inspector: HTMLElement): void {
  container.appendChild(inspector);
  requestAnimationFrame(() => {
    inspector.classList.add('memory-inspector--visible');
  });
}

export function hideMemoryInspector(inspector: HTMLElement): void {
  inspector.classList.remove('memory-inspector--visible');
  setTimeout(() => {
    inspector.remove();
  }, 250);
}
