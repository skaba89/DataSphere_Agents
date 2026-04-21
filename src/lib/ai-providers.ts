/**
 * Multi-Provider AI Service
 * Supports: OpenAI, Anthropic (Claude), Groq, Qwen, OpenRouter
 * Each provider makes direct API calls using fetch — no external SDKs needed.
 */

// ─── Provider Configuration ──────────────────────────────────────────

export type ProviderId = "openai" | "anthropic" | "groq" | "qwen" | "openrouter";

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
  icon: string;
  color: string;
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  openai: {
    id: "openai",
    name: "OpenAI (ChatGPT)",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo", "o1-mini", "o3-mini"],
    icon: "🤖",
    color: "#10a37f",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic (Claude)",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-20250514",
    models: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
    icon: "🧠",
    color: "#d4a574",
  },
  groq: {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
    icon: "⚡",
    color: "#f55036",
  },
  qwen: {
    id: "qwen",
    name: "Qwen (Alibaba)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    defaultModel: "qwen-plus",
    models: ["qwen-plus", "qwen-turbo", "qwen-max", "qwen-long"],
    icon: "🌐",
    color: "#615baf",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    models: ["openai/gpt-4o-mini", "openai/gpt-4o", "anthropic/claude-3.5-sonnet", "meta-llama/llama-3.3-70b-instruct", "google/gemini-2.0-flash-001", "deepseek/deepseek-chat"],
    icon: "🔀",
    color: "#6366f1",
  },
};

// ─── AES-256-GCM Encryption for API keys ──────────────────────────────

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey) {
    // Use the env key directly (must be 32 bytes for AES-256)
    const key = Buffer.from(envKey, "utf-8");
    if (key.length === 32) return key;
    // If not 32 bytes, hash it to get a proper 32-byte key
    return createHash("sha256").update(envKey).digest();
  }
  // Fallback: derive from DATABASE_URL for consistency
  const source = process.env.DATABASE_URL || "datasphere-encryption-fallback-2024";
  return createHash("sha256").update(source).digest();
}

function encryptKey(plain: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plain, "utf-8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  // Format: base64(iv + authTag + encrypted)
  const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, "base64")]);
  return combined.toString("base64");
}

function decryptKey(enc: string): string {
  // First try the new AES format
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(enc, "base64");

    if (combined.length > IV_LENGTH + AUTH_TAG_LENGTH) {
      const iv = combined.subarray(0, IV_LENGTH);
      const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, undefined, "utf-8");
      decrypted += decipher.final("utf-8");
      return decrypted;
    }
  } catch {
    // Fall through to legacy decryption
  }

  // Legacy XOR-based decryption for existing keys in database
  const ENC_KEY_LEGACY = "ds-ak-2024-secure";
  try {
    const decoded = Buffer.from(enc, "base64").toString("binary");
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^ ENC_KEY_LEGACY.charCodeAt(i % ENC_KEY_LEGACY.length)
      );
    }
    return result;
  } catch {
    throw new Error("Failed to decrypt API key");
  }
}

export { encryptKey, decryptKey };

// ─── Chat Completion Types ───────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  provider: ProviderId;
  apiKey: string;
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  provider: ProviderId;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

// ─── Provider Implementations ────────────────────────────────────────

/**
 * OpenAI-compatible chat completion (works for OpenAI, Groq, Qwen, OpenRouter)
 */
async function openAICompatibleChat(
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const config = PROVIDERS[options.provider];
  const model = options.model || config.defaultModel;

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2048,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${options.apiKey}`,
  };

  // OpenRouter requires additional headers
  if (options.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://datasphere.agents.app";
    headers["X-Title"] = "DataSphere Agents";
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`${config.name} API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  return { content, model, provider: options.provider };
}

/**
 * Anthropic (Claude) chat completion — uses Messages API format
 */
async function anthropicChat(
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const model = options.model || PROVIDERS.anthropic.defaultModel;

  // Anthropic requires system message separate from messages array
  const systemMessage = options.messages.find((m) => m.role === "system");
  const nonSystemMessages = options.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const body: Record<string, unknown> = {
    model,
    messages: nonSystemMessages,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
  };

  if (systemMessage) {
    body.system = systemMessage.content;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": options.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`Anthropic API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content =
    data.content?.map((block: any) => block.text || "").join("") || "";

  return { content, model, provider: "anthropic" };
}

/**
 * Main chat completion function — routes to the correct provider
 */
export async function chatCompletion(
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  switch (options.provider) {
    case "anthropic":
      return anthropicChat(options);
    case "openai":
    case "groq":
    case "qwen":
    case "openrouter":
      return openAICompatibleChat(options);
    default:
      throw new Error(`Provider non supporté: ${options.provider}`);
  }
}

// ─── Streaming Support ───────────────────────────────────────────────

/**
 * OpenAI-compatible streaming (works for OpenAI, Groq, Qwen, OpenRouter)
 */
async function* openAICompatibleStream(
  options: ChatCompletionOptions
): AsyncGenerator<StreamChunk> {
  const config = PROVIDERS[options.provider];
  const model = options.model || config.defaultModel;

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2048,
    stream: true,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${options.apiKey}`,
  };

  if (options.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://datasphere.agents.app";
    headers["X-Title"] = "DataSphere Agents";
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`${config.name} API stream error (${response.status}): ${errText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Pas de stream disponible");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const dataStr = trimmed.slice(6).trim();
        if (dataStr === "[DONE]") {
          yield { content: "", done: true };
          return;
        }

        try {
          const parsed = JSON.parse(dataStr);
          const content =
            parsed.choices?.[0]?.delta?.content ||
            parsed.choices?.[0]?.message?.content ||
            "";
          if (content) {
            yield { content, done: false };
          }
        } catch {
          // skip malformed JSON
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith("data: ")) {
        const dataStr = trimmed.slice(6).trim();
        if (dataStr !== "[DONE]") {
          try {
            const parsed = JSON.parse(dataStr);
            const content =
              parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              yield { content, done: false };
            }
          } catch {
            // skip
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { content: "", done: true };
}

/**
 * Anthropic streaming — uses SSE Messages API format
 */
async function* anthropicStream(
  options: ChatCompletionOptions
): AsyncGenerator<StreamChunk> {
  const model = options.model || PROVIDERS.anthropic.defaultModel;

  const systemMessage = options.messages.find((m) => m.role === "system");
  const nonSystemMessages = options.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const body: Record<string, unknown> = {
    model,
    messages: nonSystemMessages,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
    stream: true,
  };

  if (systemMessage) {
    body.system = systemMessage.content;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": options.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`Anthropic stream error (${response.status}): ${errText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Pas de stream Anthropic disponible");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const dataStr = trimmed.slice(6).trim();

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            yield { content: parsed.delta.text, done: false };
          } else if (parsed.type === "message_stop") {
            yield { content: "", done: true };
            return;
          }
        } catch {
          // skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { content: "", done: true };
}

/**
 * Main streaming function — routes to the correct provider
 */
export async function* streamChatCompletion(
  options: ChatCompletionOptions
): AsyncGenerator<StreamChunk> {
  switch (options.provider) {
    case "anthropic":
      yield* anthropicStream(options);
      break;
    case "openai":
    case "groq":
    case "qwen":
    case "openrouter":
      yield* openAICompatibleStream(options);
      break;
    default:
      throw new Error(`Provider non supporté: ${options.provider}`);
  }
}

/**
 * Get user's active API key for a provider from the database
 */
export async function getUserProviderKey(
  userId: string,
  provider: ProviderId
): Promise<{ apiKey: string; model: string } | null> {
  const { db } = await import("@/lib/db");
  const record = await db.apiKey.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!record || !record.isActive) return null;
  return {
    apiKey: decryptKey(record.keyEnc),
    model: record.model || PROVIDERS[provider].defaultModel,
  };
}

/**
 * Get all active API keys for a user
 */
export async function getUserProviderKeys(userId: string) {
  const { db } = await import("@/lib/db");
  return db.apiKey.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Resolve the best provider for a user — tries preferred, then any active key
 */
export async function resolveProvider(
  userId: string,
  preferredProvider?: string
): Promise<{ provider: ProviderId; apiKey: string; model: string } | null> {
  // If preferred provider specified, try it first
  if (preferredProvider && preferredProvider !== "zai") {
    const key = await getUserProviderKey(userId, preferredProvider as ProviderId);
    if (key) {
      return { provider: preferredProvider as ProviderId, ...key };
    }
  }

  // Try any active provider in order of preference
  const fallbackOrder: ProviderId[] = ["openai", "anthropic", "groq", "qwen", "openrouter"];
  for (const prov of fallbackOrder) {
    const key = await getUserProviderKey(userId, prov);
    if (key) {
      return { provider: prov, ...key };
    }
  }

  return null;
}
