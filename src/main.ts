import { Plugin, WorkspaceLeaf, addIcon, Editor, MarkdownView, Menu } from "obsidian";
import { YaGptSettings, DEFAULT_SETTINGS, YaGptSettingTab } from "./settings";
import { ChatView, CHAT_VIEW_TYPE } from "./views/ChatView";

const YA_GPT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.15"/>
  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="6"/>
  <path d="M25 38h50M25 50h35M25 62h42" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
</svg>`;

export default class YaGptPlugin extends Plugin {
  settings: YaGptSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    addIcon("ya-gpt", YA_GPT_ICON);
    this.registerView(CHAT_VIEW_TYPE, (leaf) => new ChatView(leaf, this));

    this.addRibbonIcon("bot", "Ya GPT — Открыть чат", async () => {
      await this.activateChatView();
    });

    // Editor context menu (right-click on selection)
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, view: MarkdownView) => {
        const selection = editor.getSelection();
        if (!selection) return;

        menu.addSeparator();

        menu.addItem((item) => {
          item
            .setTitle("Ya GPT: Перевести")
            .setIcon("languages")
            .onClick(() => this.handleInlineAction(editor, selection, "translate"));
        });

        menu.addItem((item) => {
          item
            .setTitle("Ya GPT: Сократить")
            .setIcon("scissors")
            .onClick(() => this.handleInlineAction(editor, selection, "shorten"));
        });

        menu.addItem((item) => {
          item
            .setTitle("Ya GPT: Улучшить текст")
            .setIcon("wand-2")
            .onClick(() => this.handleInlineAction(editor, selection, "improve"));
        });

        menu.addItem((item) => {
          item
            .setTitle("Ya GPT: Объяснить")
            .setIcon("help-circle")
            .onClick(() => this.handleInlineAction(editor, selection, "explain"));
        });

        menu.addItem((item) => {
          item
            .setTitle("Ya GPT: Спросить...")
            .setIcon("message-circle")
            .onClick(() => this.handleInlineAction(editor, selection, "ask"));
        });
      })
    );

    // Commands
    this.addCommand({
      id: "open-chat",
      name: "Открыть чат Ya GPT",
      callback: async () => { await this.activateChatView(); },
    });

    this.addCommand({
      id: "summarize-note",
      name: "Резюме текущей заметки через Ya GPT",
      editorCallback: async (editor) => {
        const text = editor.getSelection() || editor.getValue();
        await this.sendToChat(`Сделай краткое резюме следующего текста:\n\n${text.slice(0, 3000)}`);
      },
    });

    this.addCommand({
      id: "improve-writing",
      name: "Улучшить выделенный текст через Ya GPT",
      editorCallback: async (editor) => {
        const sel = editor.getSelection();
        if (!sel) return;
        await this.handleInlineAction(editor, sel, "improve");
      },
    });

    this.addCommand({
      id: "translate-selection",
      name: "Перевести выделенное через Ya GPT",
      editorCallback: async (editor) => {
        const sel = editor.getSelection();
        if (!sel) return;
        await this.handleInlineAction(editor, sel, "translate");
      },
    });

    this.addSettingTab(new YaGptSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(CHAT_VIEW_TYPE);
  }

  private async handleInlineAction(
    editor: Editor,
    selection: string,
    action: "translate" | "shorten" | "improve" | "explain" | "ask"
  ): Promise<void> {
    const prompts: Record<string, string> = {
      translate: `Переведи следующий текст на русский язык (если он на русском — переведи на английский). Верни только перевод, без пояснений:\n\n${selection}`,
      shorten: `Сократи следующий текст, сохрани главный смысл. Верни только сокращённый текст:\n\n${selection}`,
      improve: `Улучши стиль и читабельность следующего текста, сохрани смысл и язык. Верни только улучшенный текст:\n\n${selection}`,
      explain: `Объясни простыми словами следующий текст:\n\n${selection}`,
      ask: ``,
    };

    await this.activateChatView();

    // Small delay to let the view open
    await new Promise((r) => setTimeout(r, 300));

    const view = this.getChatView();
    if (!view) return;

    if (action === "ask") {
      // For "ask" — just put the selection in the input, user types the question
      view.inputEl.value = `Вопрос по тексту: "${selection.slice(0, 200)}"\n\n`;
      view.inputEl.dispatchEvent(new Event("input"));
      view.inputEl.focus();
      // Position cursor at end
      view.inputEl.setSelectionRange(view.inputEl.value.length, view.inputEl.value.length);
      return;
    }

    // For other actions — send immediately and pass editor reference for replacement
    view.setInlineEditContext(editor, selection);
    view.inputEl.value = prompts[action];
    view.inputEl.dispatchEvent(new Event("input"));
    // Auto-send
    view.triggerSend();
  }

  async sendToChat(text: string): Promise<void> {
    await this.activateChatView();
    await new Promise((r) => setTimeout(r, 300));
    const view = this.getChatView();
    if (!view) return;
    view.inputEl.value = text;
    view.inputEl.dispatchEvent(new Event("input"));
    view.inputEl.focus();
  }

  getChatView(): ChatView | null {
    const leaves = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE);
    if (leaves.length > 0 && leaves[0].view instanceof ChatView) {
      return leaves[0].view as ChatView;
    }
    return null;
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.getChatView()?.refreshSettings();
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
