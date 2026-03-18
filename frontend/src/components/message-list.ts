import type { ChatMessage } from '../types.js';

export function createMessageList(): HTMLElement {
  const container = document.createElement('section');
  container.className = 'message-list';
  container.setAttribute('role', 'log');
  container.setAttribute('aria-live', 'polite');
  return container;
}

export function updateMessageList(
  container: HTMLElement,
  messages: ChatMessage[],
  currentUserId?: string
): void {
  const currentCount = container.querySelectorAll('.message').length;
  const newMessages = messages.slice(currentCount);

  newMessages.forEach((msg) => {
    const el = createMessageElement(msg, currentUserId);
    container.appendChild(el);
  });

  container.scrollTop = container.scrollHeight;
}

export function clearMessageList(container: HTMLElement): void {
  container.innerHTML = '';
}

function createMessageElement(msg: ChatMessage, currentUserId?: string): HTMLElement {
  const article = document.createElement('article');
  article.className = 'message';
  article.dataset.id = msg.id;

  const isOwn = currentUserId !== undefined && msg.participantId === currentUserId;
  article.classList.toggle('message--own', isOwn);
  article.classList.toggle('message--other', !isOwn);

  const time = formatTime(msg.createdAt);

  article.innerHTML = `
    <div class="message-bubble">
      ${!isOwn ? `<span class="message-sender">${escapeHtml(msg.displayName)}</span>` : ''}
      <p class="message-text">${escapeHtml(msg.content)}</p>
      <div class="message-meta">
        <time class="message-time" datetime="${msg.createdAt}">${time}</time>
        ${isOwn ? `<span class="message-status">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06l2.72 2.72 6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
          </svg>
        </span>` : ''}
      </div>
    </div>
  `;

  return article;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
