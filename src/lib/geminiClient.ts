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
  const model = (account.model || "gemini-2.5-flash").trim();
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
