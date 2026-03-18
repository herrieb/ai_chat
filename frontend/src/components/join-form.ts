import type { JoinRoomPayload, AIProviderId } from '../types.js';
import { getStoredTheme } from '../theme.js';
import { checkOllamaHealth, fetchOllamaModels } from '../socket.js';

export interface JoinFormCallbacks {
  onJoin: (payload: JoinRoomPayload) => void;
}

type OllamaStatus = 'idle' | 'checking' | 'ready' | 'error';

function getFieldValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function createJoinForm(callbacks: JoinFormCallbacks): HTMLElement {
  const form = document.createElement('form');
  form.className = 'join-form';
  form.id = 'join-form';
  form.innerHTML = `
    <div class="setup-header">
      <div class="setup-icon">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
          <path d="M20 21v-2a4 4 0 0 0-3-3.87M4 21v-2a4 4 0 0 1 3-3.87"/>
          <circle cx="12" cy="17" r="4"/>
        </svg>
      </div>
      <h1 class="setup-title">Your AI Companion</h1>
      <p class="setup-subtitle">Set up your personal chat experience</p>
    </div>
    
    <div class="ollama-status" id="ollama-status">
      <span class="ollama-status__indicator ollama-status__indicator--idle"></span>
      <span class="ollama-status__text">Enter Ollama URL to begin</span>
    </div>
    
    <section class="form-section">
      <h2 class="section-title">About You</h2>
      <div class="form-field">
        <label for="display-name">Your Name</label>
        <input type="text" id="display-name" name="displayName" required placeholder="What should we call you?" autocomplete="nickname">
      </div>
      <div class="form-field">
        <label for="room-id">Room</label>
        <input type="text" id="room-id" name="roomId" required value="lobby" placeholder="lobby" autocomplete="off">
        <span class="form-hint">Join an existing room or create a new one</span>
      </div>
    </section>
    
    <section class="form-section">
      <h2 class="section-title">Your AI Companion</h2>
      <p class="section-desc">Create an AI partner that will chat with you in this room</p>
      
      <div class="form-field">
        <label for="bot-name">AI Name</label>
        <input type="text" id="bot-name" name="botName" required placeholder="Give your AI a name" autocomplete="off">
      </div>
      <div class="form-field">
        <label for="personality">Personality</label>
        <input type="text" id="personality" name="personality" required placeholder="e.g., Curious explorer, Witty friend" autocomplete="off">
        <span class="form-hint">Describe how your AI should behave</span>
      </div>
      <div class="form-field">
        <label for="ai-provider">AI Provider</label>
        <select id="ai-provider" name="aiProvider" required>
          <option value="ollama">Ollama</option>
        </select>
      </div>
      <div class="form-field">
        <label for="ollama-url">Ollama URL</label>
        <input type="url" id="ollama-url" name="ollamaUrl" required placeholder="http://localhost:11434" autocomplete="off">
        <span class="form-hint">The URL where your Ollama instance is running</span>
      </div>
      <div class="form-field">
        <label for="ollama-token">API Token <span class="form-optional">(optional)</span></label>
        <input type="password" id="ollama-token" name="ollamaToken" placeholder="Bearer token for authenticated Ollama" autocomplete="off">
        <span class="form-hint">Required only if your Ollama instance uses authentication</span>
      </div>
      <div class="form-field" id="ollama-model-field">
        <label for="ai-model">Model</label>
        <select id="ai-model" name="aiModel" required>
          <option value="">Select a model...</option>
        </select>
        <span class="form-hint model-hint" id="model-hint">Models will load after connecting to Ollama</span>
      </div>
    </section>
    
    <button type="submit" class="btn btn-primary btn-setup" id="join-btn" disabled>
      <span class="btn-text">Connect to Chat</span>
      <span class="btn-loading" hidden>
        <svg class="spinner" viewBox="0 0 24 24" width="20" height="20">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-linecap="round"/>
        </svg>
      </span>
    </button>
    
    <p class="setup-footer">
      <span class="setup-footer__icon">ℹ️</span>
      Your AI companion will remember conversations during this session
    </p>
  `;

  const statusEl = form.querySelector<HTMLElement>('#ollama-status')!;
  const indicator = statusEl.querySelector<HTMLElement>('.ollama-status__indicator')!;
  const statusText = statusEl.querySelector<HTMLElement>('.ollama-status__text')!;
  const urlInput = form.querySelector<HTMLInputElement>('#ollama-url')!;
  const tokenInput = form.querySelector<HTMLInputElement>('#ollama-token')!;
  const modelSelect = form.querySelector<HTMLSelectElement>('#ai-model')!;
  const modelHint = form.querySelector<HTMLElement>('#model-hint')!;
  const joinBtn = form.querySelector<HTMLButtonElement>('#join-btn')!;
  const btnText = joinBtn.querySelector<HTMLElement>('.btn-text')!;
  const btnLoading = joinBtn.querySelector<HTMLElement>('.btn-loading')!;

  function updateStatus(status: OllamaStatus, message?: string) {
    indicator.className = `ollama-status__indicator ollama-status__indicator--${status}`;
    if (message) {
      statusText.textContent = message;
    } else {
      switch (status) {
        case 'idle':
          statusText.textContent = 'Enter Ollama URL to begin';
          break;
        case 'checking':
          statusText.textContent = 'Connecting to Ollama...';
          break;
        case 'ready':
          statusText.textContent = 'Connected to Ollama';
          break;
        case 'error':
          statusText.textContent = 'Could not connect to Ollama';
          break;
      }
    }
    if (status !== 'ready') {
      joinBtn.disabled = true;
      joinBtn.classList.add('btn-disabled');
    } else {
      joinBtn.disabled = false;
      joinBtn.classList.remove('btn-disabled');
    }
  }

  async function checkAndFetchModels() {
    const url = urlInput.value.trim();
    if (!isValidUrl(url)) {
      updateStatus('idle');
      return;
    }

    updateStatus('checking');

    const config = {
      baseUrl: url,
      authToken: tokenInput.value.trim() || undefined
    };

    const health = await checkOllamaHealth(config);

    if (health.status === 'ok') {
      updateStatus('ready', 'Connected to Ollama');
      const modelsResponse = await fetchOllamaModels(config);

      modelSelect.innerHTML = '';
      if (modelsResponse.status === 'ok' && modelsResponse.models.length > 0) {
        modelHint.textContent = `${modelsResponse.models.length} models available`;
        modelHint.classList.remove('model-hint--error');
        modelsResponse.models.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model;
          modelSelect.appendChild(option);
        });
      } else {
        modelHint.textContent = modelsResponse.message || 'No models found';
        modelHint.classList.add('model-hint--error');
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No models available';
        modelSelect.appendChild(option);
      }
    } else {
      updateStatus('error', health.message);
      modelSelect.innerHTML = '';
      modelHint.textContent = 'Enter a valid Ollama URL to load models';
      modelHint.classList.add('model-hint--error');
    }
  }

  urlInput.addEventListener('blur', () => {
    if (isValidUrl(urlInput.value.trim())) {
      checkAndFetchModels();
    }
  });

  tokenInput.addEventListener('change', () => {
    if (isValidUrl(urlInput.value.trim())) {
      checkAndFetchModels();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = urlInput.value.trim();
    if (!isValidUrl(url) || !modelSelect.value) {
      if (!isValidUrl(url)) {
        urlInput.focus();
      } else if (!modelSelect.value) {
        modelSelect.focus();
      }
      return;
    }

    btnText.hidden = true;
    btnLoading.hidden = false;
    joinBtn.disabled = true;

    const data = new FormData(form);
    const payload: JoinRoomPayload = {
      displayName: getFieldValue(data, 'displayName'),
      botName: getFieldValue(data, 'botName'),
      personality: getFieldValue(data, 'personality'),
      aiProvider: getFieldValue(data, 'aiProvider') as AIProviderId,
      aiModel: getFieldValue(data, 'aiModel'),
      ollamaUrl: getFieldValue(data, 'ollamaUrl'),
      ollamaToken: getFieldValue(data, 'ollamaToken') || undefined,
      roomId: getFieldValue(data, 'roomId'),
      theme: getStoredTheme()
    };

    try {
      callbacks.onJoin(payload);
    } finally {
      btnText.hidden = false;
      btnLoading.hidden = true;
    }
  });

  return form;
}
