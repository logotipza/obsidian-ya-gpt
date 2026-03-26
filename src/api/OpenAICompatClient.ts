import { requestUrl } from "obsidian";
import { AIClient, AIMessage, AIResponse } from "./types";

export class OpenAICompatClient implements AIClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(opts: {
    apiKey: string;
    baseUrl: string;
    model: string;
    temperature: number;
    maxTokens: number;
  }) {
    this.apiKey = opts.apiKey;
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.model = opts.model;
    this.temperature = opts.temperature;
    this.maxTokens = opts.maxTokens;
  }

  async complete(messages: AIMessage[]): Promise<AIResponse> {
    const response = await requestUrl({
      url: `${this.baseUrl}/chat/completions`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      }),
      throw: false,
    });

    if (response.status !== 200) {
      const err = response.json;
      throw new Error(`Ошибка API (${response.status}): ${err?.error?.message || JSON.stringify(err)}`);
    }

    const data = response.json;
    return {
      text: data.choices[0].message.content,
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    };
  }

  async *completeStream(messages: AIMessage[]): AsyncGenerator<string> {
    // Obsidian requestUrl doesn't support streaming — fallback to full request
    const result = await this.complete(messages);
    yield result.text;
  }
}
