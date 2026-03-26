# AI Chat for Obsidian

A powerful Obsidian plugin with multi-provider AI support: **Yandex AI Studio**, **Groq (free)**, **OpenAI**, **Anthropic Claude**, **GigaChat (Sber)**.

---

## Features

- 💬 **Chat panel** — full chat in the sidebar with persistent history between sessions
- 🗄️ **Vault search** — AI finds relevant notes and answers based on them (RAG)
- 📅 **Date-aware search** — ask "what did I write on April 12th?" and AI uses note creation/modification dates
- 📄 **Note context** — add the current note to context with one click
- ✂️ **Inline editing** — select text → right-click → translate / shorten / improve / explain
- 🔄 **Text replacement** — after AI responds, it offers to replace the selected text in your note
- 📋 **Sources** — shows which notes AI used, with clickable links to open them
- 🔗 **Clickable note references** — note.md links in AI responses open directly in Obsidian
- 📱 **Mobile support** — adaptive layout for Obsidian Mobile
- 🎨 **Dark/light theme** — adapts automatically to your Obsidian theme
- 🌍 **Bilingual UI** — Russian and English interface based on your Obsidian language setting

---

## Supported Providers

| Provider | Cost | Models |
|----------|------|--------|
| **Groq** | Free | Llama 3.3 70B, Mixtral 8x7B, Gemma 2 |
| **Yandex AI** | Paid | YandexGPT Pro/Lite/32k, Llama |
| **OpenAI** | Paid | GPT-4o, GPT-4o mini, GPT-3.5 |
| **Anthropic** | Paid | Claude Opus/Sonnet/Haiku |
| **GigaChat** | Paid | GigaChat, Plus, Pro, Max |

---

## Installation

### Via BRAT (recommended for beta testing)

1. Install the **BRAT** plugin from the Obsidian community catalog
2. BRAT → "Add Beta plugin" → `logotipza/obsidian-ya-gpt`
3. Enable the plugin in Settings → Community plugins

### Manual installation

```bash
git clone https://github.com/logotipza/obsidian-ya-gpt.git
cd obsidian-ya-gpt
npm install
npm run build
cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/obsidian-ya-gpt/
```

---

## API Key Setup

### Groq — Free ⭐

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card required)
3. **API Keys → Create API Key**
4. Paste the key in plugin settings

### Yandex AI Studio

1. Go to [console.yandex.cloud](https://console.yandex.cloud)
2. Create a service account
3. **IAM → API Keys → Create**
4. Copy your **Folder ID** from the catalog URL
5. Paste both values in plugin settings

### OpenAI

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. **Create new secret key**
3. Paste the key in plugin settings

### Anthropic Claude

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. **API Keys → Create Key**
3. Paste the key in plugin settings

### GigaChat (Sber)

1. Go to [developers.sber.ru](https://developers.sber.ru) and sign in with Sber ID
2. Create a project and connect the GigaChat API
3. In the **Authorization Data** section, copy the Authorization Key
4. Paste the key in plugin settings

---

## Usage

### Chat

- Click the 🤖 icon in the sidebar, or use `Cmd+P → Open Ya GPT Chat`
- **Enter** — send message, **Shift+Enter** — new line

### Vault Search

- Click the 🗄️ button in the chat header (turns red when active)
- AI will find relevant notes and show them as clickable sources below its response
- Ask date-based questions: *"What did I write about marketing in March?"*

### Inline Editing

1. Select text in any note
2. Right-click → **Ya GPT** section:
   - **Translate** — auto-detects language direction
   - **Shorten** — concise version preserving meaning
   - **Improve text** — style and readability
   - **Explain** — simple explanation
   - **Ask...** — your custom question
3. The response appears in the chat with a **"Replace in note"** button

### Commands (Cmd+P)

| Command | Description |
|---------|-------------|
| Open Ya GPT Chat | Open the chat panel |
| Summarize current note | Brief AI summary |
| Improve selected text | Style improvement |
| Translate selected | Auto-translate |

---

## Security

- **API keys** are stored locally in Obsidian's encrypted storage (`data.json`), never sent to third parties
- **Requests** go directly from your device to the chosen AI provider
- **Chat history** is stored locally in your device's `localStorage` only
- **Vault data** is sent only within your AI request context, and only when you explicitly enable Vault or Note Context mode
- The plugin **collects no analytics** and sends no data to external servers
- Source code is open and auditable: [github.com/logotipza/obsidian-ya-gpt](https://github.com/logotipza/obsidian-ya-gpt)

---

## Development

```bash
npm run dev    # watch mode for development
npm run build  # production build
```

---

## License

MIT © [logotipza](https://github.com/logotipza)
