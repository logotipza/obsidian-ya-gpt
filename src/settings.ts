import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type YaGptPlugin from "./main";
import { YANDEX_MODELS, YandexAIClient } from "./api/YandexAI";

export interface YaGptSettings {
  apiKey: string;
  folderId: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  streamResponse: boolean;
  includeNoteContext: boolean;
  contextNotePrefix: string;
  saveHistory: boolean;
  maxHistoryLength: number;
  showTokenCount: boolean;
}

export const DEFAULT_SETTINGS: YaGptSettings = {
  apiKey: "",
  folderId: "",
  modelId: "yandexgpt",
  temperature: 0.6,
  maxTokens: 2000,
  systemPrompt: "Ты умный и полезный ассистент. Отвечай на русском языке, если не сказано иначе. Будь точным, структурированным и помогай пользователю эффективно работать с заметками.",
  streamResponse: true,
  includeNoteContext: false,
  contextNotePrefix: "Контекст из текущей заметки:\n\n",
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
    containerEl.empty();

    // Header
    const header = containerEl.createDiv("yagpt-settings-header");
    header.createEl("h1", { text: "Ya GPT — Настройки" });
    header.createEl("p", {
      text: "Интеграция с Яндекс AI Studio для работы с вашими заметками",
      cls: "yagpt-settings-subtitle",
    });

    // API Section
    this.addSection(containerEl, "🔑 API Подключение");

    new Setting(containerEl)
      .setName("API Ключ")
      .setDesc("Получите ключ в Яндекс AI Studio (console.yandex.cloud → API ключи)")
      .addText((text) => {
        text
          .setPlaceholder("AQVN...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
        text.inputEl.style.width = "100%";
      })
      .addButton((btn) => {
        btn
          .setButtonText("Проверить")
          .setClass("yagpt-test-btn")
          .onClick(async () => {
            btn.setButtonText("Проверяю...");
            btn.setDisabled(true);
            try {
              const client = new YandexAIClient(this.plugin.settings);
              await client.complete([{ role: "user", text: "Привет! Скажи одно слово." }]);
              new Notice("✅ Подключение успешно!");
            } catch (e) {
              new Notice(`❌ Ошибка: ${e.message}`);
            } finally {
              btn.setButtonText("Проверить");
              btn.setDisabled(false);
            }
          });
      });

    new Setting(containerEl)
      .setName("Folder ID")
      .setDesc("ID папки в Яндекс Облаке (опционально, для кастомных моделей)")
      .addText((text) =>
        text
          .setPlaceholder("b1g...")
          .setValue(this.plugin.settings.folderId)
          .onChange(async (value) => {
            this.plugin.settings.folderId = value.trim();
            await this.plugin.saveSettings();
          })
      );

    // Model Section
    this.addSection(containerEl, "🤖 Модель");

    new Setting(containerEl)
      .setName("Модель")
      .setDesc("Выберите языковую модель Яндекс AI")
      .addDropdown((drop) => {
        for (const model of YANDEX_MODELS) {
          drop.addOption(model.id, `${model.name}`);
        }
        drop.setValue(this.plugin.settings.modelId);
        drop.onChange(async (value) => {
          this.plugin.settings.modelId = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Температура")
      .setDesc(`Случайность ответов: 0 — точный, 1 — творческий (текущее: ${this.plugin.settings.temperature})`)
      .addSlider((slider) =>
        slider
          .setLimits(0, 1, 0.05)
          .setValue(this.plugin.settings.temperature)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.temperature = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Максимум токенов")
      .setDesc("Максимальная длина ответа")
      .addSlider((slider) =>
        slider
          .setLimits(100, 8000, 100)
          .setValue(this.plugin.settings.maxTokens)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxTokens = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Потоковый режим (Streaming)")
      .setDesc("Ответ появляется постепенно, как в ChatGPT")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.streamResponse).onChange(async (value) => {
          this.plugin.settings.streamResponse = value;
          await this.plugin.saveSettings();
        })
      );

    // Prompt Section
    this.addSection(containerEl, "💬 Системный промпт");

    new Setting(containerEl)
      .setName("Системный промпт")
      .setDesc("Инструкция для AI — определяет его поведение и стиль ответов")
      .addTextArea((text) => {
        text
          .setPlaceholder("Ты полезный ассистент...")
          .setValue(this.plugin.settings.systemPrompt)
          .onChange(async (value) => {
            this.plugin.settings.systemPrompt = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 5;
        text.inputEl.style.width = "100%";
        text.inputEl.style.resize = "vertical";
      });

    // Context Section
    this.addSection(containerEl, "📝 Контекст заметки");

    new Setting(containerEl)
      .setName("Включать текст текущей заметки")
      .setDesc("Автоматически добавлять содержимое открытой заметки в контекст")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.includeNoteContext).onChange(async (value) => {
          this.plugin.settings.includeNoteContext = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Префикс контекста")
      .setDesc("Текст перед содержимым заметки")
      .addText((text) =>
        text
          .setValue(this.plugin.settings.contextNotePrefix)
          .onChange(async (value) => {
            this.plugin.settings.contextNotePrefix = value;
            await this.plugin.saveSettings();
          })
      );

    // History Section
    this.addSection(containerEl, "🗂️ История чата");

    new Setting(containerEl)
      .setName("Сохранять историю")
      .setDesc("Хранить историю чата между сессиями")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.saveHistory).onChange(async (value) => {
          this.plugin.settings.saveHistory = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Длина истории")
      .setDesc("Сколько последних сообщений передавать в контекст")
      .addSlider((slider) =>
        slider
          .setLimits(2, 50, 2)
          .setValue(this.plugin.settings.maxHistoryLength)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.maxHistoryLength = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Показывать количество токенов")
      .setDesc("Отображать использование токенов в интерфейсе чата")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showTokenCount).onChange(async (value) => {
          this.plugin.settings.showTokenCount = value;
          await this.plugin.saveSettings();
        })
      );

    // Footer
    const footer = containerEl.createDiv("yagpt-settings-footer");
    footer.createEl("p", {
      text: "Документация Яндекс AI Studio: cloud.yandex.ru/docs/yandexgpt",
      cls: "yagpt-settings-footer-text",
    });
  }

  private addSection(container: HTMLElement, title: string): void {
    const section = container.createDiv("yagpt-settings-section");
    section.createEl("h3", { text: title, cls: "yagpt-settings-section-title" });
  }
}
