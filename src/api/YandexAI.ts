import { requestUrl } from "obsidian";
import { AIClient, AIMessage, AIResponse } from "./types";

export interface YandexAISettings {
  apiKey: string;
  folderId: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  streamResponse: boolean;
}

// Keep ChatMessage alias for backward compat
export type ChatMessage = AIMessage;

export interface YandexAIResponse {
  result: {
    alternatives: Array<{
      message: { role: string; text: string };
      status: string;
    }>;
    usage: {
      inputTextTokens: string;
      completionTokens: string;
      totalTokens: string;
    };
    modelVersion: string;
  };
}

export const YANDEX_MODELS = [
  { id: "yandexgpt-lite", name: "YandexGPT Lite (быстрый)" },
  { id: "yandexgpt", name: "YandexGPT Pro (умный)" },
  { id: "yandexgpt-32k", name: "YandexGPT Pro 32k (длинный контекст)" },
  { id: "llama-lite", name: "Llama Lite" },
  { id: "llama", name: "Llama" },
];

export class YandexAIClient implements AIClient {
  private settings: YandexAISettings;
  private baseUrl = "https://llm.api.cloud.yandex.net/foundationModels/v1";

  constructor(settings: YandexAISettings) {
    this.settings = settings;
  }

  private getModelUri(): string {
    const model = this.settings.modelId;
    if (model.startsWith("gpt://") || model.startsWith("ds://")) return model;
    if (!this.settings.folderId) {
      throw new Error("Folder ID не указан. Откройте настройки плагина.");
    }
    return `gpt://${this.settings.folderId}/${model}/latest`;
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Api-Key ${this.settings.apiKey}`,
      ...(this.settings.folderId ? { "x-folder-id": this.settings.folderId } : {}),
    };
  }

  async complete(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.settings.apiKey) throw new Error("API ключ не задан.");

    const body = {
      modelUri: this.getModelUri(),
      completionOptions: {
        stream: false,
        temperature: this.settings.temperature,
        maxTokens: String(this.settings.maxTokens),
      },
      messages: messages.map((m) => ({ role: m.role, text: m.content })),
    };

    const response = await requestUrl({
      url: `${this.baseUrl}/completion`,
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      throw: false,
    });

    if (response.status !== 200) {
      let errorText = "";
      try {
        const err = response.json;
        errorText = err.message || err.error?.message || JSON.stringify(err);
      } catch { errorText = response.text || String(response.status); }
      throw new Error(`Ошибка API (${response.status}): ${errorText}`);
    }

    const data: YandexAIResponse = response.json;
    const alt = data.result?.alternatives?.[0];
    if (!alt) throw new Error("Пустой ответ от API");
    return {
      text: alt.message.text,
      inputTokens: parseInt(data.result.usage?.inputTextTokens || "0"),
      outputTokens: parseInt(data.result.usage?.completionTokens || "0"),
    };
  }

  async *completeStream(messages: AIMessage[]): AsyncGenerator<string> {
    const result = await this.complete(messages);
    yield result.text;
  }
}
