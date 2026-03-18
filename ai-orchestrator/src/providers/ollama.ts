import type { AIProvider, CompletionInput } from './types.js';

import { parseProviderResponse } from './types.js';
import { ollamaConnectionConfigSchema, ollamaHealthResponseSchema, ollamaModelsResponseSchema, type OllamaConnectionConfig, type OllamaHealthResponse, type OllamaModelsResponse } from 'shared';

export class OllamaProvider implements AIProvider {
  private readonly defaultBaseUrl?: string;
  private readonly defaultAuthToken?: string;

  constructor(baseUrl = process.env.OLLAMA_URL, authToken = process.env.OLLAMA_TOKEN) {
    this.defaultBaseUrl = baseUrl;
    this.defaultAuthToken = authToken;
  }

  async generate(input: CompletionInput) {
    const connection = this.resolveConnection({
      baseUrl: input.baseUrl,
      authToken: input.authToken
    });
    const response = await fetch(`${connection.baseUrl}/api/generate`, {
      method: 'POST',
      headers: this.buildHeaders(connection.authToken),
      body: JSON.stringify({
        model: input.model,
        prompt: `${input.systemPrompt}\n\n${input.userPrompt}`,
        format: 'json',
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}.`);
    }

    const data = (await response.json()) as { response?: string };
    if (!data.response?.trim()) {
      throw new Error('Ollama returned an empty response payload.');
    }

    return parseProviderResponse(data.response);
  }

  async ping(config?: OllamaConnectionConfig): Promise<OllamaHealthResponse> {
    try {
      const connection = this.resolveConnection(config);
      const response = await fetch(`${connection.baseUrl}/api/tags`, {
        headers: this.buildHeaders(connection.authToken)
      });

      if (!response.ok) {
        return ollamaHealthResponseSchema.parse({
          status: 'unavailable',
          message: 'Ollama is not responding normally.'
        });
      }

      return ollamaHealthResponseSchema.parse({
        status: 'ok',
        message: 'Ollama is reachable.'
      });
    } catch (error) {
      return ollamaHealthResponseSchema.parse({
        status: 'unavailable',
        message: this.toConnectionErrorMessage(error)
      });
    }
  }

  async listModels(config?: OllamaConnectionConfig): Promise<OllamaModelsResponse> {
    try {
      const connection = this.resolveConnection(config);
      const response = await fetch(`${connection.baseUrl}/api/tags`, {
        headers: this.buildHeaders(connection.authToken)
      });

      if (!response.ok) {
        return ollamaModelsResponseSchema.parse({
          status: 'unavailable',
          message: 'Could not load models from Ollama.',
          models: []
        });
      }

      const data = (await response.json()) as { models?: Array<{ name?: string }> };
      const models = (data.models ?? [])
        .map((model) => model.name?.trim())
        .filter((name): name is string => Boolean(name));

      return ollamaModelsResponseSchema.parse({
        status: 'ok',
        message: models.length > 0 ? 'Models loaded.' : 'No Ollama models available yet.',
        models
      });
    } catch (error) {
      return ollamaModelsResponseSchema.parse({
        status: 'unavailable',
        message: this.toConnectionErrorMessage(error),
        models: []
      });
    }
  }

  private resolveConnection(config?: Partial<OllamaConnectionConfig>): OllamaConnectionConfig {
    const baseUrl = config?.baseUrl ?? this.defaultBaseUrl;
    if (!baseUrl) {
      throw new Error('An Ollama URL is required for runtime AI responses.');
    }

    return ollamaConnectionConfigSchema.parse({
      baseUrl,
      authToken: config?.authToken ?? this.defaultAuthToken
    });
  }

  private buildHeaders(authToken?: string): HeadersInit {
    return authToken
      ? {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        }
      : {
          'Content-Type': 'application/json'
        };
  }

  private toConnectionErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.includes('URL')) {
      return 'Enter a valid Ollama URL.';
    }

    return 'Could not connect to Ollama.';
  }
}
