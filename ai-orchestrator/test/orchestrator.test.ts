import { describe, expect, it } from 'vitest';

import type { BotMemory, ChatMessage, Participant } from 'shared';

import type { AIProvider } from '../src/providers/types.js';

import { Orchestrator } from '../src/index.js';

class RecordingProvider implements AIProvider {
  systemPrompt = '';

  async generate(input: { systemPrompt: string; userPrompt: string; model: string }) {
    this.systemPrompt = input.systemPrompt;
    return {
      reply: `Replying to: ${input.userPrompt}`,
      newMemories: [
        {
          fact: 'Taylor prefers concise tactical answers.',
          kind: 'preference' as const,
          importance: 0.9
        }
      ]
    };
  }
}

const bot: Participant = {
  id: 'bot-1',
  displayName: 'Orbit',
  kind: 'bot',
  ownerUserId: 'user-1',
  presence: 'online',
  botProfile: {
    id: 'profile-1',
    ownerUserId: 'user-1',
    memoryKey: 'lobby-taylor-orbit',
    provider: 'ollama',
    model: 'llama3.2',
    ollamaUrl: 'http://127.0.0.1:11434',
    personality: 'curious analyst',
    responseProbability: 1,
    minDelayMs: 1200,
    maxDelayMs: 2400,
    cooldownMs: 0
  }
};

const humanMessage: ChatMessage = {
  id: 'm-1',
  roomId: 'lobby',
  participantId: 'user-1',
  displayName: 'Taylor',
  content: 'hello there',
  createdAt: new Date().toISOString(),
  replyDepth: 0
};

const memories: BotMemory[] = [
  {
    id: 'memory-1',
    botId: 'bot-1',
    memoryKey: 'lobby-taylor-orbit',
    roomId: 'lobby',
    sourceMessageId: 'message-0',
    fact: 'Taylor likes short answers.',
    kind: 'preference',
    importance: 0.8,
    createdAt: new Date().toISOString()
  }
];

const recentMessages: ChatMessage[] = [
  {
    id: 'm-0',
    roomId: 'lobby',
    participantId: 'user-2',
    displayName: 'Jordan',
    content: 'We were talking about travel plans.',
    createdAt: new Date().toISOString(),
    replyDepth: 0
  },
  humanMessage
];

describe('orchestrator', () => {
  it('creates a bot reply plan for a human message', async () => {
    const provider = new RecordingProvider();
    const orchestrator = new Orchestrator(provider);
    const plan = await orchestrator.createReplyPlan({
      bot,
      incomingMessage: humanMessage,
      roomId: 'lobby',
      memories,
      recentMessages
    });

    expect(plan).not.toBeNull();
    expect(plan?.message.displayName).toBe('Orbit');
    expect(plan?.message.content).toContain('hello there');
    expect(plan?.newMemories).toHaveLength(1);
    expect(provider.systemPrompt).toContain('Recent conversation (latest 10 messages):');
    expect(provider.systemPrompt).toContain('Jordan: We were talking about travel plans.');
    expect(provider.systemPrompt).toContain('Known memories for this bot:');
    expect(provider.systemPrompt).toContain('Taylor likes short answers.');
  });

  it('prevents direct bot loops', () => {
    const orchestrator = new Orchestrator(new RecordingProvider());
    const decision = orchestrator.decide(bot, {
      ...humanMessage,
      participantId: 'bot-1'
    });

    expect(decision.shouldRespond).toBe(false);
    expect(decision.reason).toBe('prevent-bot-loop');
  });

  it('records which message the bot is replying to', async () => {
    const orchestrator = new Orchestrator(new RecordingProvider());
    const plan = await orchestrator.createReplyPlan({
      bot,
      incomingMessage: {
        ...humanMessage,
        participantId: 'bot-2',
        replyDepth: 2
      },
      roomId: 'lobby'
    });

    expect(plan?.message.replyToMessageId).toBe('m-1');
  });

  it('stops replying when the since-last-human ai cap is reached', async () => {
    const orchestrator = new Orchestrator(new RecordingProvider());
    const plan = await orchestrator.createReplyPlan({
      bot,
      incomingMessage: {
        ...humanMessage,
        participantId: 'bot-2',
        replyDepth: 3
      },
      roomId: 'lobby',
      maxAiResponses: 3
    });

    expect(plan).toBeNull();
  });
});
