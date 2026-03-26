export default {
  // Header
  pluginName: "Smart Vault Chat",
  btnVault: "Поиск по всему Vault",
  btnNoteContext: "Контекст текущей заметки",
  btnNewChat: "Новый чат",
  btnSettings: "Настройки",

  // Welcome
  welcomeSubtitle: "AI ассистент в Obsidian",
  suggestionImprove: "Улучши мою заметку",
  suggestionSummarize: "Сделай краткое резюме",
  suggestionKeyIdeas: "Найди ключевые идеи",
  suggestionTranslate: "Переведи на английский",

  // Input
  inputPlaceholder: "Спросите AI что-нибудь...",
  inputHint: "Enter — отправить · Shift+Enter — новая строка",
  btnSend: "Отправить",
  btnStop: "Остановить генерацию",

  // Messages
  msgCopy: "Копировать",
  msgInsert: "Вставить в заметку",
  msgCopied: "✅ Скопировано",
  msgInserted: "✅ Вставлено в заметку",
  msgCopiedFallback: "📋 Скопировано в буфер (заметка не открыта)",

  // Replace bar
  replaceWillReplace: "Заменит:",
  replaceBtnConfirm: "Заменить в заметке",
  replaceBtnDismiss: "Не заменять",
  replaceSuccess: "✅ Текст заменён в заметке",

  // Vault
  vaultLoaded: (n: number) => `📂 Загружено заметок: ${n}`,
  vaultEmpty: "📂 Vault пуст",
  vaultEnabled: "Поиск по Vault включён",
  vaultDisabled: "Поиск по Vault выключен",
  noteContextEnabled: "Контекст заметки включён",
  noteContextDisabled: "Контекст заметки выключен",

  // Status
  statusSearching: "🔍 Ищу в заметках...",
  statusTokens: (i: number, o: number) => `🔢 Токены: ${i} вход · ${o} выход · ${i + o} итого`,

  // Errors
  errNoApiKey: "❌ Укажите API ключ в настройках плагина",
  errApi: (code: number, msg: string) => `Ошибка API (${code}): ${msg}`,
  errEmpty: "Пустой ответ от API",
  errNoFolderId: "Folder ID не указан. Откройте настройки плагина.",

  // Context menu
  ctxTranslate: "AI Chat: Перевести",
  ctxShorten: "AI Chat: Сократить",
  ctxImprove: "AI Chat: Улучшить текст",
  ctxExplain: "AI Chat: Объяснить",
  ctxAsk: "AI Chat: Спросить...",

  // Prompts
  promptTranslate: (text: string) =>
    `Переведи следующий текст на русский язык (если он на русском — переведи на английский). Верни только перевод:\n\n${text}`,
  promptShorten: (text: string) =>
    `Сократи следующий текст, сохрани главный смысл. Верни только сокращённый текст:\n\n${text}`,
  promptImprove: (text: string) =>
    `Улучши стиль и читабельность следующего текста, сохрани смысл и язык. Верни только улучшенный текст:\n\n${text}`,
  promptExplain: (text: string) => `Объясни простыми словами:\n\n${text}`,
  promptAsk: (text: string) => `Вопрос по тексту: "${text.slice(0, 200)}"\n\n`,
  promptSummarize: (text: string) => `Сделай краткое резюме следующего текста:\n\n${text}`,

  // Settings
  settingsTitle: "Smart Vault Chat — Настройки",
  settingsSubtitle: "Интеграция с AI прямо в Obsidian",
  sectionProvider: "🤖 AI Провайдер",
  sectionGeneration: "⚙️ Параметры генерации",
  sectionPrompt: "💬 Системный промпт",
  sectionVault: "🗄️ Поиск по Vault",
  sectionHistory: "🗂️ История чата",

  settingProvider: "Провайдер",
  settingProviderDesc: "Выберите AI сервис",
  settingTemperature: "Температура",
  settingTemperatureDesc: "Случайность ответов: 0 — точный, 1 — творческий",
  settingMaxTokens: "Максимум токенов",
  settingSystemPrompt: "Системный промпт",
  settingSystemPromptDesc: "Инструкция для AI — стиль и поведение",
  settingVaultSearch: "Поиск по всем заметкам",
  settingVaultSearchDesc: "Автоматически находить релевантные заметки и добавлять в контекст",
  settingVaultResults: "Количество заметок в контексте",
  settingHistory: "Сохранять историю",
  settingHistoryLength: "Длина истории",
  settingHistoryLengthDesc: "Сколько последних сообщений передавать в контекст",
  settingTokens: "Показывать токены",

  settingApiKey: "API ключ",
  settingFolderId: "Folder ID",
  settingFolderIdDesc: "ID каталога в Яндекс Облаке",
  settingModel: "Модель",
  settingBaseUrl: "Base URL",
  settingBaseUrlDesc: "Для совместимых API (LM Studio, Ollama и др.)",
  btnTest: "Проверить",
  btnTesting: "...",
  testSuccess: (name: string) => `✅ ${name} подключён!`,

  // Sections Yandex
  sectionYandex: "🔑 Яндекс AI Studio",
  yandexInfo: "Получите ключ на console.yandex.cloud → Сервисные аккаунты → API ключи. Folder ID — в URL вашего каталога.",

  // Sections Groq
  sectionGroq: "🔑 Groq — Бесплатный AI",
  groqInfo: "Groq предоставляет бесплатный доступ к мощным LLM моделям.",
  groqLink: "→ Получить бесплатный API ключ на console.groq.com",
  groqStep1: "Зайдите на console.groq.com",
  groqStep2: "Зарегистрируйтесь (бесплатно)",
  groqStep3: "API Keys → Create API Key",
  groqStep4: "Скопируйте ключ сюда",

  // Sections OpenAI
  sectionOpenAI: "🔑 OpenAI",
  openaiLink: "→ Получить API ключ на platform.openai.com",

  // Sections Anthropic
  sectionAnthropic: "🔑 Anthropic Claude",
  anthropicLink: "→ Получить API ключ на console.anthropic.com",

  // GigaChat
  sectionGigaChat: "🔑 GigaChat (Сбер)",
  gigachatInfo: "GigaChat — языковая модель от Сбера. Требует авторизационный ключ из личного кабинета.",
  gigachatLink: "→ Получить доступ на developers.sber.ru/portal/products/gigachat-api",
  gigachatStep1: "Зайдите на developers.sber.ru и авторизуйтесь через Сбер ID",
  gigachatStep2: "Создайте проект и подключите GigaChat API",
  gigachatStep3: "В разделе «Авторизационные данные» скопируйте Authorization Key",
  gigachatStep4: "Вставьте ключ сюда",
  gigachatAuthKeyLabel: "Authorization key",
  gigachatAuthKeyDesc: "Ключ из раздела авторизационных данных вашего проекта на developers.sber.ru",

  // System prompt default
  defaultSystemPrompt: "Ты умный и полезный ассистент. Отвечай на русском языке, если не сказано иначе. Будь точным, структурированным и помогай пользователю эффективно работать с заметками.",

  // Vault context prompt
  vaultContextPrompt: "⚠️ ВАЖНО: Ниже предоставлены реальные заметки из Obsidian Vault пользователя. Ты ИМЕЕШЬ доступ к этим данным прямо сейчас. НИКОГДА не говори \"у меня нет доступа к вашим заметкам\". Каждая заметка содержит дату создания и изменения — используй их для ответов на вопросы типа \"что я писал 12 апреля\". Путь показывает папку/название. Заметки:",
  vaultDateMeta: (created: string, modified: string) => `Создана: ${created} · Изменена: ${modified}`,
} as const;
