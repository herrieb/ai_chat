import { describe, expect, it } from 'vitest';

import { addErrorNotice, createErrorNotice, createErrorNoticeContainer, removeErrorNotice } from '../components/error-notification.js';

describe('error notification', () => {
  it('renders a bot error notice with the server message', () => {
    const container = createErrorNoticeContainer();
    const notice = createErrorNotice(
      {
        id: 'error-1',
        category: 'ai_unavailable',
        severity: 'error',
        message: 'Your AI could not reach Ollama. Check that it is running and reachable.',
        retryable: true,
        timestamp: new Date().toISOString()
      },
      () => undefined
    );

    addErrorNotice(container, notice);

    expect(container.textContent).toContain('Your AI could not reach Ollama');
  });

  it('removes a rendered notice by id', () => {
    const container = createErrorNoticeContainer();
    const notice = createErrorNotice(
      {
        id: 'error-2',
        category: 'ai_response_failed',
        severity: 'error',
        message: 'Your AI could not generate a reply right now. Please try again.',
        retryable: true,
        timestamp: new Date().toISOString()
      },
      () => undefined
    );

    addErrorNotice(container, notice);
    removeErrorNotice(container, 'error-2');

    expect(container.childElementCount).toBe(0);
  });
});
