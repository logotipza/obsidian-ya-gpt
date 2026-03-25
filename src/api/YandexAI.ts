export interface YandexAISettings {
  apiKey: string;
  folderId: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  streamResponse: boolean;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  text: string;
}

export interface YandexAIResponse {
  result: {
    alternatives: Array<{
      message: {
        role: string;
        text: string;
      };
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
  { id: "yandexgpt-lite", name: "YandexGPT Lite (быстрый)", description: "Лёгкая и быстрая модель" },
  { id: "yandexgpt", name: "YandexGPT Pro (умный)", description: "Мощная модель для сложных задач" },
  { id: "yandexgpt-32k", name: "YandexGPT Pro 32k (длинный контекст)", description: "Для работы с большими текстами" },
  { id: "llama-lite", name: "Llama Lite", description: "Llama в Яндекс облаке" },
  { id: "llama", name: "Llama", description: "Llama большая модель" },
];

export class YandexAIClient {
  private settings: YandexAISettings;
  private baseUrl = "https://llm.api.cloud.yandex.net/foundationModels/v1";

  constructor(settings: YandexAISettings) {
    this.settings = settings;
  }

  private getModelUri(): string {
    const model = this.settings.modelId;
    // Check if it's already a full URI
    if (model.startsWith("gpt://") || model.startsWith("ds://")) {
      return model;
    }
    // Construct URI from folder ID and model name
    if (this.settings.folderId) {
      return `gpt://${this.settings.folderId}/${model}/latest`;
    }
    return `gpt://b1g1s10eotlxdm68uy6n/${model}/latest`;
  }

  async complete(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
    if (!this.settings.apiKey) {
      throw new Error("API ключ не задан. Откройте настройки плагина.");
    }

    const body = {
      modelUri: this.getModelUri(),
      completionOptions: {
        stream: false,
        temperature: this.settings.temperature,
        maxTokens: String(this.settings.maxTokens),
      },
      messages: messages.map((m) => ({ role: m.role, text: m.text })),
    };

    const response = await fetch(`${this.baseUrl}/completion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Api-Key ${this.settings.apiKey}`,
        ...(this.settings.folderId ? { "x-folder-id": this.settings.folderId } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      let errorText = "";
      try {
        const err = await response.json();
        errorText = err.message || err.error || JSON.stringify(err);
      } catch {
        errorText = response.statusText;
      }
      throw new Error(`Ошибка API (${response.status}): ${errorText}`);
    }

    const data: YandexAIResponse = await response.json();
    const alt = data.result?.alternatives?.[0];
    if (!alt) throw new Error("Пустой ответ от API");
    return alt.message.text;
  }

  async *completeStream(messages: ChatMessage[], signal?: AbortSignal): AsyncGenerator<string> {
    if (!this.settings.apiKey) {
      throw new Error("API ключ не задан. Откройте настройки плагина.");
    }

    const body = {
      modelUri: this.getModelUri(),
      completionOptions: {
        stream: true,
        temperature: this.settings.temperature,
        maxTokens: String(this.settings.maxTokens),
      },
      messages: messages.map((m) => ({ role: m.role, text: m.text })),
    };

    const response = await fetch(`${this.baseUrl}/completion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Api-Key ${this.settings.apiKey}`,
        ...(this.settings.folderId ? { "x-folder-id": this.settings.folderId } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      let errorText = "";
      try {
        const err = await response.json();
        errorText = err.message || err.error || JSON.stringify(err);
      } catch {
        errorText = response.statusText;
      }
      throw new Error(`Ошибка API (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Streaming не поддерживается");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const data: YandexAIResponse = JSON.parse(trimmed);
          const text = data.result?.alternatives?.[0]?.message?.text;
          if (text) yield text;
        } catch {
          // skip malformed lines
        }
      }
    }
  }
}
