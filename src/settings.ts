import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type YaGptPlugin from "./main";
import { YANDEX_MODELS } from "./api/YandexAI";
import { GROQ_MODELS, OPENAI_MODELS, ANTHROPIC_MODELS, GIGACHAT_MODELS, AIProvider, PROVIDER_NAMES } from "./api/types";
import { createAIClient } from "./api/factory";
import { getT } from "./i18n";

export interface YaGptSettings {
  // Provider selection
  provider: AIProvider;
  // Yandex
  apiKey: string;
  folderId: string;
  modelId: string;
  // Groq
  groqApiKey: string;
  groqModel: string;
  // OpenAI
  openaiApiKey: string;
  openaiModel: string;
  openaiBaseUrl: string;
  // Anthropic
  anthropicApiKey: string;
  anthropicModel: string;
  // GigaChat
  gigachatAuthKey: string;
  gigachatModel: string;
  // Common
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  streamResponse: boolean;
  // Context
  includeNoteContext: boolean;
  contextNotePrefix: string;
  // Vault
  vaultSearchEnabled: boolean;
  vaultSearchResults: number;
  // History
  saveHistory: boolean;
  maxHistoryLength: number;
  showTokenCount: boolean;
}

export const DEFAULT_SETTINGS: YaGptSettings = {
  provider: "yandex",
  apiKey: "",
  folderId: "",
  modelId: "yandexgpt",
  groqApiKey: "",
  groqModel: "llama-3.3-70b-versatile",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  openaiBaseUrl: "https://api.openai.com/v1",
  anthropicApiKey: "",
  anthropicModel: "claude-sonnet-4-6",
  gigachatAuthKey: "",
  gigachatModel: "GigaChat-Pro",
  temperature: 0.6,
  maxTokens: 2000,
  systemPrompt: "Ты умный и полезный ассистент. Отвечай на русском языке, если не сказано иначе. Будь точным, структурированным и помогай пользователю эффективно работать с заметками.",
  streamResponse: false,
  includeNoteContext: false,
  contextNotePrefix: "Контекст из текущей заметки:\n\n",
  vaultSearchEnabled: false,
  vaultSearchResults: 5,
  saveHistory: true,
  maxHistoryLength: 20,
  showTokenCount: true,
};

export class YaGptSettingTab extends PluginSettingTab {
  plugin: YaGptPlugin;

  constructor(app: App, plugin: YaGptPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    const t = getT();
    containerEl.empty();
    containerEl.addClass("yagpt-settings-container");

    const header = containerEl.createDiv("yagpt-settings-header");
    header.createEl("h1", { text: t.settingsTitle });
    header.createEl("p", { text: t.settingsSubtitle, cls: "yagpt-settings-subtitle" });

    this.addSection(containerEl, t.sectionProvider);

    new Setting(containerEl)
      .setName(t.settingProvider)
      .setDesc(t.settingProviderDesc)
      .addDropdown((drop) => {
        for (const [id, name] of Object.entries(PROVIDER_NAMES)) {
          drop.addOption(id, name);
        }
        drop.setValue(this.plugin.settings.provider);
        drop.onChange(async (value) => {
          this.plugin.settings.provider = value as AIProvider;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    // Render provider-specific settings
    switch (this.plugin.settings.provider) {
      case "yandex":    this.renderYandexSettings(containerEl); break;
      case "groq":      this.renderGroqSettings(containerEl); break;
      case "openai":    this.renderOpenAISettings(containerEl); break;
      case "anthropic": this.renderAnthropicSettings(containerEl); break;
      case "gigachat":  this.renderGigaChatSettings(containerEl); break;
    }

    // Common settings
    this.addSection(containerEl, t.sectionGeneration);
    new Setting(containerEl).setName(t.settingTemperature).setDesc(t.settingTemperatureDesc)
      .addSlider((s) => s.setLimits(0, 1, 0.05).setValue(this.plugin.settings.temperature).setDynamicTooltip()
        .onChange(async (v) => { this.plugin.settings.temperature = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(t.settingMaxTokens)
      .addSlider((s) => s.setLimits(100, 8000, 100).setValue(this.plugin.settings.maxTokens).setDynamicTooltip()
        .onChange(async (v) => { this.plugin.settings.maxTokens = v; await this.plugin.saveSettings(); }));

    this.addSection(containerEl, t.sectionPrompt);
    new Setting(containerEl).setName(t.settingSystemPrompt).setDesc(t.settingSystemPromptDesc)
      .addTextArea((text) => {
        text.setValue(this.plugin.settings.systemPrompt)
          .onChange(async (v) => { this.plugin.settings.systemPrompt = v; await this.plugin.saveSettings(); });
        text.inputEl.rows = 5;
        text.inputEl.style.width = "100%";
        text.inputEl.style.resize = "vertical";
      });

    this.addSection(containerEl, t.sectionVault);
    new Setting(containerEl).setName(t.settingVaultSearch).setDesc(t.settingVaultSearchDesc)
      .addToggle((tg) => tg.setValue(this.plugin.settings.vaultSearchEnabled)
        .onChange(async (v) => { this.plugin.settings.vaultSearchEnabled = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(t.settingVaultResults)
      .addSlider((s) => s.setLimits(1, 20, 1).setValue(this.plugin.settings.vaultSearchResults).setDynamicTooltip()
        .onChange(async (v) => { this.plugin.settings.vaultSearchResults = v; await this.plugin.saveSettings(); }));

    this.addSection(containerEl, t.sectionHistory);
    new Setting(containerEl).setName(t.settingHistory)
      .addToggle((tg) => tg.setValue(this.plugin.settings.saveHistory)
        .onChange(async (v) => { this.plugin.settings.saveHistory = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(t.settingHistoryLength).setDesc(t.settingHistoryLengthDesc)
      .addSlider((s) => s.setLimits(2, 50, 2).setValue(this.plugin.settings.maxHistoryLength).setDynamicTooltip()
        .onChange(async (v) => { this.plugin.settings.maxHistoryLength = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(t.settingTokens)
      .addToggle((tg) => tg.setValue(this.plugin.settings.showTokenCount)
        .onChange(async (v) => { this.plugin.settings.showTokenCount = v; await this.plugin.saveSettings(); }));
  }

  private renderYandexSettings(containerEl: HTMLElement): void {
    const t = getT();
    this.addSection(containerEl, t.sectionYandex);
    containerEl.createDiv("yagpt-settings-info").createEl("p", { text: t.yandexInfo });
    new Setting(containerEl).setName(t.settingApiKey).addText((tx) => {
      tx.setPlaceholder("AQVN...").setValue(this.plugin.settings.apiKey)
        .onChange(async (v) => { this.plugin.settings.apiKey = v.trim(); await this.plugin.saveSettings(); });
      tx.inputEl.type = "password";
    }).addButton((b) => b.setButtonText(t.btnTest).onClick(async () => {
      b.setButtonText(t.btnTesting); b.setDisabled(true);
      try {
        await createAIClient(this.plugin.settings).complete([{ role: "user", content: "Hi" }]);
        new Notice(t.testSuccess("Yandex"));
      } catch (e) { new Notice(`❌ ${e.message}`); }
      finally { b.setButtonText(t.btnTest); b.setDisabled(false); }
    }));
    new Setting(containerEl).setName(t.settingFolderId).setDesc(t.settingFolderIdDesc)
      .addText((tx) => tx.setPlaceholder("b1g...").setValue(this.plugin.settings.folderId)
        .onChange(async (v) => { this.plugin.settings.folderId = v.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName(t.settingModel).addDropdown((d) => {
      for (const m of YANDEX_MODELS) d.addOption(m.id, m.name);
      d.setValue(this.plugin.settings.modelId)
        .onChange(async (v) => { this.plugin.settings.modelId = v; await this.plugin.saveSettings(); });
    });
  }

  private renderGroqSettings(containerEl: HTMLElement): void {
    const t = getT();
    this.addSection(containerEl, t.sectionGroq);
    const info = containerEl.createDiv("yagpt-settings-info");
    info.createEl("p", { text: t.groqInfo });
    info.createEl("p").createEl("a", { text: t.groqLink, href: "https://console.groq.com", attr: { target: "_blank" } });
    const steps = info.createEl("ol", { cls: "yagpt-settings-steps" });
    [t.groqStep1, t.groqStep2, t.groqStep3, t.groqStep4].forEach((s) => steps.createEl("li", { text: s }));
    new Setting(containerEl).setName(t.settingApiKey).addText((tx) => {
      tx.setPlaceholder("gsk_...").setValue(this.plugin.settings.groqApiKey)
        .onChange(async (v) => { this.plugin.settings.groqApiKey = v.trim(); await this.plugin.saveSettings(); });
      tx.inputEl.type = "password";
    }).addButton((b) => b.setButtonText(t.btnTest).onClick(async () => {
      b.setButtonText(t.btnTesting); b.setDisabled(true);
      try {
        await createAIClient(this.plugin.settings).complete([{ role: "user", content: "Hi" }]);
        new Notice(t.testSuccess("Groq"));
      } catch (e) { new Notice(`❌ ${e.message}`); }
      finally { b.setButtonText(t.btnTest); b.setDisabled(false); }
    }));
    new Setting(containerEl).setName(t.settingModel).addDropdown((d) => {
      for (const m of GROQ_MODELS) d.addOption(m.id, m.name);
      d.setValue(this.plugin.settings.groqModel)
        .onChange(async (v) => { this.plugin.settings.groqModel = v; await this.plugin.saveSettings(); });
    });
  }

  private renderOpenAISettings(containerEl: HTMLElement): void {
    const t = getT();
    this.addSection(containerEl, t.sectionOpenAI);
    containerEl.createDiv("yagpt-settings-info").createEl("p")
      .createEl("a", { text: t.openaiLink, href: "https://platform.openai.com/api-keys", attr: { target: "_blank" } });
    new Setting(containerEl).setName(t.settingApiKey).addText((tx) => {
      tx.setPlaceholder("sk-...").setValue(this.plugin.settings.openaiApiKey)
        .onChange(async (v) => { this.plugin.settings.openaiApiKey = v.trim(); await this.plugin.saveSettings(); });
      tx.inputEl.type = "password";
    }).addButton((b) => b.setButtonText(t.btnTest).onClick(async () => {
      b.setButtonText(t.btnTesting); b.setDisabled(true);
      try {
        await createAIClient(this.plugin.settings).complete([{ role: "user", content: "Hi" }]);
        new Notice(t.testSuccess("OpenAI"));
      } catch (e) { new Notice(`❌ ${e.message}`); }
      finally { b.setButtonText(t.btnTest); b.setDisabled(false); }
    }));
    new Setting(containerEl).setName(t.settingModel).addDropdown((d) => {
      for (const m of OPENAI_MODELS) d.addOption(m.id, m.name);
      d.setValue(this.plugin.settings.openaiModel)
        .onChange(async (v) => { this.plugin.settings.openaiModel = v; await this.plugin.saveSettings(); });
    });
    new Setting(containerEl).setName(t.settingBaseUrl).setDesc(t.settingBaseUrlDesc)
      .addText((tx) => tx.setValue(this.plugin.settings.openaiBaseUrl)
        .onChange(async (v) => { this.plugin.settings.openaiBaseUrl = v.trim(); await this.plugin.saveSettings(); }));
  }

  private renderAnthropicSettings(containerEl: HTMLElement): void {
    const t = getT();
    this.addSection(containerEl, t.sectionAnthropic);
    containerEl.createDiv("yagpt-settings-info").createEl("p")
      .createEl("a", { text: t.anthropicLink, href: "https://console.anthropic.com", attr: { target: "_blank" } });
    new Setting(containerEl).setName(t.settingApiKey).addText((tx) => {
      tx.setPlaceholder("sk-ant-...").setValue(this.plugin.settings.anthropicApiKey)
        .onChange(async (v) => { this.plugin.settings.anthropicApiKey = v.trim(); await this.plugin.saveSettings(); });
      tx.inputEl.type = "password";
    }).addButton((b) => b.setButtonText(t.btnTest).onClick(async () => {
      b.setButtonText(t.btnTesting); b.setDisabled(true);
      try {
        await createAIClient(this.plugin.settings).complete([{ role: "user", content: "Hi" }]);
        new Notice(t.testSuccess("Anthropic"));
      } catch (e) { new Notice(`❌ ${e.message}`); }
      finally { b.setButtonText(t.btnTest); b.setDisabled(false); }
    }));
    new Setting(containerEl).setName(t.settingModel).addDropdown((d) => {
      for (const m of ANTHROPIC_MODELS) d.addOption(m.id, m.name);
      d.setValue(this.plugin.settings.anthropicModel)
        .onChange(async (v) => { this.plugin.settings.anthropicModel = v; await this.plugin.saveSettings(); });
    });
  }

  private renderGigaChatSettings(containerEl: HTMLElement): void {
    const t = getT();
    this.addSection(containerEl, t.sectionGigaChat);
    const info = containerEl.createDiv("yagpt-settings-info");
    info.createEl("p", { text: t.gigachatInfo });
    info.createEl("p").createEl("a", {
      text: t.gigachatLink,
      href: "https://developers.sber.ru/portal/products/gigachat-api",
      attr: { target: "_blank" },
    });
    const steps = info.createEl("ol", { cls: "yagpt-settings-steps" });
    [t.gigachatStep1, t.gigachatStep2, t.gigachatStep3, t.gigachatStep4].forEach((s) =>
      steps.createEl("li", { text: s })
    );

    new Setting(containerEl).setName(t.gigachatAuthKeyLabel).setDesc(t.gigachatAuthKeyDesc)
      .addText((tx) => {
        tx.setPlaceholder("base64...").setValue(this.plugin.settings.gigachatAuthKey)
          .onChange(async (v) => { this.plugin.settings.gigachatAuthKey = v.trim(); await this.plugin.saveSettings(); });
        tx.inputEl.type = "password";
      }).addButton((b) => b.setButtonText(t.btnTest).onClick(async () => {
        b.setButtonText(t.btnTesting); b.setDisabled(true);
        try {
          await createAIClient(this.plugin.settings).complete([{ role: "user", content: "Привет" }]);
          new Notice(t.testSuccess("GigaChat"));
        } catch (e) { new Notice(`❌ ${e.message}`); }
        finally { b.setButtonText(t.btnTest); b.setDisabled(false); }
      }));

    new Setting(containerEl).setName(t.settingModel).addDropdown((d) => {
      for (const m of GIGACHAT_MODELS) d.addOption(m.id, m.name);
      d.setValue(this.plugin.settings.gigachatModel)
        .onChange(async (v) => { this.plugin.settings.gigachatModel = v; await this.plugin.saveSettings(); });
    });
  }

  private addSection(container: HTMLElement, title: string): void {
    container.createDiv("yagpt-settings-section")
      .createEl("h3", { text: title, cls: "yagpt-settings-section-title" });
  }
}
