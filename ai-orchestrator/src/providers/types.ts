import { providerResponseSchema, type ProviderResponse } from 'shared';

export interface CompletionInput {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  baseUrl?: string;
  authToken?: string;
}

export interface AIProvider {
  generate(input: CompletionInput): Promise<ProviderResponse>;
}

export function parseProviderResponse(raw: string): ProviderResponse {
  try {
    const parsed = providerResponseSchema.safeParse(JSON.parse(raw));
    if (parsed.success) {
      return parsed.data;
    }
  } catch {
  }

  return {
    reply: raw.trim(),
    newMemories: []
  };
}
