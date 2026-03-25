import { App, TFile } from "obsidian";

export interface SearchResult {
  file: TFile;
  excerpt: string;
  score: number;
}

const STOP_WORDS = new Set([
  "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а", "то",
  "все", "она", "так", "его", "но", "да", "ты", "к", "у", "же", "вы", "за",
  "бы", "по", "только", "её", "мне", "было", "вот", "от", "меня", "ещё",
  "нет", "о", "из", "ему", "теперь", "когда", "даже", "ну", "вдруг", "ли",
  "если", "уже", "или", "ни", "быть", "был", "него", "до", "вас", "нибудь",
  "опять", "уж", "вам", "сказал", "ведь", "там", "потом", "себя", "ничего",
  "ей", "может", "они", "тут", "где", "есть", "надо", "ней", "для", "мы",
  "тебя", "их", "чем", "была", "сам", "чтоб", "без", "будто", "чего", "раз",
  "тоже", "себе", "под", "будет", "ж", "тогда", "кто", "этот", "того",
  "потому", "этого", "какой", "совсем", "ним", "здесь", "этом", "один",
  "почти", "мой", "тем", "чтобы", "нее", "были", "куда", "зачем", "всех",
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "through", "about",
]);

export class VaultSearch {
  private app: App;

  constructor(app: App) {
    this.app = app;
  }

  async searchVault(query: string, maxResults = 5, maxExcerptLen = 800): Promise<SearchResult[]> {
    const keywords = this.extractKeywords(query);
    if (keywords.length === 0) return [];

    const files = this.app.vault.getMarkdownFiles();
    const results: SearchResult[] = [];

    for (const file of files) {
      const content = await this.app.vault.cachedRead(file);
      const score = this.scoreDocument(content, file.name, keywords);
      if (score > 0) {
        const excerpt = this.extractExcerpt(content, keywords, maxExcerptLen);
        results.push({ file, excerpt, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\wа-яё\s]/gi, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  }

  private scoreDocument(content: string, filename: string, keywords: string[]): number {
    const lowerContent = content.toLowerCase();
    const lowerFilename = filename.toLowerCase();
    let score = 0;

    for (const kw of keywords) {
      // Filename match = high score
      if (lowerFilename.includes(kw)) score += 10;

      // Count occurrences in content
      let idx = 0;
      let count = 0;
      while ((idx = lowerContent.indexOf(kw, idx)) !== -1) {
        count++;
        idx += kw.length;
        if (count > 20) break; // cap
      }
      score += Math.min(count, 20);
    }

    return score;
  }

  private extractExcerpt(content: string, keywords: string[], maxLen: number): string {
    const lowerContent = content.toLowerCase();
    let bestPos = 0;
    let bestScore = 0;

    // Find the window of text with most keyword hits
    const windowSize = 400;
    for (let i = 0; i < content.length - windowSize; i += 100) {
      const window = lowerContent.slice(i, i + windowSize);
      let score = 0;
      for (const kw of keywords) {
        if (window.includes(kw)) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        bestPos = i;
      }
    }

    // Trim to sentence boundary
    const start = Math.max(0, bestPos - 50);
    let excerpt = content.slice(start, start + maxLen);

    // Clean up markdown noise
    excerpt = excerpt
      .replace(/^#{1,6}\s+/gm, "**")
      .replace(/!?\[.*?\]\(.*?\)/g, "")
      .replace(/```[\s\S]*?```/g, "[код]")
      .trim();

    if (start > 0) excerpt = "..." + excerpt;
    if (start + maxLen < content.length) excerpt = excerpt + "...";

    return excerpt;
  }

  async getAllNotesContext(maxTotalChars = 12000): Promise<string> {
    const files = this.app.vault.getMarkdownFiles();
    const parts: string[] = [];
    let totalChars = 0;

    for (const file of files) {
      if (totalChars >= maxTotalChars) break;
      const content = await this.app.vault.cachedRead(file);
      const trimmed = content.slice(0, 1000);
      const chunk = `### ${file.name}\n${trimmed}`;
      parts.push(chunk);
      totalChars += chunk.length;
    }

    return parts.join("\n\n---\n\n");
  }
}
