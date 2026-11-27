import { AdminSetting } from "@/models/AdminSetting";

export interface GeminiAccount {
  id: string;
  label: string;
  apiKey: string;
  model: string;
  isActive: boolean;
}

export interface GeminiConfig {
  accounts: GeminiAccount[];
  concurrencyLimit: number;
  totalBooksLimit: number;
}

export async function getGeminiConfig(): Promise<GeminiConfig> {
  const [accountsDoc, concurrencyDoc, totalBooksDoc] = await Promise.all([
    AdminSetting.findOne({ key: "geminiAccounts" }),
    AdminSetting.findOne({ key: "geminiConcurrencyLimit" }),
    AdminSetting.findOne({ key: "geminiTotalBooksLimit" }),
  ]);

  let accounts: GeminiAccount[] = [];
  if (Array.isArray(accountsDoc?.value)) {
    accounts = accountsDoc.value.filter(
      (a: any) => a && typeof a.apiKey === "string" && a.apiKey.trim() && a.isActive !== false
    );
  }

  const parsedConc = parseInt(String(concurrencyDoc?.value ?? "2"), 10);
  const concurrencyLimit = !isNaN(parsedConc) && parsedConc > 0 ? Math.min(parsedConc, 20) : 2;

  const parsedTotal = parseInt(String(totalBooksDoc?.value ?? "10"), 10);
  const totalBooksLimit = !isNaN(parsedTotal) && parsedTotal > 0 ? Math.min(parsedTotal, 100) : 10;

  return { accounts, concurrencyLimit, totalBooksLimit };
}

/**
 * Call Gemini REST API directly (zero Chromium RAM, no fallback).
 */
export async function generateWithGemini(
  account: GeminiAccount,
  prompt: string
): Promise<string> {
  const rawModel = (account.model || "gemini-3-flash-preview").trim();
  const model = rawModel === "gemini-2.5-pro" ? "gemini-3.1-pro-preview" : rawModel;
  const apiKey = account.apiKey.trim();
  if (!apiKey) {
    throw new Error(`Gemini account "${account.label || account.id}" has no API key.`);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API (${account.label || model}) HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text || "")
      .join("")
      .trim() || "";

  if (!text) {
    throw new Error(`Gemini API (${account.label || model}) returned empty content.`);
  }

  return text;
}

const ACTIVE_BOOKS_KEY = "__activeGeminiBookIds";

function getActiveBookSet(): Set<string> {
  const g = globalThis as unknown as Record<string, Set<string> | undefined>;
  if (!g[ACTIVE_BOOKS_KEY]) {
    g[ACTIVE_BOOKS_KEY] = new Set<string>();
  }
  return g[ACTIVE_BOOKS_KEY]!;
}

/**
 * Run a parallel worker pool across all active Gemini accounts.
 * Each account runs up to `concurrencyPerAccount` workers concurrently,
 * pulling the next unlocked item from the queue using an in-memory RAM lock
 * so two accounts never process the same item at the same time.
 */
export async function runGeminiWorkerPool<T extends { _id: any }>(
  items: T[],
  accounts: GeminiAccount[],
  concurrencyPerAccount: number,
  isAborted: () => boolean,
  processItem: (item: T, account: GeminiAccount) => Promise<void>
): Promise<void> {
  const activeSet = getActiveBookSet();
  let cursor = 0;

  const claimNextItem = (): T | null => {
    while (cursor < items.length) {
      const candidate = items[cursor++];
      const id = candidate._id.toString();
      if (activeSet.has(id)) {
        continue; // Already being scraped in RAM, skip to next
      }
      activeSet.add(id);
      return candidate;
    }
    return null;
  };

  const workers: Promise<void>[] = [];
  for (const account of accounts) {
    let accountExhausted = false;
    for (let w = 0; w < concurrencyPerAccount; w++) {
      workers.push(
        (async () => {
          while (!isAborted() && !accountExhausted) {
            const item = claimNextItem();
            if (!item) break;
            const id = item._id.toString();
            try {
              await processItem(item, account);
              // Minimal 100ms pacing between requests
              await new Promise((r) => setTimeout(r, 100));
            } catch (err: any) {
              if (String(err?.message || "").includes("HTTP 429")) {
                accountExhausted = true;
              }
            } finally {
              activeSet.delete(id);
            }
          }
        })()
      );
    }
  }

  await Promise.all(workers);
}
