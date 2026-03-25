import { AIClient, AIMessage, AIResponse } from "./types";

export class AnthropicClient implements AIClient {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(opts: {
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens: number;
  }) {
    this.apiKey = opts.apiKey;
    this.model = opts.model;
    this.temperature = opts.temperature;
    this.maxTokens = opts.maxTokens;
  }

  async complete(messages: AIMessage[]): Promise<AIResponse> {
    const { requestUrl } = require("obsidian");

    // Anthropic separates system prompt from messages
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: chatMessages,
    };
    if (systemMsg) body.system = systemMsg.content;

    const response = await requestUrl({
      url: "https://api.anthropic.com/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      throw: false,
    });

    if (response.status !== 200) {
      const err = response.json;
      throw new Error(`Ошибка API (${response.status}): ${err?.error?.message || JSON.stringify(err)}`);
    }

    const data = response.json;
    return {
      text: data.content[0].text,
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    };
  }

  async *completeStream(messages: AIMessage[]): AsyncGenerator<string> {
    const result = await this.complete(messages);
    yield result.text;
  }
}
