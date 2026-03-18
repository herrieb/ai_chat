import { beforeEach, describe, expect, it, vi } from 'vitest';

import { attachComposerHandler, createChatView } from '../components/chat-view.js';

describe('chat view composer wiring', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false
    }));
  });

  it('submits the current room id through the room-aware handler', () => {
    const onSend = vi.fn();
    const view = createChatView({
      onSendMessage: () => undefined,
      onToggleTheme: () => undefined
    });

    const setRoom = attachComposerHandler(view, { onSend });
    setRoom('strategy-room');

    const form = view.querySelector<HTMLFormElement>('.composer-standalone');
    const input = view.querySelector<HTMLInputElement>('.composer-input');

    expect(form).toBeTruthy();
    expect(input).toBeTruthy();

    if (!form || !input) {
      return;
    }

    input.value = 'hello world';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(onSend).toHaveBeenCalledWith({ roomId: 'strategy-room', content: 'hello world' });
    expect(input.value).toBe('');
  });
});
