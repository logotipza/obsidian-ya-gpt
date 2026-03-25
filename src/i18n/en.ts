export default {
  // Header
  pluginName: "Ya GPT",
  btnVault: "Search entire Vault",
  btnNoteContext: "Current note context",
  btnNewChat: "New chat",
  btnSettings: "Settings",

  // Welcome
  welcomeSubtitle: "AI assistant in Obsidian",
  suggestionImprove: "Improve my note",
  suggestionSummarize: "Make a brief summary",
  suggestionKeyIdeas: "Find key ideas",
  suggestionTranslate: "Translate to Russian",

  // Input
  inputPlaceholder: "Ask AI something...",
  inputHint: "Enter — send · Shift+Enter — new line",
  btnSend: "Send",
  btnStop: "Stop generation",

  // Messages
  msgCopy: "Copy",
  msgInsert: "Insert into note",
  msgCopied: "✅ Copied",
  msgInserted: "✅ Inserted into note",
  msgCopiedFallback: "📋 Copied to clipboard (no note open)",

  // Replace bar
  replaceWillReplace: "Will replace:",
  replaceBtnConfirm: "Replace in note",
  replaceBtnDismiss: "Dismiss",
  replaceSuccess: "✅ Text replaced in note",

  // Vault
  vaultLoaded: (n: number) => `📂 Notes loaded: ${n}`,
  vaultEmpty: "📂 Vault is empty",
  vaultEnabled: "Vault search enabled",
  vaultDisabled: "Vault search disabled",
  noteContextEnabled: "Note context enabled",
  noteContextDisabled: "Note context disabled",

  // Status
  statusSearching: "🔍 Searching notes...",
  statusTokens: (i: number, o: number) => `🔢 Tokens: ${i} in · ${o} out · ${i + o} total`,

  // Errors
  errNoApiKey: "❌ Please set an API key in plugin settings",
  errApi: (code: number, msg: string) => `API error (${code}): ${msg}`,
  errEmpty: "Empty response from API",
  errNoFolderId: "Folder ID is not set. Open plugin settings.",

  // Context menu
  ctxTranslate: "Ya GPT: Translate",
  ctxShorten: "Ya GPT: Shorten",
  ctxImprove: "Ya GPT: Improve text",
  ctxExplain: "Ya GPT: Explain",
  ctxAsk: "Ya GPT: Ask...",

  // Prompts
  promptTranslate: (text: string) =>
    `Translate the following text to English (if it's already in English, translate to Russian). Return only the translation:\n\n${text}`,
  promptShorten: (text: string) =>
    `Shorten the following text, preserve the main meaning. Return only the shortened text:\n\n${text}`,
  promptImprove: (text: string) =>
    `Improve the style and readability of the following text, preserve meaning and language. Return only the improved text:\n\n${text}`,
  promptExplain: (text: string) => `Explain in simple terms:\n\n${text}`,
  promptAsk: (text: string) => `Question about this text: "${text.slice(0, 200)}"\n\n`,
  promptSummarize: (text: string) => `Please make a brief summary of the following text:\n\n${text}`,

  // Settings
  settingsTitle: "Ya GPT — Settings",
  settingsSubtitle: "AI integration right in Obsidian",
  sectionProvider: "🤖 AI Provider",
  sectionGeneration: "⚙️ Generation parameters",
  sectionPrompt: "💬 System prompt",
  sectionVault: "🗄️ Vault search",
  sectionHistory: "🗂️ Chat history",

  settingProvider: "Provider",
  settingProviderDesc: "Select AI service",
  settingTemperature: "Temperature",
  settingTemperatureDesc: "Response randomness: 0 — precise, 1 — creative",
  settingMaxTokens: "Max tokens",
  settingSystemPrompt: "System prompt",
  settingSystemPromptDesc: "Instructions for AI — style and behavior",
  settingVaultSearch: "Search all notes",
  settingVaultSearchDesc: "Automatically find relevant notes and add them to context",
  settingVaultResults: "Notes in context",
  settingHistory: "Save history",
  settingHistoryLength: "History length",
  settingHistoryLengthDesc: "How many recent messages to send as context",
  settingTokens: "Show token count",

  settingApiKey: "API Key",
  settingFolderId: "Folder ID",
  settingFolderIdDesc: "Yandex Cloud folder ID",
  settingModel: "Model",
  settingBaseUrl: "Base URL",
  settingBaseUrlDesc: "For compatible APIs (LM Studio, Ollama, etc.)",
  btnTest: "Test",
  btnTesting: "...",
  testSuccess: (name: string) => `✅ ${name} connected!`,

  // Sections Yandex
  sectionYandex: "🔑 Yandex AI Studio",
  yandexInfo: "Get your key at console.yandex.cloud → Service Accounts → API Keys. Folder ID is in your catalog URL.",

  // Sections Groq
  sectionGroq: "🔑 Groq — Free AI",
  groqInfo: "Groq provides free access to powerful LLM models with high speed.",
  groqLink: "→ Get a free API key at console.groq.com",
  groqStep1: "Go to console.groq.com",
  groqStep2: "Sign up (free, no card needed)",
  groqStep3: "API Keys → Create API Key",
  groqStep4: "Paste the key here",

  // Sections OpenAI
  sectionOpenAI: "🔑 OpenAI",
  openaiLink: "→ Get API key at platform.openai.com",

  // Sections Anthropic
  sectionAnthropic: "🔑 Anthropic Claude",
  anthropicLink: "→ Get API key at console.anthropic.com",

  // System prompt default
  defaultSystemPrompt: "You are a smart and helpful assistant. Answer in English by default. Be precise, structured, and help the user work effectively with their notes.",

  // Vault context prompt
  vaultContextPrompt: "⚠️ IMPORTANT: Below are real notes from the user's Obsidian Vault. You HAVE access to this data right now — it is already here in this message. NEVER say you don't have access to the notes. Each note includes creation and modification dates — use them to answer questions like \"what did I write on April 12th\". The path shows folder/name. Notes:",
  vaultDateMeta: (created: string, modified: string) => `Created: ${created} · Modified: ${modified}`,
} as const;
