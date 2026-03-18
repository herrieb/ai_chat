import './styles.css';

import { createChatView, updateChatView, attachComposerHandler, showChatView, hideChatView, type ChatViewCallbacks } from './components/chat-view.js';
import { createJoinForm } from './components/join-form.js';
import { createErrorNoticeContainer, createErrorNotice, addErrorNotice, removeErrorNotice, type ErrorNoticeCallbacks } from './components/error-notification.js';
import { createMemoryInspector, showMemoryInspector, hideMemoryInspector } from './components/memory-inspector.js';
import type { AppState, RoomState, OwnedBotInfo } from './state.js';
import { createInitialState, updateStateFromRoomState } from './state.js';
import { joinRoom, sendMessage, onRoomState, onBotError, retryBot } from './socket.js';
import { applyTheme, getStoredTheme } from './theme.js';
import type { JoinRoomPayload, SendMessagePayload, BotErrorEvent } from './types.js';

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function deriveMemoryKey(displayName: string, roomId: string, botName: string): string {
  return [roomId, displayName, botName].map(slugify).join('-');
}

function init(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) {
    console.error('App container not found');
    return;
  }

  app.innerHTML = '';
  app.className = 'app';
  applyTheme(getStoredTheme());

  const errorContainer = createErrorNoticeContainer();
  app.appendChild(errorContainer);

  let state: AppState = createInitialState();
  let currentRoomId = 'lobby';
  let memoryInspectorEl: HTMLElement | null = null;
  let ownedBotInfo: OwnedBotInfo | null = null;

  const joinScreen = document.createElement('div');
  joinScreen.className = 'join-screen';
  joinScreen.appendChild(
    createJoinForm({
      onJoin: (payload: JoinRoomPayload) => {
        ownedBotInfo = {
          botName: payload.botName,
          memoryKey: deriveMemoryKey(payload.displayName, payload.roomId, payload.botName)
        };

        state = {
          ...state,
          joined: true,
          displayName: payload.displayName,
          ownedBot: ownedBotInfo
        };
        joinRoom(payload);
        showChatView(chatView);
        hideJoinScreen(joinScreen);
      }
    })
  );
  app.appendChild(joinScreen);

  let setComposerRoom: (roomId: string) => void;

  function openMemoryInspector(botName: string, memoryKey: string) {
    if (memoryInspectorEl) {
      hideMemoryInspector(memoryInspectorEl);
    }
    const inspector = createMemoryInspector(botName, memoryKey, {
      onClose: () => {
        if (memoryInspectorEl) {
          hideMemoryInspector(memoryInspectorEl);
          memoryInspectorEl = null;
        }
      }
    });
    memoryInspectorEl = inspector;
    if (app) {
      showMemoryInspector(app, inspector);
    }
  }

  const chatViewCallbacks: ChatViewCallbacks = {
    onSendMessage: (payload: SendMessagePayload) => {
      if (payload.roomId) {
        sendMessage(payload);
      }
    },
    onToggleTheme: () => undefined,
    onOpenMemoryInspector: openMemoryInspector
  };

  const chatView = createChatView(chatViewCallbacks);
  hideChatView(chatView);

  setComposerRoom = attachComposerHandler(chatView, {
    onSend: (payload: SendMessagePayload) => sendMessage({ ...payload, roomId: currentRoomId })
  });

  app.appendChild(chatView);

  const unsubscribeRoom = onRoomState((room: RoomState) => {
    state = updateStateFromRoomState(state, room);
    currentRoomId = room.roomId;
    if (ownedBotInfo) {
      state.ownedBot = ownedBotInfo;
    }
    updateChatView(chatView, state, setComposerRoom);
  });

  const errorCallbacks: ErrorNoticeCallbacks = {
    onRetry: (roomId: string) => retryBot({ roomId }),
    roomId: currentRoomId
  };

  const unsubscribeBotError = onBotError((error: BotErrorEvent) => {
    const notice = createErrorNotice(
      error,
      (id) => removeErrorNotice(errorContainer, id),
      { ...errorCallbacks, roomId: currentRoomId }
    );
    addErrorNotice(errorContainer, notice);
  });

  window.addEventListener('beforeunload', () => {
    unsubscribeRoom();
    unsubscribeBotError();
  });
}

function hideJoinScreen(screen: HTMLElement): void {
  screen.style.opacity = '0';
  screen.style.pointerEvents = 'none';
  setTimeout(() => screen.remove(), 300);
}

document.addEventListener('DOMContentLoaded', init);
