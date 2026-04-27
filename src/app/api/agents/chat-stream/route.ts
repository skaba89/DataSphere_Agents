import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { resolveProvider, streamChatCompletion, PROVIDERS, ProviderId } from "@/lib/ai-providers";
import { checkRateLimit, sanitizeForLLM, isValidAgentId, checkPlanRateLimit } from "@/lib/security";
import { checkTokenQuota, checkConversationQuota, recordUsage, getUserPlan } from "@/lib/saas/quotas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tool-use instructions added to system prompts for execution agents
const TOOL_SYSTEM_SUFFIX = `

═══ CAPACITÉS D'EXÉCUTION ═══

Tu es un agent IA capable d'EXÉCUTER des tâches, pas seulement de parler. Tu DOIS utiliser les marqueurs spéciaux ci-dessous pour afficher des résultats structurés et professionnels.

QUAND tu dois afficher des données tabulaires, utilise:
<<<TABLE>>>
Colonne1|Colonne2|Colonne3
---|---|---
Valeur1|Valeur2|Valeur3
<<<END_TABLE>>>

QUAND tu dois afficher du code, utilise:
<<<CODE lang="javascript">
// ton code ici
<<<END_CODE>>>
Langues supportées: javascript, python, html, css, sql, typescript, bash, json

QUAND tu dois suivre une tâche, utilise:
<<<TASK>>>{"title":"Nom de la tâche","status":"running|completed|failed","progress":0-100}<<<END_TASK>>>
- status: "running" quand tu travailles dessus, "completed" quand c'est fini, "failed" en cas d'erreur
- progress: 0-100, mets à jour avec plusieurs marqueurs TASK si nécessaire
- TOUJOURS commencer par un TASK au début de ta réponse

QUAND tu dois afficher un graphique, utilise:
<<<CHART type="bar">>>
[{"nom":"Catégorie A","valeur":30},{"nom":"Catégorie B","valeur":50}]
<<<END_CHART>>>
- type peut être "bar", "line", ou "pie"
- Le premier champ est le label (string), les autres sont des valeurs numériques
- Utilise des noms de champs descriptifs en français

QUAND tu fais une recherche web, utilise:
<<<SEARCH>>>terme de recherche<<<END_SEARCH>>>

QUAND tu fais référence à une image, utilise:
<<<IMAGE>>>https://url-de-l-image.com/image.jpg<<<END_IMAGE>>>

═══ RÈGLES DE FORMATAGE ═══

1. Utilise TOUJOURS ces marqueurs quand c'est pertinent — ne te contente PAS de texte brut
2. Pour les analyses de données → TABLE + CHART
3. Pour les scripts et automatisations → CODE + TASK
4. Pour les rapports → TABLE + CHART + TASK
5. Commence TOUJOURS par un TASK quand tu entreprends une action
6. Marque TASK comme "completed" avec progress:100 quand tu as fini
7. Tu peux utiliser plusieurs marqueurs dans une seule réponse
8. Entre les marqueurs, utilise du Markdown normal pour expliquer
9. Sois PROFESSIONNEL et PRÉCIS dans tes réponses
10. Utilise le français pour tous les labels et titres
11. Pour les nombres, utilise le format français (espace comme séparateur de milliers, virgule pour les décimales)
12. Les tableaux doivent avoir au moins 2 lignes de données pour être pertinents
13. Les graphiques doivent avoir au moins 3 points de données
`;

const AGENT_TYPE_PROMPTS: Record<string, string> = {
  support: `Tu es un agent de support client expert et empathique. Tu résous les problèmes des utilisateurs de manière professionnelle et structurée.

MÉTHODOLOGIE DE SUPPORT:
1. Accueille chaleureusement l'utilisateur et reformule son problème
2. Analyse la situation et identifie la cause racine
3. Propose une solution étape par étape
4. Vérifie que la solution fonctionne
5. Offre des conseils préventifs

FORMAT DE RÉPONSE:
- Commence TOUJOURS par un TASK pour suivre la résolution: <<<TASK>>>{"title":"Résolution: [problème]","status":"running","progress":0}<<<END_TASK>>>
- Utilise TABLE pour les étapes de dépannage ou les FAQs
- Utilise CODE pour les commandes ou scripts de résolution
- Mets à jour le TASK progressivement (progress: 25, 50, 75, 100)
- Termine avec <<<TASK>>>{"title":"Résolution: [problème]","status":"completed","progress":100}<<<END_TASK>>>

RÈGLES:
- Sois patient et professionnel
- Utilise un langage clair et accessible
- Propose toujours plusieurs solutions quand possible`,

  finance: `Tu es un analyste financier IA expert et certifié. Tu analyses les données financières avec précision et fournis des rapports professionnels détaillés.

DOMAINES D'EXPERTISE:
- Analyse financière (bilans, comptes de résultat, flux de trésorerie)
- Prévision et modélisation financière
- Gestion des risques et analyse de portefeuille
- KPIs et tableaux de bord financiers
- Conformité réglementaire

FORMAT DE RÉPONSE:
- Commence par un TASK: <<<TASK>>>{"title":"Analyse financière","status":"running","progress":0}<<<END_TASK>>>
- Utilise TABLE pour les rapports financiers, bilans, et tableaux de données
- Utilise CHART type="bar" pour les comparaisons, CHART type="line" pour les tendances, CHART type="pie" pour les répartitions
- Fournis toujours des chiffres précis et des pourcentages
- Termine avec des insights actionnables et des recommandations
- Marque TASK comme completed à la fin

RÈGLES:
- Toujours inclure des données chiffrées
- Préciser les sources et hypothèses
- Utiliser le format français pour les nombres (espace comme séparateur de milliers)
- Fournir des analyses comparatives quand pertinent`,

  data: `Tu es un analyste de données IA expert. Tu analyses, transforme et visualise les données de manière professionnelle et actionable.

CAPACITÉS:
- Analyse statistique descriptive et inférentielle
- Visualisation de données (graphiques, tableaux, dashboards)
- Transformation et nettoyage de données
- Requêtes SQL et scripts Python/R
- Interprétation de tendances et patterns

FORMAT DE RÉPONSE:
- Commence par un TASK: <<<TASK>>>{"title":"Analyse de données","status":"running","progress":0}<<<END_TASK>>>
- Utilise TABLE pour afficher les jeux de données et résultats d'analyse
- Utilise CHART type="bar"|"line"|"pie" pour visualiser les tendances et distributions
- Utilise CODE pour les requêtes SQL, scripts Python, ou transformations
- Fournis des statistiques descriptives (moyenne, médiane, écart-type, min, max)
- Termine avec des insights clés et des recommandations

RÈGLES:
- Toujours valider la qualité des données avant analyse
- Mentionner les limitations et biais potentiels
- Utiliser des exemples concrets
- Si des documents sont fournis, les analyser en priorité`,

  sales: `Tu es un agent commercial IA expert en stratégie de vente et développement commercial. Tu aides à la prospection, au suivi des deals et à l'optimisation des ventes.

DOMAINES D'EXPERTISE:
- Prospection et acquisition clients
- Gestion du pipeline commercial (CRM)
- Négociation et closing
- Analyse du marché et de la concurrence
- Stratégie de pricing et offres commerciales

FORMAT DE RÉPONSE:
- Commence par un TASK: <<<TASK>>>{"title":"Action commerciale","status":"running","progress":0}<<<END_TASK>>>
- Utilise TABLE pour les pipelines, CRM, et listes de prospects
- Utilise CHART type="bar" pour les prévisions de ventes, type="line" pour les tendances, type="pie" pour les répartitions
- Propose des stratégies concrètes avec des métriques et des KPIs
- Termine avec un plan d'action clair

RÈGLES:
- Proposer des métriques mesurables
- Adapter le ton au contexte (professionnel mais dynamique)
- Inclure des templates d'emails ou scripts d'appel quand pertinent
- Prioriser les actions à fort impact`,

  webbuilder: `Tu es un développeur web IA expert. Tu conçois et génère des sites web modernes, responsifs et professionnels en HTML/CSS/JavaScript.

CAPACITÉS:
- Génération de sites web complets (HTML5, CSS3, JavaScript)
- Design responsive et mobile-first
- Frameworks CSS (Tailwind, Bootstrap)
- Animations et interactions modernes
- Optimisation SEO et performance

FORMAT DE RÉPONSE:
- Commence par un TASK: <<<TASK>>>{"title":"Création du site web","status":"running","progress":0}<<<END_TASK>>>
- Génère du code HTML/CSS/JS complet et fonctionnel
- Utilise CODE lang="html" pour le code du site
- Décris les fonctionnalités et le design choisi
- Termine avec <<<TASK>>>{"title":"Création du site web","status":"completed","progress":100}<<<END_TASK>>>

RÈGLES:
- Toujours générer du code complet et fonctionnel
- Utiliser un design moderne et professionnel
- Inclure la responsivité mobile
- Commenter le code pour l'utilisateur`,

  image: `Tu es un designer IA expert en création visuelle. Tu aides les utilisateurs à créer des images, logos, illustrations et designs professionnels.

CAPACITÉS:
- Génération d'images à partir de descriptions textuelles
- Conseils en design et composition visuelle
- Création de palettes de couleurs
- Suggestions de styles artistiques

FORMAT DE RÉPONSE:
- Commence par décrire l'image que tu vas générer
- Utilise <<<IMAGE>>>[url de l'image]<<<END_IMAGE>>> pour afficher l'image
- Fournis des variantes et suggestions d'amélioration
- Explique les choix de design

RÈGLES:
- Décrire l'image en détail avant de la générer
- Proposer des améliorations et variantes
- Adapter le style au contexte de l'utilisateur`,

  custom: `Tu es un agent IA polyvalent, intelligent et capable d'exécuter des tâches diverses avec professionnalisme.

CAPACITÉS:
- Analyse et synthèse d'informations
- Rédaction et rédaction créative
- Planification et organisation
- Résolution de problèmes
- Génération de code et de contenu

FORMAT DE RÉPONSE:
- Adapte ton format au type de tâche demandée
- Utilise les marqueurs appropriés (TABLE, CHART, CODE, TASK)
- Sois structuré et professionnel
- Montre ta progression avec TASK quand tu exécutes une tâche complexe

RÈGLES:
- Toujours fournir des réponses détaillées et utiles
- Demander des clarifications si la demande est ambiguë
- Proposer des alternatives quand pertinent
- Être proactif dans les suggestions`,
};

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 20 requests per minute for chat
    if (!checkRateLimit(req, 20)) {
      return new Response(
        JSON.stringify({ error: "Trop de requêtes. Veuillez réessayer dans une minute." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

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

    // Plan-based rate limiting
    const { planName } = await getUserPlan(payload.userId);
    const planRateResult = checkPlanRateLimit(payload.userId, planName);
    if (!planRateResult.allowed) {
      return new Response(
        JSON.stringify({
          error: `Limite de messages atteinte (${planName === 'free' ? '15' : planName === 'pro' ? '60' : '120'} messages/minute sur le plan ${planName === 'free' ? 'Gratuit' : planName === 'pro' ? 'Pro' : 'Enterprise'}). Réessayez dans ${planRateResult.retryAfter} secondes.`,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(planRateResult.retryAfter || 60),
          },
        }
      );
    }

    const body = await req.json();
    const agentId = body.agentId || "";
    const message = sanitizeForLLM(body.message || "", 5000);
    const conversationId = body.conversationId;
    const requestedProvider = body.provider;

    if (!agentId || !message) {
      return new Response(
        JSON.stringify({ error: "Agent ID et message requis" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate agentId format
    if (!isValidAgentId(agentId)) {
      return new Response(
        JSON.stringify({ error: "Format d'agent ID invalide" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent non trouvé" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check conversation quota if creating a new conversation
    if (!conversationId) {
      const convQuota = await checkConversationQuota(payload.userId);
      if (!convQuota.allowed) {
        return new Response(
          JSON.stringify({ error: convQuota.reason, quotaExceeded: true, quotaType: "conversations" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Check token quota (estimate ~500 tokens per message)
    const tokenQuota = await checkTokenQuota(payload.userId, 500);
    if (!tokenQuota.allowed) {
      return new Response(
        JSON.stringify({ error: tokenQuota.reason, quotaExceeded: true, quotaType: "tokens" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    let convId = conversationId;

    if (!convId) {
      const conversation = await db.conversation.create({
        data: {
          userId: payload.userId,
          agentId,
          title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
        },
      });
      convId = conversation.id;
    }

    await db.chatMessage.create({
      data: {
        conversationId: convId,
        role: "user",
        content: message,
      },
    });

    let ragContext = "";
    if (agent.type === "data" || agent.type === "finance" || agent.type === "support") {
      const docs = await db.document.findMany({
        where: { userId: payload.userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
      if (docs.length > 0) {
        ragContext = "\n\n═══ DOCUMENTS DE L'UTILISATEUR ═══\n";
        ragContext += `L'utilisateur a téléchargé ${docs.length} document(s). Voici leur contenu pour référence:\n\n`;

        for (const doc of docs) {
          ragContext += `--- Document: ${doc.filename} (taille: ${(doc.content.length / 1024).toFixed(1)} Ko) ---\n`;
          // Smart chunking: take first 1500 chars + last 500 chars for long docs
          if (doc.content.length > 3000) {
            ragContext += doc.content.slice(0, 1500) + "\n...[contenu intermédiaire omis]...\n" + doc.content.slice(-500) + "\n\n";
          } else {
            ragContext += doc.content.slice(0, 2500) + "\n\n";
          }
        }
        ragContext += "IMPORTANT: Réfère-toi à ces documents quand c'est pertinent. Cite les noms de fichiers quand tu utilises des informations issues de ces documents.";
      } else if (agent.type === "data") {
        ragContext = "\n\nL'utilisateur n'a pas encore téléchargé de documents. Encourage-le à en télécharger dans la section 'Documents' pour que tu puisses les analyser. Tu peux quand même l'aider avec des analyses générales.";
      }
    }

    // Build enhanced system prompt with tool-use capabilities
    let fullSystemPrompt = agent.systemPrompt + ragContext;

    const agentType = agent.type as string;
    const isExecutionAgent = ["support", "finance", "data", "sales", "webbuilder", "image", "custom"].includes(agentType);

    if (isExecutionAgent) {
      const typePrompt = AGENT_TYPE_PROMPTS[agentType] || AGENT_TYPE_PROMPTS.custom;
      fullSystemPrompt = fullSystemPrompt + "\n\n" + typePrompt + TOOL_SYSTEM_SUFFIX;
    }

    const previousMessages = await db.chatMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    const chatHistory = previousMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Adjust parameters based on agent type
    const agentTemperature = agent.type === "data" || agent.type === "finance" ? 0.3 : 0.7;
    const agentMaxTokens = agent.type === "webbuilder" ? 16384 : agent.type === "finance" ? 4096 : agent.type === "image" ? 1024 : 2048;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = "";

        try {
          // Send conversationId first
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "meta", conversationId: convId })}\n\n`
            )
          );

          // Resolve the AI provider
          const providerInfo = await resolveProvider(payload.userId, requestedProvider);

          if (providerInfo) {
            // Use multi-provider AI
            const { provider, apiKey, model } = providerInfo;
            const providerName = PROVIDERS[provider]?.name || provider;

            try {
              const streamGen = streamChatCompletion({
                provider,
                apiKey,
                model,
                messages: [
                  { role: "system", content: fullSystemPrompt },
                  ...chatHistory,
                ],
                stream: true,
                temperature: agentTemperature,
                maxTokens: agentMaxTokens,
              });

              for await (const chunk of streamGen) {
                if (chunk.done) break;
                if (chunk.content) {
                  fullResponse += chunk.content;
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "token", content: chunk.content })}\n\n`
                    )
                  );
                }
              }
            } catch (streamErr: any) {
              console.error(`${providerName} streaming failed:`, streamErr?.message);
              // Try non-streaming fallback for this provider
              try {
                const { chatCompletion } = await import("@/lib/ai-providers");
                const result = await chatCompletion({
                  provider,
                  apiKey,
                  model,
                  messages: [
                    { role: "system", content: fullSystemPrompt },
                    ...chatHistory,
                  ],
                  temperature: agentTemperature,
                  maxTokens: agentMaxTokens,
                });
                if (result.content) {
                  const words = result.content.split(/(?<=\s)/);
                  for (const word of words) {
                    fullResponse += word;
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ type: "token", content: word })}\n\n`
                      )
                    );
                    await new Promise((r) => setTimeout(r, 15));
                  }
                }
              } catch (nonStreamErr: any) {
                console.error(`${providerName} non-streaming also failed:`, nonStreamErr?.message);
              }
            }
          }

          // Fallback to z-ai-web-dev-sdk if no provider configured or all providers failed
          if (!fullResponse) {
            try {
              const { getZAI } = await import("@/lib/zai");
              const zai = await getZAI();
              let streamingWorked = false;

              try {
                const completion = await zai.chat.completions.create({
                  messages: [
                    { role: "system", content: fullSystemPrompt },
                    ...chatHistory,
                  ],
                  stream: true,
                });

                if (completion && typeof completion === "object" && typeof completion.getReader === "function") {
                  const reader = (completion as ReadableStream<Uint8Array>).getReader();
                  const decoder = new TextDecoder();
                  let sseBuffer = "";

                  try {
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      const chunk = decoder.decode(value, { stream: true });
                      sseBuffer += chunk;
                      const lines = sseBuffer.split("\n");
                      sseBuffer = lines.pop() || "";

                      for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith("data: ")) continue;
                        const dataStr = trimmed.slice(6).trim();
                        if (dataStr === "[DONE]") continue;
                        try {
                          const parsed = JSON.parse(dataStr);
                          const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || "";
                          if (content) {
                            fullResponse += content;
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content })}\n\n`));
                            streamingWorked = true;
                          }
                        } catch (_e) { /* skip */ }
                      }
                    }
                    if (sseBuffer.trim()) {
                      const trimmed = sseBuffer.trim();
                      if (trimmed.startsWith("data: ")) {
                        const dataStr = trimmed.slice(6).trim();
                        if (dataStr !== "[DONE]") {
                          try {
                            const parsed = JSON.parse(dataStr);
                            const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || "";
                            if (content) {
                              fullResponse += content;
                              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content })}\n\n`));
                              streamingWorked = true;
                            }
                          } catch (_e) { /* skip */ }
                        }
                      }
                    }
                  } finally {
                    reader.releaseLock();
                  }
                }
              } catch (streamErr) {
                console.error("Z-AI streaming failed:", streamErr);
              }

              if (!streamingWorked && !fullResponse) {
                const result = await zai.chat.completions.create({
                  messages: [
                    { role: "system", content: fullSystemPrompt },
                    ...chatHistory,
                  ],
                });
                const responseText = result.choices?.[0]?.message?.content || result.text || result.content || "";
                const finalText = !responseText && typeof result === "string" ? result : responseText;
                if (finalText) {
                  const words = finalText.split(/(?<=\s)/);
                  for (const word of words) {
                    fullResponse += word;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", content: word })}\n\n`));
                    await new Promise((r) => setTimeout(r, 15));
                  }
                }
              }
            } catch (zaiErr) {
              console.error("Z-AI SDK fallback failed:", zaiErr);
            }
          }

          // Final fallback
          if (!fullResponse) {
            fullResponse = "Désolé, aucun fournisseur IA n'est configuré. Veuillez ajouter une clé API dans les Paramètres (OpenAI, Anthropic, Groq, Qwen ou OpenRouter).";
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "token", content: fullResponse })}\n\n`
              )
            );
          }

          // Save response to DB
          await db.chatMessage.create({
            data: {
              conversationId: convId,
              role: "assistant",
              content: fullResponse,
            },
          });

          // Record usage event
          await recordUsage({
            userId: payload.userId,
            eventType: 'chat_message',
            tokensUsed: Math.ceil(fullResponse.length / 4), // rough token estimate
            provider: providerInfo?.provider || 'zai',
            agentId: agentId,
          });

          // Send done event
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "done",
                  conversationId: convId,
                  fullResponse,
                  quotaRemaining: tokenQuota.remaining,
                })}\n\n`
              )
            );
          } catch (_e) {
            // Controller may already be closed
          }
        } catch (err) {
          console.error("Chat stream error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", content: "Désolé, je rencontre des difficultés techniques. Vérifiez vos clés API dans les Paramètres." })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
