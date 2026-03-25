export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AIClient {
  complete(messages: AIMessage[]): Promise<AIResponse>;
  completeStream(messages: AIMessage[]): AsyncGenerator<string>;
}

export type AIProvider = "yandex" | "groq" | "openai" | "anthropic";

export const PROVIDER_NAMES: Record<AIProvider, string> = {
  yandex: "Яндекс AI Studio",
  groq: "Groq (бесплатно)",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
};

export const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B (лучший)" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B (быстрый)" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B (длинный контекст)" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B" },
  { id: "llama-guard-3-8b", name: "Llama Guard 3 8B" },
];

export const OPENAI_MODELS = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4o-mini", name: "GPT-4o mini (дешевле)" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
];

export const ANTHROPIC_MODELS = [
  { id: "claude-opus-4-6", name: "Claude Opus 4.6 (умнейший)" },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6 (баланс)" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5 (быстрый)" },
];
