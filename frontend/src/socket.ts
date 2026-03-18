import { io, type Socket } from 'socket.io-client';
import type { JoinRoomPayload, RoomState, SendMessagePayload, BotErrorEvent, OllamaHealthResponse, OllamaModelsResponse, MemoryLedgerResponse, BotRetryPayload, OllamaConnectionConfig, CloseRoomPayload, RoomClosedEvent, RoomListResponse } from './types.js';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      autoConnect: true
    });
  }
  return socket;
}

export function joinRoom(payload: JoinRoomPayload): void {
  getSocket().emit('room:join', payload);
}

export function sendMessage(payload: SendMessagePayload): void {
  getSocket().emit('message:send', payload);
}

export function retryBot(payload: BotRetryPayload): void {
  getSocket().emit('bot:retry', payload);
}

export async function checkOllamaHealth(config: OllamaConnectionConfig): Promise<OllamaHealthResponse> {
  try {
    const response = await fetch('/api/ollama/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!response.ok) {
      return { status: 'unavailable', message: `HTTP ${response.status}` };
    }
    return await response.json();
  } catch {
    return { status: 'unavailable', message: 'Cannot connect to Ollama' };
  }
}

export async function fetchOllamaModels(config: OllamaConnectionConfig): Promise<OllamaModelsResponse> {
  try {
    const response = await fetch('/api/ollama/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (!response.ok) {
      return { status: 'unavailable', message: `HTTP ${response.status}`, models: [] };
    }
    return await response.json();
  } catch {
    return { status: 'unavailable', message: 'Cannot fetch models', models: [] };
  }
}

export async function fetchMemory(memoryKey: string): Promise<MemoryLedgerResponse> {
  try {
    const response = await fetch(`/api/memory/${encodeURIComponent(memoryKey)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch {
    throw new Error('Failed to fetch memory');
  }
}

export function onRoomState(handler: (state: RoomState) => void): () => void {
  const sock = getSocket();
  sock.on('room:state', handler);
  return () => sock.off('room:state', handler);
}

export function onBotError(handler: (error: BotErrorEvent) => void): () => void {
  const sock = getSocket();
  sock.on('bot:error', handler);
  return () => sock.off('bot:error', handler);
}

export function closeRoom(payload: CloseRoomPayload): void {
  getSocket().emit('room:close', payload);
}

export function onRoomClosed(handler: (event: RoomClosedEvent) => void): () => void {
  const sock = getSocket();
  sock.on('room:closed', handler);
  return () => sock.off('room:closed', handler);
}

export async function fetchRooms(): Promise<RoomListResponse> {
  try {
    const response = await fetch('/api/rooms');
    if (!response.ok) {
      return { rooms: [] };
    }
    return await response.json();
  } catch {
    return { rooms: [] };
  }
}

export function disconnect(): void {
  socket?.disconnect();
  socket = null;
}
