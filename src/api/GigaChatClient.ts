import { AIClient, AIMessage, AIResponse } from "./types";

interface GigaChatToken {
  access_token: string;
  expires_at: number; // unix ms
}

export class GigaChatClient implements AIClient {
  private authKey: string; // base64(client_id:secret) from Sber cabinet
  private model: string;
  private temperature: number;
  private maxTokens: number;
  private cachedToken: GigaChatToken | null = null;

  private static readonly AUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
  private static readonly API_URL = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";

  constructor(opts: {
    authKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
  }) {
    this.authKey = opts.authKey;
    this.model = opts.model;
    this.temperature = opts.temperature;
    this.maxTokens = opts.maxTokens;
  }

  private generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  private async getToken(): Promise<string> {
    // Reuse token if still valid (5 min buffer)
    if (this.cachedToken && this.cachedToken.expires_at > Date.now() + 300_000) {
      return this.cachedToken.access_token;
    }

    const { requestUrl } = require("obsidian");

    const response = await requestUrl({
      url: GigaChatClient.AUTH_URL,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${this.authKey}`,
        RqUID: this.generateUUID(),
      },
      body: "scope=GIGACHAT_API_PERS",
      throw: false,
    });

    if (response.status !== 200) {
      let msg = "";
      try { msg = response.json?.message || JSON.stringify(response.json); }
      catch { msg = response.text || String(response.status); }
      throw new Error(`GigaChat auth error (${response.status}): ${msg}`);
    }

    const data = response.json;
    this.cachedToken = {
      access_token: data.access_token,
      expires_at: data.expires_at, // already in ms from Sber
    };
    return this.cachedToken.access_token;
  }

  async complete(messages: AIMessage[]): Promise<AIResponse> {
    if (!this.authKey) throw new Error("GigaChat: Authorization Key не задан.");

    const token = await this.getToken();
    const { requestUrl } = require("obsidian");

    // GigaChat doesn't support system role in some versions — merge into first user message
    const gigaMessages = this.convertMessages(messages);

    const response = await requestUrl({
      url: GigaChatClient.API_URL,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: gigaMessages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      }),
      throw: false,
    });

    if (response.status !== 200) {
      let msg = "";
      try { msg = response.json?.message || JSON.stringify(response.json); }
      catch { msg = response.text || String(response.status); }
      throw new Error(`GigaChat API error (${response.status}): ${msg}`);
    }

    const data = response.json;
    return {
      text: data.choices[0].message.content,
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    };
  }

  async *completeStream(messages: AIMessage[]): AsyncGenerator<string> {
    const result = await this.complete(messages);
    yield result.text;
  }

  private convertMessages(messages: AIMessage[]): Array<{ role: string; content: string }> {
    // GigaChat supports system role since API v2 — pass as-is
    return messages.map((m) => ({ role: m.role, content: m.content }));
  }
}
