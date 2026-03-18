import type { JoinRoomPayload, AIProviderId, RoomSummary } from '../types.js';
import { getStoredTheme } from '../theme.js';
import { checkOllamaHealth, fetchOllamaModels, fetchRooms } from '../socket.js';

export interface JoinFormCallbacks {
  onJoin: (payload: JoinRoomPayload) => void;
}

interface Step1Data {
  displayName: string;
  botName: string;
  personality: string;
  aiProvider: AIProviderId;
  aiModel: string;
  ollamaUrl: string;
  ollamaToken?: string;
}

type OllamaStatus = 'idle' | 'checking' | 'ready' | 'error';
type RoomMode = 'create' | 'join';

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function createJoinForm(callbacks: JoinFormCallbacks): HTMLElement {
  const container = document.createElement('div');
  container.className = 'join-form-wizard';

  let step1Data: Step1Data | null = null;
  let currentStep = 1;

  const headerHtml = `
    <div class="setup-header">
      <div class="setup-icon">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/>
          <path d="M20 21v-2a4 4 0 0 0-3-3.87M4 21v-2a4 4 0 0 1 3-3.87"/>
          <circle cx="12" cy="17" r="4"/>
        </svg>
      </div>
      <h1 class="setup-title">AI Companion Setup</h1>
      <p class="setup-subtitle">Create your personal AI chat experience</p>
    </div>
  `;

  const stepIndicatorHtml = `
    <div class="wizard-steps">
      <div class="wizard-step" data-step="1">
        <span class="wizard-step__number">1</span>
        <span class="wizard-step__label">You & Your AI</span>
      </div>
      <div class="wizard-step" data-step="2">
        <span class="wizard-step__number">2</span>
        <span class="wizard-step__label">Choose a Room</span>
      </div>
    </div>
  `;

  container.innerHTML = `
    ${headerHtml}
    ${stepIndicatorHtml}
    <div class="wizard-content" id="wizard-content"></div>
    <div class="wizard-footer" id="wizard-footer"></div>
  `;

  const contentEl = container.querySelector<HTMLElement>('#wizard-content')!;
  const footerEl = container.querySelector<HTMLElement>('#wizard-footer')!;

  function updateStepIndicator(step: number) {
    const steps = container.querySelectorAll('.wizard-step');
    steps.forEach(s => {
      const stepNum = parseInt(s.getAttribute('data-step') || '0');
      s.classList.remove('wizard-step--active', 'wizard-step--completed');
      if (stepNum === step) {
        s.classList.add('wizard-step--active');
      } else if (stepNum < step) {
        s.classList.add('wizard-step--completed');
      }
    });
  }

  function renderStep1(): void {
    contentEl.innerHTML = `
      <form id="step1-form" class="join-form">
        <section class="form-section">
          <h2 class="section-title">About You</h2>
          <div class="form-field">
            <label for="display-name">Your Name</label>
            <input type="text" id="display-name" name="displayName" required placeholder="What should we call you?" autocomplete="nickname">
          </div>
        </section>

        <section class="form-section">
          <h2 class="section-title">Your AI Companion</h2>
          <p class="section-desc">Create an AI partner that will chat with you</p>

          <div class="form-field">
            <label for="bot-name">AI Name</label>
            <input type="text" id="bot-name" name="botName" required placeholder="Give your AI a name" autocomplete="off">
          </div>
          <div class="form-field">
            <label for="personality">Personality</label>
            <input type="text" id="personality" name="personality" required placeholder="e.g., Curious explorer, Witty friend" autocomplete="off">
            <span class="form-hint">Describe how your AI should behave</span>
          </div>
        </section>

        <section class="form-section">
          <h2 class="section-title">AI Connection</h2>
          <div class="ollama-status" id="ollama-status">
            <span class="ollama-status__indicator ollama-status__indicator--idle"></span>
            <span class="ollama-status__text">Enter Ollama URL to begin</span>
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
      </form>
    `;

    footerEl.innerHTML = `
      <button type="button" class="btn btn-primary btn-setup" id="step1-next-btn" disabled>
        <span class="btn-text">Next: Choose Room</span>
        <span class="btn-loading" hidden>
          <svg class="spinner" viewBox="0 0 24 24" width="20" height="20">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-linecap="round"/>
          </svg>
        </span>
      </button>
    `;

    const form = contentEl.querySelector<HTMLFormElement>('#step1-form')!;
    const nextBtn = footerEl.querySelector<HTMLButtonElement>('#step1-next-btn')!;
    const btnText = nextBtn.querySelector<HTMLElement>('.btn-text')!;
    const btnLoading = nextBtn.querySelector<HTMLElement>('.btn-loading')!;
    const displayNameInput = form.querySelector<HTMLInputElement>('#display-name')!;
    const botNameInput = form.querySelector<HTMLInputElement>('#bot-name')!;
    const personalityInput = form.querySelector<HTMLInputElement>('#personality')!;
    const urlInput = form.querySelector<HTMLInputElement>('#ollama-url')!;
    const tokenInput = form.querySelector<HTMLInputElement>('#ollama-token')!;
    const modelSelect = form.querySelector<HTMLSelectElement>('#ai-model')!;
    const modelHint = form.querySelector<HTMLElement>('#model-hint')!;
    const statusEl = form.querySelector<HTMLElement>('#ollama-status')!;
    const indicator = statusEl.querySelector<HTMLElement>('.ollama-status__indicator')!;
    const statusText = statusEl.querySelector<HTMLElement>('.ollama-status__text')!;

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
      validateForm();
    }

    function validateForm(): boolean {
      const displayName = displayNameInput.value.trim();
      const botName = botNameInput.value.trim();
      const personality = personalityInput.value.trim();
      const url = urlInput.value.trim();
      const model = modelSelect.value;

      const isValid = displayName && botName && personality && isValidUrl(url) && model;
      nextBtn.disabled = !isValid;
      nextBtn.classList.toggle('btn-disabled', !isValid);
      return !!isValid;
    }

    [displayNameInput, botNameInput, personalityInput].forEach(input => {
      input.addEventListener('input', validateForm);
    });

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
          modelSelect.addEventListener('change', validateForm);
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

    nextBtn.addEventListener('click', () => {
      if (!validateForm()) {
        if (!displayNameInput.value.trim()) {
          displayNameInput.focus();
        } else if (!botNameInput.value.trim()) {
          botNameInput.focus();
        } else if (!personalityInput.value.trim()) {
          personalityInput.focus();
        } else if (!isValidUrl(urlInput.value.trim())) {
          urlInput.focus();
        } else if (!modelSelect.value) {
          modelSelect.focus();
        }
        return;
      }

      btnText.hidden = true;
      btnLoading.hidden = false;
      nextBtn.disabled = true;

      step1Data = {
        displayName: displayNameInput.value.trim(),
        botName: botNameInput.value.trim(),
        personality: personalityInput.value.trim(),
        aiProvider: 'ollama',
        aiModel: modelSelect.value,
        ollamaUrl: urlInput.value.trim(),
        ollamaToken: tokenInput.value.trim() || undefined
      };

      currentStep = 2;
      updateStepIndicator(2);
      renderStep2();
    });
  }

  let currentRoomMode: RoomMode = 'create';
  let selectedRoomId: string | null = null;

  function renderStep2(): void {
    contentEl.innerHTML = `
      <div class="join-form">
        <section class="form-section">
          <h2 class="section-title">Available Rooms</h2>
          <div class="room-mode-toggle">
            <button type="button" class="room-mode-btn room-mode-btn--active" data-mode="create">Create New</button>
            <button type="button" class="room-mode-btn" data-mode="join">Join Existing</button>
          </div>

          <div class="room-create-section" id="room-create-section">
            <div class="form-field">
              <label for="room-id">Room Name</label>
              <input type="text" id="room-id" name="roomId" placeholder="my-awesome-room" autocomplete="off">
              <span class="form-hint">Choose a unique name for your room</span>
            </div>
          </div>

          <div class="room-browser-section" id="room-browser-section" hidden>
            <div class="room-browser-header">
              <span class="room-browser-title">Open Lobbies</span>
              <button type="button" class="room-browser-refresh" id="refresh-rooms-btn" title="Refresh rooms">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 4v6h6M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
              </button>
            </div>
            <div class="room-browser-list" id="room-browser-list">
              <div class="room-browser-loading">
                <span>Loading rooms...</span>
              </div>
            </div>
          </div>
        </section>

        <section class="form-section room-summary-section" id="room-summary-section">
          <div class="room-summary" id="room-summary">
            <span class="room-summary__text">No room selected</span>
          </div>
        </section>
      </div>
    `;

    footerEl.innerHTML = `
      <button type="button" class="btn btn-secondary btn-back" id="step2-back-btn">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </button>
      <button type="button" class="btn btn-primary btn-setup" id="join-btn" disabled>
        <span class="btn-text">Join Room</span>
        <span class="btn-loading" hidden>
          <svg class="spinner" viewBox="0 0 24 24" width="20" height="20">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-linecap="round"/>
          </svg>
        </span>
      </button>
    `;

    const backBtn = footerEl.querySelector<HTMLButtonElement>('#step2-back-btn')!;
    const joinBtn = footerEl.querySelector<HTMLButtonElement>('#join-btn')!;
    const btnText = joinBtn.querySelector<HTMLElement>('.btn-text')!;
    const btnLoading = joinBtn.querySelector<HTMLElement>('.btn-loading')!;
    const roomIdInput = contentEl.querySelector<HTMLInputElement>('#room-id')!;
    const roomCreateSection = contentEl.querySelector<HTMLElement>('#room-create-section')!;
    const roomBrowserSection = contentEl.querySelector<HTMLElement>('#room-browser-section')!;
    const roomBrowserList = contentEl.querySelector<HTMLElement>('#room-browser-list')!;
    const refreshRoomsBtn = contentEl.querySelector<HTMLButtonElement>('#refresh-rooms-btn')!;
    const modeButtons = contentEl.querySelectorAll<HTMLButtonElement>('.room-mode-btn');
    const roomSummary = contentEl.querySelector<HTMLElement>('#room-summary')!;

    function updateRoomSummary(mode: RoomMode, roomId: string | null, roomName?: string) {
      if (mode === 'create') {
        const name = roomId || 'lobby';
        roomSummary.innerHTML = `<span class="room-summary__text">Creating room: <strong>${escapeHtml(name)}</strong></span>`;
      } else if (roomId) {
        roomSummary.innerHTML = `<span class="room-summary__text">Joining room: <strong>${escapeHtml(roomId)}</strong></span>`;
      } else {
        roomSummary.innerHTML = `<span class="room-summary__text">Select a room or switch to create one</span>`;
      }
    }

    function validateRoomSelection(): boolean {
      if (currentRoomMode === 'create') {
        return true;
      }
      return selectedRoomId !== null;
    }

    function updateJoinButton() {
      const isValid = validateRoomSelection();
      joinBtn.disabled = !isValid;
      joinBtn.classList.toggle('btn-disabled', !isValid);
    }

    function setRoomMode(mode: RoomMode) {
      currentRoomMode = mode;
      selectedRoomId = null;

      modeButtons.forEach((btn: HTMLButtonElement) => {
        btn.classList.toggle('room-mode-btn--active', btn.dataset.mode === mode);
      });

      if (mode === 'create') {
        roomCreateSection.hidden = false;
        roomBrowserSection.hidden = true;
        updateRoomSummary('create', roomIdInput.value.trim() || 'lobby');
      } else {
        roomCreateSection.hidden = true;
        roomBrowserSection.hidden = false;
        updateRoomSummary('join', null);
        loadRooms();
      }
      updateJoinButton();
    }

    function selectRoom(roomId: string) {
      selectedRoomId = roomId;
      const items = roomBrowserList.querySelectorAll('.room-item');
      items.forEach(item => {
        item.classList.toggle('room-item--selected', item.getAttribute('data-room-id') === roomId);
      });
      updateRoomSummary('join', roomId);
      updateJoinButton();
    }

    async function loadRooms() {
      roomBrowserList.innerHTML = '<div class="room-browser-loading"><span>Loading rooms...</span></div>';

      try {
        const response = await fetchRooms();
        renderRoomList(response.rooms);
      } catch {
        roomBrowserList.innerHTML = '<div class="room-browser-empty"><span>Could not load rooms</span></div>';
      }
    }

    function renderRoomList(rooms: RoomSummary[]) {
      const activeRooms = rooms.filter(r => r.status === 'active');

      if (activeRooms.length === 0) {
        roomBrowserList.innerHTML = '<div class="room-browser-empty"><span>No open rooms available. Create one!</span></div>';
        return;
      }

      roomBrowserList.innerHTML = '';
      activeRooms.forEach(room => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'room-item';
        item.dataset.roomId = room.roomId;

        const participantIcons = [];
        for (let i = 0; i < room.humanCount; i++) participantIcons.push('<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M12 14c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z"/></svg>');
        for (let i = 0; i < room.botCount; i++) participantIcons.push('<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><rect x="3" y="8" width="18" height="12" rx="2"/><circle cx="9" cy="13" r="2"/><circle cx="15" cy="13" r="2"/></svg>');

        item.innerHTML = `
          <div class="room-item__info">
            <span class="room-item__name">${escapeHtml(room.roomId)}</span>
            <span class="room-item__owner">by ${escapeHtml(room.ownerDisplayName)}</span>
          </div>
          <div class="room-item__meta">
            <span class="room-item__participants">${participantIcons.join('')}</span>
          </div>
        `;

        item.addEventListener('click', () => selectRoom(room.roomId));
        roomBrowserList.appendChild(item);
      });
    }

    modeButtons.forEach((btn: HTMLButtonElement) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode as RoomMode;
        setRoomMode(mode);
      });
    });

    refreshRoomsBtn.addEventListener('click', loadRooms);

    roomIdInput.addEventListener('input', () => {
      updateRoomSummary('create', roomIdInput.value.trim() || 'lobby');
      updateJoinButton();
    });

    backBtn.addEventListener('click', () => {
      currentStep = 1;
      updateStepIndicator(1);
      renderStep1();
    });

    joinBtn.addEventListener('click', () => {
      if (!validateRoomSelection()) {
        return;
      }

      btnText.hidden = true;
      btnLoading.hidden = true;
      joinBtn.disabled = true;

      const finalRoomId = currentRoomMode === 'create'
        ? (roomIdInput.value.trim() || 'lobby')
        : selectedRoomId!;

      const payload: JoinRoomPayload = {
        ...step1Data!,
        roomId: finalRoomId,
        theme: getStoredTheme()
      };

      callbacks.onJoin(payload);
    });

    setRoomMode('create');
  }

  updateStepIndicator(1);
  renderStep1();

  return container;
}
