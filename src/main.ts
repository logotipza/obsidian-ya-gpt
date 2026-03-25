import { Plugin, WorkspaceLeaf, addIcon } from "obsidian";
import { YaGptSettings, DEFAULT_SETTINGS, YaGptSettingTab } from "./settings";
import { ChatView, CHAT_VIEW_TYPE } from "./views/ChatView";

// Custom icon for the plugin
const YA_GPT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.15"/>
  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="6"/>
  <path d="M25 38h50M25 50h35M25 62h42" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
</svg>`;

export default class YaGptPlugin extends Plugin {
  settings: YaGptSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    // Register custom icon
    addIcon("ya-gpt", YA_GPT_ICON);

    // Register chat view
    this.registerView(CHAT_VIEW_TYPE, (leaf) => new ChatView(leaf, this));

    // Ribbon icon
    this.addRibbonIcon("bot", "Ya GPT — Открыть чат", async () => {
      await this.activateChatView();
    });

    // Commands
    this.addCommand({
      id: "open-chat",
      name: "Открыть чат Ya GPT",
      callback: async () => {
        await this.activateChatView();
      },
    });

    this.addCommand({
      id: "ask-about-note",
      name: "Спросить Ya GPT о текущей заметке",
      editorCallback: async (editor) => {
        await this.activateChatView();
        // Set context flag on
        this.settings.includeNoteContext = true;
        await this.saveSettings();
      },
    });

    this.addCommand({
      id: "summarize-note",
      name: "Резюме текущей заметки через Ya GPT",
      editorCallback: async (editor) => {
        const selectedText = editor.getSelection();
        const text = selectedText || editor.getValue();
        await this.activateChatView();
        // Give the view time to open, then inject the request
        setTimeout(() => {
          const view = this.getChatView();
          if (view) {
            view.inputEl.value = `Пожалуйста, сделай краткое резюме следующего текста:\n\n${text.slice(0, 3000)}`;
            view.inputEl.dispatchEvent(new Event("input"));
            view.inputEl.focus();
          }
        }, 300);
      },
    });

    this.addCommand({
      id: "improve-writing",
      name: "Улучшить текст через Ya GPT",
      editorCallback: async (editor) => {
        const selectedText = editor.getSelection();
        if (!selectedText) return;
        await this.activateChatView();
        setTimeout(() => {
          const view = this.getChatView();
          if (view) {
            view.inputEl.value = `Улучши стиль и читабельность следующего текста, сохрани смысл:\n\n${selectedText}`;
            view.inputEl.dispatchEvent(new Event("input"));
            view.inputEl.focus();
          }
        }, 300);
      },
    });

    this.addCommand({
      id: "translate-selection",
      name: "Перевести выделенное через Ya GPT",
      editorCallback: async (editor) => {
        const selectedText = editor.getSelection();
        if (!selectedText) return;
        await this.activateChatView();
        setTimeout(() => {
          const view = this.getChatView();
          if (view) {
            view.inputEl.value = `Переведи на английский язык:\n\n${selectedText}`;
            view.inputEl.dispatchEvent(new Event("input"));
            view.inputEl.focus();
          }
        }, 300);
      },
    });

    // Settings tab
    this.addSettingTab(new YaGptSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(CHAT_VIEW_TYPE);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    // Notify open views
    this.getChatView()?.refreshSettings();
  }

  private getChatView(): ChatView | null {
    const leaves = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE);
    if (leaves.length > 0 && leaves[0].view instanceof ChatView) {
      return leaves[0].view as ChatView;
    }
    return null;
  }

  async activateChatView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: CHAT_VIEW_TYPE, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }
}
