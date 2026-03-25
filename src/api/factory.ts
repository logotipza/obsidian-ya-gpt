import { AIClient } from "./types";
import { YandexAIClient } from "./YandexAI";
import { OpenAICompatClient } from "./OpenAICompatClient";
import { AnthropicClient } from "./AnthropicClient";
import { GigaChatClient } from "./GigaChatClient";
import type { YaGptSettings } from "../settings";

export function createAIClient(settings: YaGptSettings): AIClient {
  switch (settings.provider) {
    case "groq":
      return new OpenAICompatClient({
        apiKey: settings.groqApiKey,
        baseUrl: "https://api.groq.com/openai/v1",
        model: settings.groqModel,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      });

    case "openai":
      return new OpenAICompatClient({
        apiKey: settings.openaiApiKey,
        baseUrl: settings.openaiBaseUrl || "https://api.openai.com/v1",
        model: settings.openaiModel,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      });

    case "anthropic":
      return new AnthropicClient({
        apiKey: settings.anthropicApiKey,
        model: settings.anthropicModel,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      });

    case "gigachat":
      return new GigaChatClient({
        authKey: settings.gigachatAuthKey,
        model: settings.gigachatModel,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      });

    case "yandex":
    default:
      return new YandexAIClient({
        apiKey: settings.apiKey,
        folderId: settings.folderId,
        modelId: settings.modelId,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        systemPrompt: settings.systemPrompt,
        streamResponse: settings.streamResponse,
      });
  }
}
