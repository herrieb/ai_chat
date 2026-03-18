import './styles.css';

import { createChatView, updateChatView, attachComposerHandler, showChatView, hideChatView, type ChatViewCallbacks } from './components/chat-view.js';
import { createJoinForm } from './components/join-form.js';
import { createErrorNoticeContainer, createErrorNotice, addErrorNotice, removeErrorNotice, type ErrorNoticeCallbacks } from './components/error-notification.js';
import { createMemoryInspector, showMemoryInspector, hideMemoryInspector } from './components/memory-inspector.js';
import type { AppState, RoomState, OwnedBotInfo } from './state.js';
import { createInitialState, updateStateFromRoomState, updateTypingState } from './state.js';
import { joinRoom, sendMessage, onRoomState, onBotError, retryBot, closeRoom, onRoomClosed, onParticipantTyping } from './socket.js';
import { applyTheme, getStoredTheme } from './theme.js';
import type { JoinRoomPayload, SendMessagePayload, BotErrorEvent, RoomClosedEvent } from './types.js';

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
  joinScreen.id = 'join-screen';
  joinScreen.appendChild(
    createJoinForm({
      onJoin: (payload: JoinRoomPayload) => {
        ownedBotInfo = {
          botName: payload.botName,
          memoryKey: deriveMemoryKey(payload.displayName, payload.roomId, payload.botName)
        };

        // CRITICAL: Set currentRoomId BEFORE joinRoom to prevent message-send race
        currentRoomId = payload.roomId;

        state = {
          ...state,
          joined: true,
          roomId: payload.roomId,
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
    onOpenMemoryInspector: openMemoryInspector,
    onCloseRoom: () => {
      if (currentRoomId) {
        closeRoom({ roomId: currentRoomId });
      }
    }
  };

  const chatView = createChatView(chatViewCallbacks);
  hideChatView(chatView);

  setComposerRoom = attachComposerHandler(chatView, {
    onSend: (payload: SendMessagePayload) => sendMessage({ ...payload, roomId: currentRoomId })
  });

  app.appendChild(chatView);

  const unsubscribeRoom = onRoomState((room: RoomState) => {
    state = updateStateFromRoomState(state, room, state.displayName);
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

  const unsubscribeTyping = onParticipantTyping((event) => {
    if (event.roomId !== currentRoomId) {
      return;
    }

    state = updateTypingState(state, {
      participantId: event.participantId,
      displayName: event.displayName,
      isTyping: event.isTyping
    });
    updateChatView(chatView, state, setComposerRoom);
  });

  window.addEventListener('beforeunload', () => {
    unsubscribeRoom();
    unsubscribeBotError();
    unsubscribeTyping();
    unsubscribeRoomClosed();
  });

  function handleRoomClosed(event: RoomClosedEvent) {
    hideChatView(chatView);
    state = createInitialState();
    currentRoomId = 'lobby';
    showJoinScreen(joinScreen);
  }

  const unsubscribeRoomClosed = onRoomClosed(handleRoomClosed);
}

function showJoinScreen(screen: HTMLElement): void {
  screen.style.opacity = '1';
  screen.style.pointerEvents = 'auto';
  if (!document.body.contains(screen)) {
    const app = document.querySelector<HTMLDivElement>('#app');
    if (app) {
      app.appendChild(screen);
    }
  }
}

function hideJoinScreen(screen: HTMLElement): void {
  screen.style.opacity = '0';
  screen.style.pointerEvents = 'none';
  setTimeout(() => screen.remove(), 300);
}

document.addEventListener('DOMContentLoaded', init);
