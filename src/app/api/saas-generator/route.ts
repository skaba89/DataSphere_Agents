import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { resolveProvider, chatCompletion } from "@/lib/ai-providers";
import { checkRateLimit, sanitizeForLLM } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TECH_STACK_NAMES: Record<string, string> = {
  "nextjs-prisma": "Next.js 14 with Prisma ORM",
  "mern": "MERN Stack (MongoDB, Express, React, Node.js)",
  "django": "Django (Python)",
  "laravel": "Laravel (PHP)",
};

const DATABASE_NAMES: Record<string, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  mongodb: "MongoDB",
  sqlite: "SQLite",
};

function buildSystemPrompt(
  name: string,
  description: string,
  features: string[],
  techStack: string,
  database: string,
  options: { includeStripe: boolean; includeAuth: boolean; includeAdmin: boolean }
): string {
  const stackName = TECH_STACK_NAMES[techStack] || techStack;
  const dbName = DATABASE_NAMES[database] || database;
  const featureList = features.join(", ");
  const optionsList = [
    options.includeStripe ? "Stripe payment integration" : "",
    options.includeAuth ? "Authentication system" : "",
    options.includeAdmin ? "Admin panel" : "",
  ].filter(Boolean).join(", ");

  return `You are an expert SaaS architect and full-stack developer. Generate a complete, production-ready SaaS project structure based on the user's specifications.

PROJECT: ${name}
DESCRIPTION: ${description}
TECH STACK: ${stackName}
DATABASE: ${dbName}
FEATURES: ${featureList}
ADDITIONAL OPTIONS: ${optionsList || "None"}

Generate a comprehensive project structure with the following sections. Be detailed and include actual code snippets, file paths, and configurations.

You MUST respond with valid JSON only in this exact format:
{
  "architecture": "Full project directory tree with file paths showing the complete structure. Use indentation with ┣━ and ┗━ characters for tree visualization. Include all directories and key files.",
  "schema": "Complete database schema with models, relations, indexes, and migrations. Include the actual ORM schema code (Prisma/Mongoose/Django models/Laravel migrations) with all fields, types, and relationships.",
  "routes": "All API routes with their HTTP methods, request/response schemas, middleware, and handler descriptions. Include actual route handler code snippets.",
  "components": "Key UI components with their props, state management, and usage. Include actual React/Vue/Django template code for main components like Dashboard, Auth forms, Settings, etc.",
  "setupGuide": "Step-by-step setup guide including: 1) Prerequisites, 2) Installation commands, 3) Environment variables needed, 4) Database setup, 5) Running the project, 6) Deployment guide. Include actual terminal commands and configuration examples."
}

Make the output as detailed and production-ready as possible. Include:
- Proper error handling patterns
- Security best practices
- Environment variable configurations
- Docker setup if relevant
- CI/CD suggestions
- Testing strategy

IMPORTANT: Return ONLY the JSON object, no markdown, no code fences, no extra text.`;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting (lower limit for this heavy operation)
    if (!checkRateLimit(req, 5)) {
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
    const name = sanitizeForLLM(body.name || "", 200);
    const description = sanitizeForLLM(body.description || "", 500);
    const features = Array.isArray(body.features) ? body.features.slice(0, 10) : [];
    const techStack = body.techStack || "nextjs-prisma";
    const database = body.database || "postgresql";
    const options = body.options || { includeStripe: false, includeAuth: true, includeAdmin: false };

    if (!name || !description) {
      return new Response(
        JSON.stringify({ error: "Le nom et la description du projet sont requis" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (features.length === 0) {
      return new Response(
        JSON.stringify({ error: "Sélectionnez au moins une fonctionnalité" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = buildSystemPrompt(name, description, features, techStack, database, options);
    const userMessage = `Generate a complete SaaS project for: "${name}" - ${description}`;

    let result: {
      architecture: string;
      schema: string;
      routes: string;
      components: string;
      setupGuide: string;
    } | null = null;

    // Try resolveProvider first
    const providerInfo = await resolveProvider(payload.userId);

    if (providerInfo) {
      try {
        const { provider, apiKey, model } = providerInfo;
        const completion = await chatCompletion({
          provider,
          apiKey,
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.7,
          maxTokens: 8192,
        });

        const content = completion.content.trim();
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.architecture && parsed.schema) {
              result = {
                architecture: parsed.architecture || "",
                schema: parsed.schema || "",
                routes: parsed.routes || "",
                components: parsed.components || "",
                setupGuide: parsed.setupGuide || "",
              };
            }
          }
        } catch {
          // JSON parse failed, treat entire content as architecture
          result = {
            architecture: content,
            schema: "",
            routes: "",
            components: "",
            setupGuide: "",
          };
        }
      } catch (err) {
        console.error("Provider failed for saas-generator:", err);
      }
    }

    // Fallback to Z-AI SDK
    if (!result) {
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
              if (parsed.architecture && parsed.schema) {
                result = {
                  architecture: parsed.architecture || "",
                  schema: parsed.schema || "",
                  routes: parsed.routes || "",
                  components: parsed.components || "",
                  setupGuide: parsed.setupGuide || "",
                };
              }
            }
          } catch {
            result = {
              architecture: responseText,
              schema: "",
              routes: "",
              components: "",
              setupGuide: "",
            };
          }
        }
      } catch (zaiErr) {
        console.error("Z-AI SDK fallback failed for saas-generator:", zaiErr);
      }
    }

    // Final fallback
    if (!result) {
      return new Response(
        JSON.stringify({
          error: "Aucun fournisseur IA n'est configuré. Veuillez ajouter une clé API dans les Paramètres.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { "Content-Type": "application/json" } },
    );
  }
}
