import { afterEach, describe, expect, it, vi } from 'vitest';

import { OllamaProvider } from '../src/providers/ollama.js';

describe('ollama provider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to plain generation when structured mode returns empty response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: '' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ response: 'Hello!' })
      });

    vi.stubGlobal('fetch', fetchMock);

    const provider = new OllamaProvider('https://example.com');
    const result = await provider.generate({
      systemPrompt: 'You are helpful.',
      userPrompt: 'Say hi.',
      model: 'test-model'
    });

    expect(result.reply).toBe('Hello!');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(firstBody.format).toBe('json');
    expect(secondBody.format).toBeUndefined();
  });
});
