import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { resolveProvider, chatCompletion, PROVIDERS, ProviderId } from "@/lib/ai-providers";
import { checkRateLimit, sanitizeForLLM } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TARGET_LABELS: Record<string, string> = {
  "agent-system": "Agent System Prompt",
  "chat-message": "Chat Message",
  "image-gen": "Image Generation",
  "code-gen": "Code Generation",
};

const TONE_LABELS: Record<string, string> = {
  professional: "Professional",
  creative: "Creative",
  technical: "Technical",
  educational: "Educational",
  friendly: "Friendly",
};

const LANGUAGE_LABELS: Record<string, string> = {
  fr: "French (Français)",
  en: "English",
  bilingual: "Bilingual (French + English)",
};

function buildSystemPrompt(target: string, tone: string, language: string): string {
  const targetLabel = TARGET_LABELS[target] || target;
  const toneLabel = TONE_LABELS[tone] || tone;
  const langLabel = LANGUAGE_LABELS[language] || language;

  return `You are an expert prompt engineer specializing in crafting optimized prompts for AI systems. Your task is to take a user's rough prompt/goal and transform it into a highly effective, well-structured prompt.

TARGET TYPE: ${targetLabel}
TONE: ${toneLabel}
OUTPUT LANGUAGE: ${langLabel}

GUIDELINES BY TARGET TYPE:
- Agent System Prompt: Create a comprehensive system prompt that defines the agent's role, capabilities, constraints, output format, and behavioral guidelines. Include error handling and edge cases.
- Chat Message: Craft a clear, specific message that will get the best possible response from an AI chat model. Include context, desired format, and any constraints.
- Image Generation: Create a vivid, detailed prompt for image generation AI. Include style, composition, lighting, colors, and quality modifiers.
- Code Generation: Create a precise prompt for code generation that specifies language, framework, input/output, edge cases, and coding conventions.

GENERAL BEST PRACTICES:
1. Be specific and detailed
2. Include clear instructions and constraints
3. Add examples when beneficial
4. Structure the prompt logically
5. Specify the desired output format
6. Include error handling or edge case considerations

RESPONSE FORMAT - You MUST respond with valid JSON only:
{
  "enhanced": "The enhanced prompt text here...",
  "suggestions": ["Suggestion 1 for further improvement", "Suggestion 2", "Suggestion 3"]
}

IMPORTANT: Return ONLY the JSON object, no markdown, no code fences, no extra text.`;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    if (!checkRateLimit(req, 10)) {
      return new Response(
        JSON.stringify({ error: "Trop de requêtes. Veuillez réessayer dans une minute." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const prompt = sanitizeForLLM(body.prompt || "", 5000);
    const target = body.target || "agent-system";
    const tone = body.tone || "professional";
    const language = body.language || "fr";

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Le prompt est requis" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = buildSystemPrompt(target, tone, language);
    const userMessage = `Here is my rough prompt/goal that I want you to enhance:\n\n${prompt}`;

    let enhanced = "";
    let suggestions: string[] = [];

    // Try resolveProvider first
    const providerInfo = await resolveProvider(payload.userId);

    if (providerInfo) {
      try {
        const { provider, apiKey, model } = providerInfo;
        const result = await chatCompletion({
          provider,
          apiKey,
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.7,
          maxTokens: 4096,
        });

        const content = result.content.trim();
        // Try to parse JSON response
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            enhanced = parsed.enhanced || content;
            suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
          } else {
            enhanced = content;
          }
        } catch {
          enhanced = content;
        }
      } catch (err) {
        console.error("Provider failed for prompt-generator:", err);
      }
    }

    // Fallback to Z-AI SDK
    if (!enhanced) {
      try {
        const { getZAI } = await import("@/lib/zai");
        const zai = await getZAI();

        const completion = await zai.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        });

        const responseText =
          completion.choices?.[0]?.message?.content ||
          completion.text ||
          completion.content ||
          (typeof completion === "string" ? completion : "");

        if (responseText) {
          try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              enhanced = parsed.enhanced || responseText;
              suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
            } else {
              enhanced = responseText;
            }
          } catch {
            enhanced = responseText;
          }
        }
      } catch (zaiErr) {
        console.error("Z-AI SDK fallback failed for prompt-generator:", zaiErr);
      }
    }

    // Final fallback
    if (!enhanced) {
      return new Response(
        JSON.stringify({
          error: "Aucun fournisseur IA n'est configuré. Veuillez ajouter une clé API dans les Paramètres.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ enhanced, suggestions }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
