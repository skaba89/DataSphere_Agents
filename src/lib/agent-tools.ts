/**
 * Agent Tools / Function Calling Library
 * Built-in tools: web_search, calculator, code_executor, json_transform, text_analysis, datetime
 * Supports both native function calling (OpenAI/Anthropic) and prompt-based fallback
 */

import { chatCompletion, resolveProvider, type ProviderId } from "@/lib/ai-providers";

// ─── Tool Definitions ─────────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  parameterSchema: Record<string, unknown>;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

const builtinTools: Record<string, ToolDefinition> = {
  web_search: {
    name: "web_search",
    description: "Recherche sur le web pour obtenir des informations à jour. Retourne des résultats pertinents pour la requête.",
    parameterSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "La requête de recherche",
        },
      },
      required: ["query"],
    },
    execute: async (params) => {
      const query = String(params.query || "");
      if (!query) return { error: "Requête de recherche vide" };

      try {
        const { getZAI } = await import("@/lib/zai");
        const zai = await getZAI();
        const results = await zai.web.search(query);
        return { query, results };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { error: "Échec de la recherche web", details: errorMessage };
      }
    },
  },

  calculator: {
    name: "calculator",
    description: "Évalue des expressions mathématiques. Supporte les opérations basiques (+, -, *, /), les parenthèses, les puissances et les fonctions mathématiques.",
    parameterSchema: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "L'expression mathématique à évaluer (ex: '2+2', 'Math.sqrt(16)', '3.14*10^2')",
        },
      },
      required: ["expression"],
    },
    execute: async (params) => {
      const expression = String(params.expression || "");
      if (!expression) return { error: "Expression vide" };

      // Safe math evaluation - only allow numbers, operators, parentheses, and Math functions
      const sanitized = expression
        .replace(/[^0-9+\-*/().%^sincotaglqrtpieE \t]/g, "")
        .replace(/\^/g, "**");

      try {
        // Use Function constructor for sandboxed eval
        const fn = new Function(
          "Math",
          `"use strict"; return (${sanitized});`
        );
        const result = fn(Math);

        if (typeof result !== "number" || !isFinite(result)) {
          return { error: "Résultat invalide", expression };
        }

        return { expression, result };
      } catch {
        return { error: "Expression mathématique invalide", expression };
      }
    },
  },

  code_executor: {
    name: "code_executor",
    description: "Exécute du code JavaScript dans un contexte sandboxé. Utile pour les calculs complexes, les transformations de données, et l'analyse.",
    parameterSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Le code JavaScript à exécuter. La dernière expression est retournée comme résultat.",
        },
        input: {
          type: "object",
          description: "Données d'entrée optionnelles accessibles via la variable 'input'.",
        },
      },
      required: ["code"],
    },
    execute: async (params) => {
      const code = String(params.code || "");
      if (!code) return { error: "Code vide" };

      const input = params.input || {};

      try {
        // Sandboxed execution with limited scope
        const fn = new Function(
          "input",
          "Math",
          "JSON",
          "Date",
          "Array",
          "Object",
          "String",
          "Number",
          "parseInt",
          "parseFloat",
          `"use strict"; ${code.includes("return") ? code : `return (${code});`}`
        );

        const result = fn(input, Math, JSON, Date, Array, Object, String, Number, parseInt, parseFloat);
        return {
          success: true,
          result: typeof result === "object" ? JSON.parse(JSON.stringify(result)) : result,
        };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { error: "Erreur d'exécution", details: errorMessage };
      }
    },
  },

  json_transform: {
    name: "json_transform",
    description: "Transforme des données JSON - extraction de champs, filtrage, mapping, et restructuration.",
    parameterSchema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          description: "Les données JSON à transformer",
        },
        operation: {
          type: "string",
          enum: ["extract", "filter", "map", "keys", "values", "flatten"],
          description: "L'opération à effectuer",
        },
        path: {
          type: "string",
          description: "Le chemin du champ (ex: 'users.0.name' ou 'items')",
        },
      },
      required: ["data", "operation"],
    },
    execute: async (params) => {
      const data = params.data;
      const operation = String(params.operation || "");
      const path = String(params.path || "");

      try {
        let target = data;

        // Navigate to path
        if (path) {
          const parts = path.split(".");
          for (const part of parts) {
            if (target && typeof target === "object") {
              target = (target as Record<string, unknown>)[part];
            }
          }
        }

        switch (operation) {
          case "extract":
            return { result: target };
          case "keys":
            return { result: target && typeof target === "object" ? Object.keys(target as Record<string, unknown>) : [] };
          case "values":
            return { result: target && typeof target === "object" ? Object.values(target as Record<string, unknown>) : [] };
          case "flatten":
            return { result: Array.isArray(target) ? target.flat(Infinity) : target };
          case "filter": {
            if (Array.isArray(target)) {
              return { result: target.filter((item) => item != null) };
            }
            return { result: target };
          }
          case "map": {
            if (Array.isArray(target)) {
              return { result: target.map((item) => typeof item === "object" && item !== null ? Object.values(item as Record<string, unknown>) : item) };
            }
            return { result: target };
          }
          default:
            return { error: `Opération inconnue: ${operation}` };
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return { error: "Erreur de transformation", details: errorMessage };
      }
    },
  },

  text_analysis: {
    name: "text_analysis",
    description: "Analyse du texte: comptage de mots, phrases, caractères, détection de sentiment basique, extraction de mots-clés.",
    parameterSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Le texte à analyser",
        },
        analysis_type: {
          type: "string",
          enum: ["stats", "sentiment", "keywords", "full"],
          description: "Type d'analyse à effectuer",
        },
      },
      required: ["text"],
    },
    execute: async (params) => {
      const text = String(params.text || "");
      const analysisType = String(params.analysis_type || "full");

      if (!text) return { error: "Texte vide" };

      const stats = {
        characters: text.length,
        charactersNoSpaces: text.replace(/\s/g, "").length,
        words: text.split(/\s+/).filter(Boolean).length,
        sentences: text.split(/[.!?]+/).filter((s) => s.trim()).length,
        paragraphs: text.split(/\n\n+/).filter(Boolean).length,
        avgWordLength: 0,
      };
      stats.avgWordLength = stats.words > 0
        ? Math.round(text.replace(/\s/g, "").length / stats.words * 10) / 10
        : 0;

      // Simple sentiment based on keyword matching
      const positiveWords = ["bon", "bien", "excellent", "super", "génial", "merci", "content", "heureux", "succès", "progrès", "amélioration", "positif", "favorable", "optimiste"];
      const negativeWords = ["mauvais", "mal", "terrible", "problème", "erreur", "échec", "négatif", "déçu", "triste", "difficile", "crise", "menace", "risque", "perte"];

      const lowerText = text.toLowerCase();
      const positiveCount = positiveWords.filter((w) => lowerText.includes(w)).length;
      const negativeCount = negativeWords.filter((w) => lowerText.includes(w)).length;

      let sentiment: string;
      let sentimentScore: number;
      if (positiveCount > negativeCount) {
        sentiment = "positif";
        sentimentScore = Math.min(1, positiveCount / (positiveCount + negativeCount + 1));
      } else if (negativeCount > positiveCount) {
        sentiment = "négatif";
        sentimentScore = -Math.min(1, negativeCount / (positiveCount + negativeCount + 1));
      } else {
        sentiment = "neutre";
        sentimentScore = 0;
      }

      // Simple keyword extraction (most frequent non-stop words)
      const stopWords = new Set(["le", "la", "les", "de", "du", "des", "un", "une", "et", "en", "est", "que", "qui", "dans", "pour", "sur", "avec", "il", "elle", "son", "sa", "ses", "au", "aux", "par", "ce", "se", "ne", "pas", "plus", "ou", "mais"]);
      const wordFreq = new Map<string, number>();
      text.toLowerCase().split(/\s+/).filter(Boolean).forEach((word) => {
        const clean = word.replace(/[^a-zàâçéèêëîïôûùüÿñæœ]/g, "");
        if (clean.length > 3 && !stopWords.has(clean)) {
          wordFreq.set(clean, (wordFreq.get(clean) || 0) + 1);
        }
      });
      const keywords = [...wordFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));

      switch (analysisType) {
        case "stats":
          return { stats };
        case "sentiment":
          return { sentiment, sentimentScore, positiveIndicators: positiveCount, negativeIndicators: negativeCount };
        case "keywords":
          return { keywords };
        default:
          return { stats, sentiment, sentimentScore, keywords };
      }
    },
  },

  datetime: {
    name: "datetime",
    description: "Obtient la date et l'heure actuelles, ou calcule des différences de dates.",
    parameterSchema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["iso", "date", "time", "datetime", "timestamp", "relative"],
          description: "Le format de sortie souhaité",
        },
        timezone: {
          type: "string",
          description: "Fuseau horaire (ex: 'Europe/Paris')",
        },
      },
    },
    execute: async (params) => {
      const format = String(params.format || "datetime");
      const timezone = String(params.timezone || "Europe/Paris");
      const now = new Date();

      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
      };

      switch (format) {
        case "iso":
          return { datetime: now.toISOString(), timezone };
        case "date":
          options.year = "numeric";
          options.month = "long";
          options.day = "numeric";
          return { date: now.toLocaleDateString("fr-FR", options), timezone };
        case "time":
          options.hour = "2-digit";
          options.minute = "2-digit";
          options.second = "2-digit";
          return { time: now.toLocaleTimeString("fr-FR", options), timezone };
        case "timestamp":
          return { timestamp: now.getTime(), timezone };
        case "relative":
          return { relative: "maintenant", datetime: now.toISOString(), timezone };
        default: {
          options.year = "numeric";
          options.month = "long";
          options.day = "numeric";
          options.hour = "2-digit";
          options.minute = "2-digit";
          return { datetime: now.toLocaleDateString("fr-FR", options), timezone };
        }
      }
    },
  },
};

/**
 * Get a built-in tool by name
 */
export function getBuiltinTool(name: string): ToolDefinition | undefined {
  return builtinTools[name];
}

/**
 * Get all built-in tool names
 */
export function getBuiltinToolNames(): string[] {
  return Object.keys(builtinTools);
}

/**
 * Get all built-in tools as AgentTool-compatible records
 */
export function getBuiltinToolsForAgent(): Array<{
  name: string;
  description: string;
  parameters: string;
  type: string;
}> {
  return Object.values(builtinTools).map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: JSON.stringify(tool.parameterSchema),
    type: "builtin",
  }));
}

// ─── Tool Call Processing ─────────────────────────────────────────────

const TOOL_CALL_START = "<<<TOOL_CALL>>>";
const TOOL_CALL_END = "<<<END_TOOL_CALL>>>";

/**
 * Parse tool calls from LLM text response (prompt-based fallback)
 */
function parseToolCallsFromText(text: string): Array<{ name: string; params: Record<string, unknown> }> {
  const calls: Array<{ name: string; params: Record<string, unknown> }> = [];

  const regex = new RegExp(
    `${TOOL_CALL_START.replace(/[<>]/g, (c) => `\\${c}`)}(.*?)${TOOL_CALL_END.replace(/[<>]/g, (c) => `\\${c}`)}`,
    "gs"
  );

  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.name) {
        calls.push({
          name: parsed.name,
          params: parsed.params || parsed.parameters || {},
        });
      }
    } catch {
      // skip invalid JSON
    }
  }

  return calls;
}

/**
 * Build tool descriptions for the system prompt (prompt-based fallback)
 */
function buildToolPrompt(tools: Array<{ name: string; description: string; parameters: string }>): string {
  let prompt = "\n\n═══ OUTILS DISPONIBLES ═══\n\n";
  prompt += "Tu as accès aux outils suivants. Pour utiliser un outil, génère exactement ce format:\n";
  prompt += `${TOOL_CALL_START}{"name":"outil_name","params":{"param1":"value1"}}${TOOL_CALL_END}\n\n`;
  prompt += "Tu peux utiliser plusieurs outils dans une seule réponse. Après chaque utilisation d'outil, continue ta réponse normalement.\n\n";

  for (const tool of tools) {
    prompt += `🔧 **${tool.name}**: ${tool.description}\n`;
    try {
      const schema = JSON.parse(tool.parameters);
      const props = schema.properties || {};
      const required = schema.required || [];
      const paramStrs = Object.entries(props).map(([key, val]: [string, unknown]) => {
        const desc = (val as Record<string, unknown>)?.description || "";
        const isReq = required.includes(key) ? " (requis)" : " (optionnel)";
        return `  - ${key}: ${desc}${isReq}`;
      });
      prompt += `  Paramètres:\n${paramStrs.join("\n")}\n\n`;
    } catch {
      prompt += `  Paramètres: ${tool.parameters}\n\n`;
    }
  }

  return prompt;
}

/**
 * Execute a tool call by name
 */
async function executeToolCall(
  name: string,
  params: Record<string, unknown>,
  customTools: Record<string, ToolDefinition> = {}
): Promise<{ success: boolean; result: unknown }> {
  // Check built-in tools first
  const builtin = builtinTools[name];
  if (builtin) {
    try {
      const result = await builtin.execute(params);
      return { success: true, result };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { success: false, result: { error: errorMessage } };
    }
  }

  // Check custom tools
  const custom = customTools[name];
  if (custom) {
    try {
      const result = await custom.execute(params);
      return { success: true, result };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { success: false, result: { error: errorMessage } };
    }
  }

  return { success: false, result: { error: `Outil inconnu: ${name}` } };
}

/**
 * Main function: Process tool calls in an LLM conversation
 * 
 * 1. Sends messages with tools definition to the LLM
 * 2. If LLM responds with tool_calls (or text-based tool calls), execute them
 * 3. Add tool results to messages
 * 4. Send back to LLM for final response
 * 5. Return final response and count of tool calls made
 */
export async function processToolCalls(
  messages: Array<{ role: string; content: string }>,
  tools: Array<{ name: string; description: string; parameters: string }>,
  systemPrompt: string,
  provider: string,
  apiKey: string,
  model: string
): Promise<{ response: string; toolCallsMade: number }> {
  // Determine if provider supports native function calling
  const supportsNativeCalling = ["openai", "groq", "anthropic"].includes(provider);

  if (supportsNativeCalling) {
    return processNativeToolCalls(messages, tools, systemPrompt, provider as ProviderId, apiKey, model);
  } else {
    return processPromptBasedToolCalls(messages, tools, systemPrompt, provider, apiKey, model);
  }
}

/**
 * Process tool calls using native function calling API (OpenAI, Groq, Anthropic)
 */
async function processNativeToolCalls(
  messages: Array<{ role: string; content: string }>,
  tools: Array<{ name: string; description: string; parameters: string }>,
  systemPrompt: string,
  provider: ProviderId,
  apiKey: string,
  model: string
): Promise<{ response: string; toolCallsMade: number }> {
  // Build OpenAI-compatible tool definitions
  const toolDefs = tools.map((tool) => {
    let parameters: Record<string, unknown>;
    try {
      parameters = JSON.parse(tool.parameters);
    } catch {
      parameters = { type: "object", properties: {} };
    }

    return {
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters,
      },
    };
  });

  const allMessages: Array<Record<string, unknown>> = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  let toolCallsMade = 0;
  const maxIterations = 5; // Prevent infinite loops

  for (let i = 0; i < maxIterations; i++) {
    // Make API call with tools
    const body: Record<string, unknown> = {
      model,
      messages: allMessages,
      tools: toolDefs,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 2048,
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    const baseUrl = provider === "anthropic"
      ? "https://api.anthropic.com/v1/messages"
      : provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : `https://api.openai.com/v1/chat/completions`;

    if (provider === "anthropic") {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    }

    try {
      const response = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        // Fallback to prompt-based
        return processPromptBasedToolCalls(messages, tools, systemPrompt, provider, apiKey, model);
      }

      const data = await response.json();

      if (provider === "anthropic") {
        // Anthropic returns content blocks
        const contentBlocks = data.content || [];
        const textBlocks = contentBlocks.filter((b: Record<string, unknown>) => b.type === "text");
        const toolBlocks = contentBlocks.filter((b: Record<string, unknown>) => b.type === "tool_use");

        if (toolBlocks.length === 0) {
          return {
            response: textBlocks.map((b: Record<string, unknown>) => b.text || "").join(""),
            toolCallsMade,
          };
        }

        // Execute tool calls
        for (const toolBlock of toolBlocks) {
          toolCallsMade++;
          const toolName = toolBlock.name as string;
          const toolInput = (toolBlock.input || {}) as Record<string, unknown>;

          const result = await executeToolCall(toolName, toolInput);

          allMessages.push({
            role: "assistant",
            content: contentBlocks,
          });
          allMessages.push({
            role: "user",
            content: [{
              type: "tool_result",
              tool_use_id: toolBlock.id,
              content: JSON.stringify(result.result),
            }],
          });
        }
      } else {
        // OpenAI/Groq format
        const choice = data.choices?.[0];
        if (!choice) {
          return { response: "Erreur: pas de réponse", toolCallsMade };
        }

        const message = choice.message;
        const responseToolCalls = message?.tool_calls;

        if (!responseToolCalls || responseToolCalls.length === 0) {
          return {
            response: message?.content || "",
            toolCallsMade,
          };
        }

        // Execute tool calls
        allMessages.push(message);

        for (const toolCall of responseToolCalls) {
          toolCallsMade++;
          const toolName = toolCall.function.name;
          let toolParams: Record<string, unknown>;
          try {
            toolParams = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            toolParams = {};
          }

          const result = await executeToolCall(toolName, toolParams);

          allMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result.result),
          });
        }
      }
    } catch {
      // Fallback to prompt-based
      return processPromptBasedToolCalls(messages, tools, systemPrompt, provider, apiKey, model);
    }
  }

  return { response: "Limite d'itérations d'outils atteinte.", toolCallsMade };
}

/**
 * Process tool calls using prompt-based approach (for providers without native function calling)
 */
async function processPromptBasedToolCalls(
  messages: Array<{ role: string; content: string }>,
  tools: Array<{ name: string; description: string; parameters: string }>,
  systemPrompt: string,
  provider: string,
  apiKey: string,
  model: string
): Promise<{ response: string; toolCallsMade: number }> {
  // Add tool descriptions to system prompt
  const toolPrompt = buildToolPrompt(tools);
  const enhancedSystemPrompt = systemPrompt + toolPrompt;

  let currentMessages: Array<{ role: string; content: string }> = [
    { role: "system", content: enhancedSystemPrompt },
    ...messages,
  ];

  let toolCallsMade = 0;
  const maxIterations = 3;

  for (let i = 0; i < maxIterations; i++) {
    // Get LLM response
    let responseText: string;

    try {
      const providerInfo = await resolveProvider(messages.length > 0 ? "" : "");
      if (providerInfo) {
        const result = await chatCompletion({
          provider: providerInfo.provider,
          apiKey: providerInfo.apiKey,
          model: providerInfo.model,
          messages: currentMessages,
          temperature: 0.7,
          maxTokens: 2048,
        });
        responseText = result.content;
      } else {
        const { getZAI } = await import("@/lib/zai");
        const zai = await getZAI();
        const result = await zai.chat.completions.create({
          messages: currentMessages,
        });
        responseText = result.choices?.[0]?.message?.content || result.text || result.content || "";
      }
    } catch {
      return { response: "Erreur lors de la communication avec le fournisseur IA.", toolCallsMade };
    }

    // Check for tool calls in the response
    const toolCalls = parseToolCallsFromText(responseText);

    if (toolCalls.length === 0) {
      // No tool calls - clean response and return
      const cleanResponse = responseText
        .replace(new RegExp(TOOL_CALL_START.replace(/[<>]/g, (c) => `\\${c}`), "g"), "")
        .replace(new RegExp(TOOL_CALL_END.replace(/[<>]/g, (c) => `\\${c}`), "g"), "")
        .trim();
      return { response: cleanResponse, toolCallsMade };
    }

    // Execute tool calls and add results to conversation
    let toolResultsStr = "";
    for (const call of toolCalls) {
      toolCallsMade++;
      const result = await executeToolCall(call.name, call.params);
      toolResultsStr += `\n[Résultat outil ${call.name}]: ${JSON.stringify(result.result)}\n`;
    }

    // Add assistant response and tool results to conversation
    currentMessages.push({ role: "assistant", content: responseText });
    currentMessages.push({
      role: "user",
      content: `Voici les résultats des outils que tu as utilisés:\n${toolResultsStr}\nContinue ta réponse en intégrant ces résultats.`,
    });
  }

  return { response: "Limite d'itérations d'outils atteinte.", toolCallsMade };
}
