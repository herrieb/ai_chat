import type { BotErrorEvent, BotErrorCategory } from '../types.js';

export interface ErrorNoticeCallbacks {
  onRetry?: (roomId: string) => void;
  roomId?: string;
}

const ERROR_MESSAGES: Record<BotErrorCategory, { title: string; description: string }> = {
  ai_unavailable: {
    title: 'AI Unavailable',
    description: 'Could not connect to Ollama. Please check that Ollama is running locally.'
  },
  ai_response_failed: {
    title: 'AI Response Failed',
    description: 'The AI encountered an error generating a response. Please try again.'
  }
};

function getErrorContent(error: BotErrorEvent): { title: string; description: string } {
  if (error.message && error.message.length > 0) {
    return {
      title: error.category === 'ai_unavailable' ? 'AI Connection Error' : 'AI Response Error',
      description: error.message
    };
  }
  return ERROR_MESSAGES[error.category] ?? {
    title: 'Error',
    description: 'An unexpected error occurred.'
  };
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function createErrorNotice(
  error: BotErrorEvent,
  onDismiss: (id: string) => void,
  callbacks?: ErrorNoticeCallbacks
): HTMLElement {
  const { title, description } = getErrorContent(error);
  const isWarning = error.severity === 'warning';
  const severityClass = isWarning ? 'error-notice--warning' : 'error-notice--error';

  const notice = document.createElement('div');
  notice.className = `error-notice ${severityClass}`;
  notice.dataset.errorId = error.id;
  notice.setAttribute('role', 'alert');
  notice.innerHTML = `
    <div class="error-notice__icon" aria-hidden="true">
      ${isWarning ? `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ` : `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      `}
    </div>
    <div class="error-notice__content">
      <span class="error-notice__title">${title}</span>
      <span class="error-notice__description">${description}</span>
      ${error.retryable && callbacks?.roomId ? `
        <button class="error-notice__retry" type="button">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 4v6h6M23 20v-6h-6"/>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
          Retry AI
        </button>
      ` : ''}
    </div>
    <span class="error-notice__time">${formatTimestamp(error.timestamp)}</span>
    <button class="error-notice__dismiss" type="button" aria-label="Dismiss notification">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

  const dismissBtn = notice.querySelector<HTMLButtonElement>('.error-notice__dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      notice.classList.add('error-notice--exiting');
      setTimeout(() => {
        onDismiss(error.id);
      }, 200);
    });
  }

  const retryBtn = notice.querySelector<HTMLButtonElement>('.error-notice__retry');
  if (retryBtn && callbacks?.onRetry && callbacks.roomId) {
    retryBtn.addEventListener('click', () => {
      callbacks.onRetry!(callbacks.roomId!);
      notice.classList.add('error-notice--exiting');
      setTimeout(() => {
        onDismiss(error.id);
      }, 200);
    });
  }

  const WARNING_AUTO_DISMISS_MS = 8000;
  if (isWarning && !error.retryable) {
    setTimeout(() => {
      if (notice.parentElement && !notice.classList.contains('error-notice--exiting')) {
        notice.classList.add('error-notice--exiting');
        setTimeout(() => onDismiss(error.id), 200);
      }
    }, WARNING_AUTO_DISMISS_MS);
  }

  return notice;
}

export function createErrorNoticeContainer(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'error-notice-container';
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-label', 'Notifications');
  return container;
}

export function addErrorNotice(container: HTMLElement, notice: HTMLElement): void {
  container.appendChild(notice);
  requestAnimationFrame(() => {
    notice.classList.add('error-notice--visible');
  });
}

export function removeErrorNotice(container: HTMLElement, errorId: string): void {
  const notice = container.querySelector<HTMLElement>(`[data-error-id="${errorId}"]`);
  if (notice) {
    notice.remove();
  }
}

export function clearErrorNotices(container: HTMLElement): void {
  container.innerHTML = '';
}
