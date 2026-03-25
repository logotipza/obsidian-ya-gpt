import { ItemView, WorkspaceLeaf, MarkdownRenderer, Notice, setIcon, Editor } from "obsidian";
import type YaGptPlugin from "../main";
import { AIMessage as ChatMessage } from "../api/types";
import { createAIClient } from "../api/factory";
import { VaultSearch } from "../vault/VaultSearch";

export const CHAT_VIEW_TYPE = "ya-gpt-chat";

interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  error?: boolean;
  sources?: string[]; // file paths used as context
}

export class ChatView extends ItemView {
  plugin: YaGptPlugin;
  private messages: StoredMessage[] = [];
  private abortController: AbortController | null = null;
  private isLoading = false;
  private vaultSearch: VaultSearch;
  // Inline edit context — set when triggered from editor selection
  private inlineEditor: Editor | null = null;
  private inlineSelection: string | null = null;

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
    this.vaultSearch = new VaultSearch(plugin.app);
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
    logo.createEl("span", { text: "Я", cls: "yagpt-logo-letter" });

    const titleBlock = headerLeft.createDiv("yagpt-header-title-block");
    titleBlock.createEl("span", { text: "Ya GPT", cls: "yagpt-header-title" });
    this.modelBadge = titleBlock.createEl("span", { cls: "yagpt-model-badge" });
    this.updateModelBadge();

    const headerActions = header.createDiv("yagpt-chat-header-actions");

    // Vault search button
    const vaultBtn = headerActions.createEl("button", {
      cls: "yagpt-icon-btn",
      attr: { title: "Поиск по всему vault", "aria-label": "Vault" },
    });
    setIcon(vaultBtn, "database");
    vaultBtn.toggleClass("yagpt-active", this.plugin.settings.vaultSearchEnabled);
    vaultBtn.addEventListener("click", async () => {
      this.plugin.settings.vaultSearchEnabled = !this.plugin.settings.vaultSearchEnabled;
      // Выключаем одиночный контекст если включаем vault
      if (this.plugin.settings.vaultSearchEnabled) {
        this.plugin.settings.includeNoteContext = false;
        noteCtxBtn.toggleClass("yagpt-active", false);
      }
      vaultBtn.toggleClass("yagpt-active", this.plugin.settings.vaultSearchEnabled);
      await this.plugin.saveSettings();
      const state = this.plugin.settings.vaultSearchEnabled ? "включён" : "выключен";
      new Notice(`Поиск по Vault ${state}`);
    });

    // Include note toggle button
    const noteCtxBtn = headerActions.createEl("button", {
      cls: "yagpt-icon-btn",
      attr: { title: "Контекст текущей заметки", "aria-label": "Контекст заметки" },
    });
    setIcon(noteCtxBtn, "file-text");
    noteCtxBtn.toggleClass("yagpt-active", this.plugin.settings.includeNoteContext);
    noteCtxBtn.addEventListener("click", async () => {
      this.plugin.settings.includeNoteContext = !this.plugin.settings.includeNoteContext;
      // Выключаем vault если включаем одиночный контекст
      if (this.plugin.settings.includeNoteContext) {
        this.plugin.settings.vaultSearchEnabled = false;
        vaultBtn.toggleClass("yagpt-active", false);
      }
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
    logo.createEl("span", { text: "Я", cls: "yagpt-welcome-logo-letter" });
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
    const p = this.plugin.settings.provider;
    const badges: Record<string, string> = {
      yandex: this.plugin.settings.modelId.replace("yandexgpt", "YaGPT").replace("-lite", " Lite").replace("-32k", " 32k"),
      groq: this.plugin.settings.groqModel.split("-").slice(0, 3).join(" "),
      openai: this.plugin.settings.openaiModel,
      anthropic: this.plugin.settings.anthropicModel.split("-").slice(0, 2).join(" "),
    };
    this.modelBadge.setText(badges[p] || p);
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
      if (this.plugin.settings.vaultSearchEnabled) {
        this.showStatus("🔍 Ищу в заметках...");
      }
      const { messages: apiMessages, sources } = await this.buildApiMessages();
      this.showStatus("");
      const client = createAIClient(this.plugin.settings);
      this.abortController = new AbortController();

      const assistantMsg: StoredMessage = { role: "assistant", content: "", timestamp: Date.now(), sources };
      this.messages.push(assistantMsg);
      const msgEl = this.renderMessage(assistantMsg);
      const contentEl = msgEl.querySelector(".yagpt-msg-content") as HTMLElement;

      if (this.plugin.settings.streamResponse) {
        let fullText = "";
        const stream = client.completeStream(apiMessages);
        for await (const chunk of stream) {
          fullText = chunk;
          assistantMsg.content = fullText;
          contentEl.empty();
          await MarkdownRenderer.render(this.app, fullText, contentEl, "", this);
          this.scrollToBottom();
        }
      } else {
        const reply = await client.complete(apiMessages);
        assistantMsg.content = reply.text;
        contentEl.empty();
        await MarkdownRenderer.render(this.app, reply.text, contentEl, "", this);
        if (this.plugin.settings.showTokenCount && (reply.inputTokens || reply.outputTokens)) {
          this.showStatus(`🔢 Токены: ${reply.inputTokens} вход · ${reply.outputTokens} выход · ${reply.inputTokens + reply.outputTokens} итого`);
        }
      }

      // If inline edit mode — show replace button
      if (this.inlineEditor && this.inlineSelection) {
        const bubble = msgEl.querySelector(".yagpt-msg-bubble") as HTMLElement;
        if (bubble) {
          const finalText = assistantMsg.content;
          const capturedEditor = this.inlineEditor;
          const capturedSelection = this.inlineSelection;
          this.renderReplaceButton(bubble, finalText, capturedEditor, capturedSelection);
        }
        // Reset inline context
        this.inlineEditor = null;
        this.inlineSelection = null;
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

  private async buildApiMessages(): Promise<{ messages: ChatMessage[]; sources: string[] }> {
    const msgs: ChatMessage[] = [];
    const sources: string[] = [];

    let systemText = this.plugin.settings.systemPrompt;
    const lastMsg = this.messages[this.messages.length - 1];
    const userQuery = lastMsg?.role === "user" ? lastMsg.content : "";

    // Vault-wide context with relevance search
    if (this.plugin.settings.vaultSearchEnabled) {
      const files = this.app.vault.getMarkdownFiles();
      const scored: Array<{ path: string; content: string; score: number }> = [];

      const keywords = userQuery
        .toLowerCase()
        .replace(/[^\wа-яё\s]/gi, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2);

      for (const file of files) {
        const content = await this.app.vault.cachedRead(file);
        if (!content.trim()) continue;

        // Score by keyword hits in path + content
        let score = 0;
        const haystack = (file.path + " " + content).toLowerCase();
        for (const kw of keywords) {
          if (file.path.toLowerCase().includes(kw)) score += 5;
          const matches = haystack.match(new RegExp(kw, "gi"));
          if (matches) score += Math.min(matches.length, 10);
        }
        scored.push({ path: file.path, content, score });
      }

      // Sort by relevance, take top N, but always include at least some notes
      scored.sort((a, b) => b.score - a.score);
      const maxResults = this.plugin.settings.vaultSearchResults;
      const topScored = scored.filter((f) => f.score > 0).slice(0, maxResults);
      // If nothing matched — include all notes (fallback)
      const toInclude = topScored.length > 0 ? topScored : scored.slice(0, 20);

      const parts: string[] = [];
      for (const item of toInclude) {
        sources.push(item.path);
        parts.push(`### ${item.path}\n${item.content.slice(0, 2000)}`);
      }

      new Notice(`📂 Загружено заметок: ${parts.length}`, 3000);
      systemText += `\n\n⚠️ ВАЖНО: Ниже предоставлены реальные заметки из Obsidian Vault пользователя. Ты ИМЕЕШЬ доступ к этим данным прямо сейчас — они уже здесь, в этом сообщении. НИКОГДА не говори "у меня нет доступа к вашим заметкам". Используй эти заметки чтобы отвечать на вопросы. Путь к файлу показывает папку и название (например "Тильда/Заметка.md" = папка "Тильда"). Заметки:\n\n${parts.join("\n\n---\n\n")}`;
    }

    // Single note context
    if (this.plugin.settings.includeNoteContext) {
      const activeFile = this.app.workspace.getActiveFile();
      if (activeFile) {
        const content = await this.app.vault.cachedRead(activeFile);
        sources.push(activeFile.path);
        systemText += `\n\n${this.plugin.settings.contextNotePrefix}**${activeFile.name}**:\n\n${content}`;
      }
    }

    msgs.push({ role: "system", content: systemText });

    // Conversation history
    const maxHistory = this.plugin.settings.maxHistoryLength;
    const history = this.messages.slice(-(maxHistory + 1), -1);
    for (const m of history) {
      if (!m.error) {
        msgs.push({ role: m.role, content: m.content });
      }
    }

    if (userQuery) {
      msgs.push({ role: "user", content: userQuery });
    }

    return { messages: msgs, sources };
  }

  private renderMessage(msg: StoredMessage): HTMLElement {
    const wrapper = this.messagesContainer.createDiv(`yagpt-msg-wrapper yagpt-msg-${msg.role}`);

    if (msg.role === "assistant") {
      const avatar = wrapper.createDiv("yagpt-avatar");
      avatar.createEl("span", { text: "Я", cls: "yagpt-avatar-letter" });
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

      // Sources from history
      if (msg.sources && msg.sources.length > 0) {
        this.renderSources(bubble, msg.sources);
      }
    }

    return wrapper;
  }

  private renderReplaceButton(bubble: HTMLElement, newText: string, editor: Editor, originalSelection: string): void {
    const replaceBar = bubble.createDiv("yagpt-replace-bar");

    const previewEl = replaceBar.createDiv("yagpt-replace-preview");
    previewEl.createEl("span", { text: "Заменит: ", cls: "yagpt-replace-label" });
    previewEl.createEl("span", {
      text: `"${originalSelection.slice(0, 60)}${originalSelection.length > 60 ? "…" : ""}"`,
      cls: "yagpt-replace-original",
    });

    const btns = replaceBar.createDiv("yagpt-replace-btns");

    const replaceBtn = btns.createEl("button", { cls: "yagpt-replace-btn yagpt-replace-btn--confirm" });
    setIcon(replaceBtn, "check");
    replaceBtn.createEl("span", { text: "Заменить в заметке" });
    replaceBtn.addEventListener("click", () => {
      // Strip markdown for clean replacement if needed, use raw text
      editor.replaceSelection(newText);
      new Notice("✅ Текст заменён в заметке");
      replaceBar.remove();
    });

    const dismissBtn = btns.createEl("button", { cls: "yagpt-replace-btn yagpt-replace-btn--dismiss" });
    setIcon(dismissBtn, "x");
    dismissBtn.createEl("span", { text: "Не заменять" });
    dismissBtn.addEventListener("click", () => {
      replaceBar.remove();
    });
  }

  private renderSources(msgEl: HTMLElement, sources: string[]): void {
    const sourcesEl = msgEl.createDiv("yagpt-sources");
    sourcesEl.createEl("span", { text: "Источники:", cls: "yagpt-sources-label" });
    const list = sourcesEl.createDiv("yagpt-sources-list");
    for (const path of sources) {
      const name = path.split("/").pop()?.replace(/\.md$/, "") || path;
      const link = list.createEl("button", { cls: "yagpt-source-link" });
      link.createEl("span", { text: "📄", cls: "yagpt-source-icon" });
      link.createEl("span", { text: name, cls: "yagpt-source-name" });
      link.setAttribute("title", path);
      link.addEventListener("click", () => {
        this.app.workspace.openLinkText(path, "", false);
      });
    }
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
      avatar.createEl("span", { text: "Я", cls: "yagpt-avatar-letter" });
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

  private showStatus(text: string): void {
    if (!text) {
      this.statusBar.style.display = "none";
      return;
    }
    this.statusBar.setText(text);
    this.statusBar.style.display = "";
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

  // Set inline edit context from editor selection
  setInlineEditContext(editor: Editor, selection: string): void {
    this.inlineEditor = editor;
    this.inlineSelection = selection;
  }

  // Programmatically send the current input
  triggerSend(): void {
    this.handleSend();
  }
}
