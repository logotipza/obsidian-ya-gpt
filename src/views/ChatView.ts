import { ItemView, WorkspaceLeaf, MarkdownRenderer, Notice, setIcon } from "obsidian";
import type YaGptPlugin from "../main";
import { YandexAIClient, ChatMessage } from "../api/YandexAI";

export const CHAT_VIEW_TYPE = "ya-gpt-chat";

interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  error?: boolean;
}

export class ChatView extends ItemView {
  plugin: YaGptPlugin;
  private messages: StoredMessage[] = [];
  private abortController: AbortController | null = null;
  private isLoading = false;

  // DOM refs
  private messagesContainer: HTMLElement;
  inputEl: HTMLTextAreaElement;
  private sendBtn: HTMLButtonElement;
  private stopBtn: HTMLButtonElement;
  private statusBar: HTMLElement;
  private modelBadge: HTMLElement;

  constructor(leaf: WorkspaceLeaf, plugin: YaGptPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return CHAT_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Ya GPT";
  }

  getIcon(): string {
    return "bot";
  }

  async onOpen(): Promise<void> {
    this.buildUI();
    if (this.plugin.settings.saveHistory) {
      this.loadHistory();
    }
    this.scrollToBottom();
  }

  async onClose(): Promise<void> {
    this.abortController?.abort();
  }

  private buildUI(): void {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass("yagpt-chat-root");

    // Header
    const header = root.createDiv("yagpt-chat-header");
    const headerLeft = header.createDiv("yagpt-chat-header-left");

    const logo = headerLeft.createDiv("yagpt-logo");
    logo.innerHTML = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="14" fill="url(#yagpt-grad)"/>
      <path d="M8 10h12M8 14h8M8 18h10" stroke="white" stroke-width="2" stroke-linecap="round"/>
      <defs>
        <linearGradient id="yagpt-grad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FF4545"/>
          <stop offset="1" stop-color="#FF7844"/>
        </linearGradient>
      </defs>
    </svg>`;

    const titleBlock = headerLeft.createDiv("yagpt-header-title-block");
    titleBlock.createEl("span", { text: "Ya GPT", cls: "yagpt-header-title" });
    this.modelBadge = titleBlock.createEl("span", { cls: "yagpt-model-badge" });
    this.updateModelBadge();

    const headerActions = header.createDiv("yagpt-chat-header-actions");

    // Include note toggle button
    const noteCtxBtn = headerActions.createEl("button", {
      cls: "yagpt-icon-btn",
      attr: { title: "Включить/выключить контекст заметки", "aria-label": "Контекст заметки" },
    });
    setIcon(noteCtxBtn, "file-text");
    noteCtxBtn.toggleClass("yagpt-active", this.plugin.settings.includeNoteContext);
    noteCtxBtn.addEventListener("click", async () => {
      this.plugin.settings.includeNoteContext = !this.plugin.settings.includeNoteContext;
      noteCtxBtn.toggleClass("yagpt-active", this.plugin.settings.includeNoteContext);
      await this.plugin.saveSettings();
      const state = this.plugin.settings.includeNoteContext ? "включён" : "выключен";
      new Notice(`Контекст заметки ${state}`);
    });

    // New chat button
    const newChatBtn = headerActions.createEl("button", {
      cls: "yagpt-icon-btn",
      attr: { title: "Новый чат", "aria-label": "Новый чат" },
    });
    setIcon(newChatBtn, "plus");
    newChatBtn.addEventListener("click", () => this.clearChat());

    // Settings button
    const settingsBtn = headerActions.createEl("button", {
      cls: "yagpt-icon-btn",
      attr: { title: "Настройки", "aria-label": "Настройки" },
    });
    setIcon(settingsBtn, "settings");
    settingsBtn.addEventListener("click", () => {
      (this.app as any).setting.open();
      (this.app as any).setting.openTabById("obsidian-ya-gpt");
    });

    // Messages area
    this.messagesContainer = root.createDiv("yagpt-messages");

    // Welcome screen (shown when no messages)
    this.renderWelcome();

    // Status bar
    this.statusBar = root.createDiv("yagpt-status-bar");
    this.statusBar.style.display = "none";

    // Input area
    const inputArea = root.createDiv("yagpt-input-area");

    const inputWrapper = inputArea.createDiv("yagpt-input-wrapper");

    // Note context indicator
    const ctxIndicator = inputWrapper.createDiv("yagpt-ctx-indicator");
    ctxIndicator.style.display = "none";

    this.inputEl = inputWrapper.createEl("textarea", {
      cls: "yagpt-textarea",
      attr: {
        placeholder: "Спросите YandexGPT что-нибудь...",
        rows: "1",
      },
    });

    // Auto-resize textarea
    this.inputEl.addEventListener("input", () => {
      this.inputEl.style.height = "auto";
      this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 200) + "px";
    });

    // Send on Ctrl+Enter or Cmd+Enter
    this.inputEl.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.handleSend();
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    const btnGroup = inputWrapper.createDiv("yagpt-btn-group");

    this.stopBtn = btnGroup.createEl("button", {
      cls: "yagpt-stop-btn",
      attr: { title: "Остановить генерацию", style: "display:none" },
    });
    setIcon(this.stopBtn, "square");
    this.stopBtn.addEventListener("click", () => this.stopGeneration());

    this.sendBtn = btnGroup.createEl("button", { cls: "yagpt-send-btn", attr: { title: "Отправить (Enter)" } });
    setIcon(this.sendBtn, "send");
    this.sendBtn.addEventListener("click", () => this.handleSend());

    // Footer hint
    const hint = inputArea.createDiv("yagpt-input-hint");
    hint.createEl("span", { text: "Enter — отправить · Shift+Enter — новая строка" });
  }

  private renderWelcome(): void {
    if (this.messages.length > 0) return;

    const welcome = this.messagesContainer.createDiv("yagpt-welcome");
    const logo = welcome.createDiv("yagpt-welcome-logo");
    logo.innerHTML = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="28" cy="28" r="28" fill="url(#wg)"/>
      <path d="M15 21h26M15 28h18M15 35h22" stroke="white" stroke-width="3" stroke-linecap="round"/>
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FF4545"/>
          <stop offset="1" stop-color="#FF7844"/>
        </linearGradient>
      </defs>
    </svg>`;
    welcome.createEl("h2", { text: "Ya GPT", cls: "yagpt-welcome-title" });
    welcome.createEl("p", { text: "Яндекс AI прямо в Obsidian", cls: "yagpt-welcome-subtitle" });

    const suggestions = welcome.createDiv("yagpt-suggestions");
    const items = [
      { icon: "✍️", text: "Улучши мою заметку" },
      { icon: "📋", text: "Сделай краткое резюме" },
      { icon: "🔍", text: "Найди ключевые идеи" },
      { icon: "🌐", text: "Переведи на английский" },
    ];
    for (const item of items) {
      const chip = suggestions.createEl("button", { cls: "yagpt-suggestion-chip" });
      chip.createEl("span", { text: item.icon, cls: "yagpt-chip-icon" });
      chip.createEl("span", { text: item.text });
      chip.addEventListener("click", () => {
        this.inputEl.value = item.text;
        this.inputEl.dispatchEvent(new Event("input"));
        this.inputEl.focus();
      });
    }
  }

  private updateModelBadge(): void {
    const modelId = this.plugin.settings.modelId;
    const names: Record<string, string> = {
      "yandexgpt-lite": "GPT Lite",
      "yandexgpt": "GPT Pro",
      "yandexgpt-32k": "GPT 32k",
      "llama-lite": "Llama Lite",
      "llama": "Llama",
    };
    this.modelBadge.setText(names[modelId] || modelId);
  }

  private async handleSend(): Promise<void> {
    const text = this.inputEl.value.trim();
    if (!text || this.isLoading) return;
    if (!this.plugin.settings.apiKey) {
      new Notice("❌ Укажите API ключ в настройках плагина");
      (this.app as any).setting.open();
      (this.app as any).setting.openTabById("obsidian-ya-gpt");
      return;
    }

    // Clear welcome screen
    this.messagesContainer.find(".yagpt-welcome")?.remove();

    this.inputEl.value = "";
    this.inputEl.style.height = "auto";

    // Add user message
    const userMsg: StoredMessage = { role: "user", content: text, timestamp: Date.now() };
    this.messages.push(userMsg);
    this.renderMessage(userMsg);
    this.scrollToBottom();

    this.setLoading(true);

    try {
      const apiMessages = this.buildApiMessages();
      const client = new YandexAIClient(this.plugin.settings);
      this.abortController = new AbortController();

      const assistantMsg: StoredMessage = { role: "assistant", content: "", timestamp: Date.now() };
      this.messages.push(assistantMsg);
      const msgEl = this.renderMessage(assistantMsg);
      const contentEl = msgEl.querySelector(".yagpt-msg-content") as HTMLElement;

      if (this.plugin.settings.streamResponse) {
        let fullText = "";
        const stream = client.completeStream(apiMessages, this.abortController.signal);
        for await (const chunk of stream) {
          fullText = chunk; // Yandex returns full text each chunk
          assistantMsg.content = fullText;
          contentEl.empty();
          await MarkdownRenderer.render(this.app, fullText, contentEl, "", this);
          this.scrollToBottom();
        }
      } else {
        const reply = await client.complete(apiMessages, this.abortController.signal);
        assistantMsg.content = reply;
        contentEl.empty();
        await MarkdownRenderer.render(this.app, reply, contentEl, "", this);
      }

      this.scrollToBottom();
      if (this.plugin.settings.saveHistory) {
        this.saveHistory();
      }
    } catch (e) {
      if (e.name === "AbortError") {
        // User stopped generation - that's fine
        if (this.messages[this.messages.length - 1]?.role === "assistant") {
          const last = this.messages[this.messages.length - 1];
          if (!last.content) {
            this.messages.pop();
            this.messagesContainer.lastElementChild?.remove();
          }
        }
      } else {
        const errMsg: StoredMessage = {
          role: "assistant",
          content: `**Ошибка:** ${e.message}`,
          timestamp: Date.now(),
          error: true,
        };
        this.messages.push(errMsg);
        this.renderMessage(errMsg);
        new Notice(`❌ ${e.message}`);
      }
    } finally {
      this.setLoading(false);
      this.abortController = null;
    }
  }

  private buildApiMessages(): ChatMessage[] {
    const msgs: ChatMessage[] = [];

    // System prompt
    let systemText = this.plugin.settings.systemPrompt;

    // Include note context if enabled
    if (this.plugin.settings.includeNoteContext) {
      const activeFile = this.app.workspace.getActiveFile();
      if (activeFile) {
        const cache = this.app.metadataCache.getFileCache(activeFile);
        void this.app.vault.cachedRead(activeFile).then((content) => {
          systemText += `\n\n${this.plugin.settings.contextNotePrefix}${content}`;
        });
        // Synchronous approximation — we read it in the main flow
      }
    }

    msgs.push({ role: "system", text: systemText });

    // Add conversation history (limited)
    const maxHistory = this.plugin.settings.maxHistoryLength;
    const history = this.messages.slice(-(maxHistory + 1), -1); // exclude last user message which we'll add

    for (const m of history) {
      if (!m.error) {
        msgs.push({ role: m.role, text: m.content });
      }
    }

    // Last user message
    const lastMsg = this.messages[this.messages.length - 1];
    if (lastMsg.role === "user") {
      msgs.push({ role: "user", text: lastMsg.content });
    }

    return msgs;
  }

  private renderMessage(msg: StoredMessage): HTMLElement {
    const wrapper = this.messagesContainer.createDiv(`yagpt-msg-wrapper yagpt-msg-${msg.role}`);

    if (msg.role === "assistant") {
      const avatar = wrapper.createDiv("yagpt-avatar");
      avatar.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="url(#ag)"/>
        <path d="M5 7.5h10M5 10h7M5 12.5h8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <defs><linearGradient id="ag" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FF4545"/><stop offset="1" stop-color="#FF7844"/>
        </linearGradient></defs>
      </svg>`;
    }

    const bubble = wrapper.createDiv("yagpt-msg-bubble");

    const contentEl = bubble.createDiv("yagpt-msg-content");
    if (msg.content) {
      if (msg.role === "assistant") {
        MarkdownRenderer.render(this.app, msg.content, contentEl, "", this);
      } else {
        contentEl.setText(msg.content);
      }
    }

    // Actions (for assistant messages)
    if (msg.role === "assistant") {
      const actions = bubble.createDiv("yagpt-msg-actions");

      const copyBtn = actions.createEl("button", { cls: "yagpt-action-btn", attr: { title: "Копировать" } });
      setIcon(copyBtn, "copy");
      copyBtn.addEventListener("click", async () => {
        await navigator.clipboard.writeText(msg.content);
        setIcon(copyBtn, "check");
        setTimeout(() => setIcon(copyBtn, "copy"), 2000);
      });

      const insertBtn = actions.createEl("button", { cls: "yagpt-action-btn", attr: { title: "Вставить в заметку" } });
      setIcon(insertBtn, "file-plus");
      insertBtn.addEventListener("click", () => this.insertIntoNote(msg.content));

      const timeEl = actions.createEl("span", { cls: "yagpt-msg-time" });
      timeEl.setText(this.formatTime(msg.timestamp));
    }

    return wrapper;
  }

  private async insertIntoNote(text: string): Promise<void> {
    const { MarkdownView } = require("obsidian");
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
      const editor = (activeView as any).editor;
      const cursor = editor.getCursor();
      editor.replaceRange("\n" + text + "\n", cursor);
      new Notice("✅ Вставлено в заметку");
    } else {
      await navigator.clipboard.writeText(text);
      new Notice("📋 Скопировано в буфер (заметка не открыта)");
    }
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.sendBtn.style.display = loading ? "none" : "";
    this.stopBtn.style.display = loading ? "" : "none";
    this.inputEl.disabled = loading;

    if (loading) {
      // Add typing indicator
      const typingEl = this.messagesContainer.createDiv("yagpt-typing yagpt-msg-wrapper yagpt-msg-assistant");
      const avatar = typingEl.createDiv("yagpt-avatar");
      avatar.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="url(#tg)"/>
        <path d="M5 7.5h10M5 10h7M5 12.5h8" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <defs><linearGradient id="tg" x1="0" y1="0" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop stop-color="#FF4545"/><stop offset="1" stop-color="#FF7844"/>
        </linearGradient></defs>
      </svg>`;
      const bubble = typingEl.createDiv("yagpt-msg-bubble");
      const dots = bubble.createDiv("yagpt-typing-dots");
      dots.createDiv("yagpt-dot");
      dots.createDiv("yagpt-dot");
      dots.createDiv("yagpt-dot");
      this.scrollToBottom();
    } else {
      this.messagesContainer.find(".yagpt-typing")?.remove();
    }
  }

  private stopGeneration(): void {
    this.abortController?.abort();
  }

  private clearChat(): void {
    this.messages = [];
    this.messagesContainer.empty();
    this.renderWelcome();
    if (this.plugin.settings.saveHistory) {
      this.saveHistory();
    }
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    });
  }

  private formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  private saveHistory(): void {
    const key = "ya-gpt-history";
    const data = this.messages.slice(-50); // keep last 50
    localStorage.setItem(key, JSON.stringify(data));
  }

  private loadHistory(): void {
    const key = "ya-gpt-history";
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const data: StoredMessage[] = JSON.parse(raw);
      if (data.length === 0) return;
      this.messages = data;
      this.messagesContainer.find(".yagpt-welcome")?.remove();
      for (const msg of this.messages) {
        this.renderMessage(msg);
      }
    } catch {
      // ignore corrupt history
    }
  }

  // Called from plugin when settings change
  refreshSettings(): void {
    this.updateModelBadge();
  }
}
