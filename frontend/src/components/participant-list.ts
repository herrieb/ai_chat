import type { Participant } from '../types.js';

export function createParticipantList(): HTMLElement {
  const container = document.createElement('aside');
  container.className = 'participant-list';
  container.innerHTML = '<h3 class="participant-title">Participants</h3><ul class="participant-items"></ul>';
  return container;
}

export function updateParticipantList(container: HTMLElement, participants: Participant[]): void {
  const list = container.querySelector('.participant-items');
  if (!list) return;

  const online = participants.filter((p) => p.presence === 'online');
  list.innerHTML = online
    .map(
      (p) => `
    <li class="participant-item">
      <span class="participant-avatar">${getInitials(p.displayName)}</span>
      <span class="participant-name">${escapeHtml(p.displayName)}</span>
    </li>
  `
    )
    .join('');
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
