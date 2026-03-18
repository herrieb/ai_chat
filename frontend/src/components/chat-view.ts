import type { AppState } from '../state.js';
import { createParticipantList, updateParticipantList } from './participant-list.js';
import { createMessageList, updateMessageList, clearMessageList } from './message-list.js';
import { createComposer, type ComposerCallbacks } from './composer.js';
import { createThemeToggle } from './theme-toggle.js';
import type { SendMessagePayload } from '../types.js';

export interface ChatViewCallbacks {
  onSendMessage: (payload: SendMessagePayload) => void;
  onToggleTheme: () => void;
  onOpenMemoryInspector?: (botName: string, memoryKey: string) => void;
}

function queryElement<T extends Element>(container: ParentNode, selector: string): T | null {
  const element = container.querySelector(selector);
  return element instanceof Element ? (element as T) : null;
}

export function createChatView(callbacks: ChatViewCallbacks): HTMLElement {
  const container = document.createElement('div');
  container.className = 'chat-view';

  const header = document.createElement('header');
  header.className = 'chat-header';
  header.innerHTML = `
    <h1 class="chat-title">AI Chatroom</h1>
    <span class="room-badge"></span>
    <button class="memory-inspector-btn" id="memory-inspector-btn" title="View AI Memory" hidden>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2a9 9 0 0 0-9 9c0 3.6 3.4 6.2 6 8.3V22l3-3 3 3v-2.7c2.6-2.1 6-4.7 6-8.3a9 9 0 0 0-9-9z"/>
      </svg>
    </button>
  `;
  header.appendChild(createThemeToggle());

  const main = document.createElement('main');
  main.className = 'chat-main';

  const sidebar = createParticipantList();
  main.appendChild(sidebar);

  const messages = createMessageList();
  main.appendChild(messages);

  const composer = createComposer({
    onSend: (payload) => callbacks.onSendMessage(payload)
  });
  composer.classList.add('composer-standalone');

  container.appendChild(header);
  container.appendChild(main);
  container.appendChild(composer);

  const memoryBtn = container.querySelector<HTMLButtonElement>('#memory-inspector-btn');
  if (memoryBtn && callbacks.onOpenMemoryInspector) {
    memoryBtn.addEventListener('click', () => {
      const btn = container.querySelector<HTMLButtonElement>('#memory-inspector-btn');
      const botName = btn?.dataset.botName;
      const memoryKey = btn?.dataset.memoryKey;
      if (botName && memoryKey) {
        callbacks.onOpenMemoryInspector?.(botName, memoryKey);
      }
    });
  }

  return container;
}

export function updateChatView(
  container: HTMLElement,
  state: AppState,
  setComposerRoom: (roomId: string) => void
): void {
  const titleEl = container.querySelector('.chat-title');
  if (titleEl) {
    titleEl.textContent = state.displayName ? `${state.displayName}'s Chat` : 'AI Chatroom';
  }

  const roomBadge = container.querySelector('.room-badge');
  if (roomBadge) {
    roomBadge.textContent = state.roomId;
  }

  const sidebar = queryElement<HTMLElement>(container, '.participant-list');
  if (sidebar) {
    updateParticipantList(sidebar, state.participants);
  }

  const currentUserId = state.participants.find(
    p => p.kind === 'human' && p.displayName === state.displayName
  )?.id;

  const messageList = queryElement<HTMLElement>(container, '.message-list');
  if (messageList) {
    updateMessageList(messageList, state.messages, currentUserId);
  }

  const memoryBtn = container.querySelector<HTMLButtonElement>('#memory-inspector-btn');
  if (memoryBtn) {
    if (state.ownedBot) {
      memoryBtn.hidden = false;
      memoryBtn.dataset.botName = state.ownedBot.botName;
      memoryBtn.dataset.memoryKey = state.ownedBot.memoryKey;
    } else {
      memoryBtn.hidden = true;
      delete memoryBtn.dataset.botName;
      delete memoryBtn.dataset.memoryKey;
    }
  }

  setComposerRoom(state.roomId);
}

export function attachComposerHandler(
  container: HTMLElement,
  callbacks: ComposerCallbacks
): (roomId: string) => void {
  let currentRoomId = 'lobby';

  const form = container.querySelector('.composer-standalone');
  if (form instanceof HTMLFormElement) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = queryElement<HTMLInputElement>(form, '.composer-input');
      if (!input) {
        return;
      }
      const content = input.value.trim();
      if (content) {
        callbacks.onSend({ roomId: currentRoomId, content });
        input.value = '';
      }
    });
  }

  return (roomId: string) => {
    currentRoomId = roomId;
  };
}

export function showChatView(container: HTMLElement): void {
  container.style.display = 'flex';
}

export function hideChatView(container: HTMLElement): void {
  container.style.display = 'none';
}

export function clearChatView(container: HTMLElement): void {
  const messageList = queryElement<HTMLElement>(container, '.message-list');
  if (messageList) {
    clearMessageList(messageList);
  }
}
