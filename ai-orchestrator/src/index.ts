import {
  BOT_RESPONSE_MAX_DELAY_MS,
  BOT_RESPONSE_MIN_DELAY_MS,
  MAX_BOT_RESPONSES_PER_MESSAGE,
  type BotMemory,
  type BotDecision,
  type BotReplyPlan,
  type ChatMessage,
  type Participant
} from 'shared';

import type { AIProvider } from './providers/types.js';

import { OllamaProvider } from './providers/ollama.js';

export { OllamaProvider } from './providers/ollama.js';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function pickDelay(minDelayMs: number, maxDelayMs: number): number {
  const min = clamp(minDelayMs, BOT_RESPONSE_MIN_DELAY_MS, BOT_RESPONSE_MAX_DELAY_MS);
  const max = clamp(maxDelayMs, min, BOT_RESPONSE_MAX_DELAY_MS);
  return Math.round((min + max) / 2);
}

function formatMemories(memories: BotMemory[]): string {
  if (memories.length === 0) {
    return 'Known memories: none yet.';
  }

  return [
    'Known memories for this bot:',
    ...memories.map(
      (memory) =>
        `- [${memory.kind}] ${memory.fact} (importance ${memory.importance.toFixed(2)}, noted ${memory.createdAt})`
    )
  ].join('\n');
}

function formatRecentMessages(messages: ChatMessage[]): string {
  if (messages.length === 0) {
    return 'Recent conversation: none yet.';
  }

  return [
    'Recent conversation (latest 10 messages):',
    ...messages.map((message) => `- ${message.displayName}: ${message.content}`)
  ].join('\n');
}

function buildSystemPrompt(bot: Participant, memories: BotMemory[], recentMessages: ChatMessage[]): string {
  return [
    `You are ${bot.displayName}, a chat participant with the personality: ${bot.botProfile?.personality}.`,
    'Use the recent conversation to understand what people are discussing right now before you reply.',
    'The memory section contains durable notes from prior conversation. Use them only when relevant, and do not mention that they came from memory unless natural.',
    formatRecentMessages(recentMessages),
    formatMemories(memories),
    'Return strict JSON with this shape only: {"reply":"short natural chat reply","newMemories":[{"fact":"stable useful fact","kind":"identity|preference|relationship|goal|fact","importance":0.0}]}.',
    'Only add new memories for durable, useful facts worth keeping for later conversations. Keep the chat reply concise and human.'
  ].join('\n\n');
}

export class Orchestrator {
  private readonly provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  static createDefault(): Orchestrator {
    return new Orchestrator(new OllamaProvider());
  }

  decide(bot: Participant, message: ChatMessage, maxAiResponses = 1000): BotDecision {
    if (bot.kind !== 'bot' || !bot.botProfile) {
      return { shouldRespond: false, reason: 'not-a-bot', delayMs: 0 };
    }

    if (MAX_BOT_RESPONSES_PER_MESSAGE < 1) {
      return { shouldRespond: false, reason: 'responses-disabled', delayMs: 0 };
    }

    if (message.participantId === bot.id) {
      return { shouldRespond: false, reason: 'prevent-bot-loop', delayMs: 0 };
    }

    if (message.replyDepth >= maxAiResponses) {
      return { shouldRespond: false, reason: 'max-ai-replies-reached', delayMs: 0 };
    }

    return {
      shouldRespond: true,
      reason: 'mvp-always-respond',
      delayMs: pickDelay(bot.botProfile.minDelayMs, bot.botProfile.maxDelayMs)
    };
  }

  async createReplyPlan(args: {
    bot: Participant;
    incomingMessage: ChatMessage;
    roomId: string;
    memories?: BotMemory[];
    recentMessages?: ChatMessage[];
    maxAiResponses?: number;
  }): Promise<BotReplyPlan | null> {
    const decision = this.decide(args.bot, args.incomingMessage, args.maxAiResponses ?? 1000);

    if (!decision.shouldRespond || !args.bot.botProfile) {
      return null;
    }

    const response = await this.provider.generate({
      systemPrompt: buildSystemPrompt(args.bot, args.memories ?? [], args.recentMessages ?? []),
      userPrompt: args.incomingMessage.content,
      model: args.bot.botProfile.model,
      baseUrl: args.bot.botProfile.ollamaUrl,
      authToken: args.bot.botProfile.ollamaToken
    });

    return {
      delayMs: decision.delayMs,
      message: {
        id: crypto.randomUUID(),
        roomId: args.roomId,
        participantId: args.bot.id,
        displayName: args.bot.displayName,
        content: response.reply,
        createdAt: new Date().toISOString(),
        replyDepth: args.incomingMessage.replyDepth + 1,
        replyToMessageId: args.incomingMessage.id
      },
      newMemories: response.newMemories
    };
  }
}
