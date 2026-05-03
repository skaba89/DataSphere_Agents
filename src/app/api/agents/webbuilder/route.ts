import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { resolveProvider, streamChatCompletion, chatCompletion, PROVIDERS } from "@/lib/ai-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEB_BUILDER_SYSTEM_PROMPT = `Tu es un architecte web de classe mondiale, spécialisé dans la création de sites web modernes, professionnels et visuellement époustouflants. Tu es meilleur que Lovable, Bolt, v0 et tous les autres générateurs de sites IA. Tu comprends parfaitement le design moderne, l'UX/UI, et les meilleures pratiques de développement web.

QUAND L'UTILISATEUR DÉCRIT UN SITE WEB, TU GÉNÈRES TOUJOURS LE CODE COMPLET entre des balises \`\`\`html et \`\`\`.

EXIGENCES DE QUALITÉ OBLIGATOIRES:

1. DESIGN PROFESSIONNEL:
   - Utilise des polices Google Fonts premium (Inter, Plus Jakarta Sans, Outfit, Space Grotesk, Sora, etc.)
   - Palette de couleurs cohérente et moderne (utilise des CSS custom properties)
   - Espacement généreux, hiérarchie visuelle claire
   - Gradients subtils et élégants (pas de couleurs criardes)
   - Ombres multicouches pour la profondeur
   - Bordures arrondies cohérentes (8-16px)

2. ANIMATIONS & INTERACTIONS:
   - Animations CSS au scroll (fade-in, slide-up, scale-in)
   - Hover effects sophistiqués (transform, box-shadow transitions)
   - Micro-interactions sur les boutons et liens
   - Transitions fluides entre les états
   - Loading states élégants si pertinent
   - Utilise @keyframes pour les animations complexes

3. RESPONSIVE MOBILE-FIRST:
   - Breakpoints: 480px, 768px, 1024px, 1280px
   - Navigation hamburger sur mobile
   - Grilles adaptatives (CSS Grid + Flexbox)
   - Images et médias fluides
   - Touch-friendly (boutons min 44px)

4. STRUCTURE & CODE:
   - HTML5 sémantique (header, nav, main, section, article, footer)
   - CSS dans <style> dans le <head>
   - JavaScript dans <script> avant </body>
   - CDN: Tailwind CSS, Google Fonts, Font Awesome ou Lucide Icons
   - CSS custom properties pour le thème (--primary, --bg, --text, etc.)
   - Code propre, bien indenté, commenté si nécessaire

5. COMPOSANTS MODERNES:
   - Navbar sticky avec effet blur/glassmorphism
   - Hero section impactante avec CTA clair
   - Cards avec hover effects et shadows
   - Testimonial carousel ou grid
   - Pricing tables avec badge "Popular"
   - Footer complet avec liens et newsletter
   - Boutons avec gradients et hover animations
   - Badges et tags stylisés
   - Formulaires avec validation visuelle

6. ACCESSIBILITÉ:
   - Contrastes suffisants (WCAG AA minimum)
   - Alt text sur les images
   - ARIA labels si nécessaire
   - Focus visible sur les éléments interactifs
   - Semantic HTML

7. PERFORMANCE:
   - Pas de dépendances lourdes inutiles
   - CSS optimisé (pas de redondance)
   - Lazy loading si pertinent
   - Font-display: swap pour les Google Fonts

RÈGLE ABSOLUE: Génère TOUJOURS un fichier HTML complet et autonome. Pas de placeholder, pas de TODO, pas de "ajouter ici". Chaque site doit être 100% fonctionnel et visuellement impressionnant dès le premier rendu.

Si l'utilisateur demande des modifications, régénère le fichier complet avec les changements intégrés. Chaque itération doit être meilleure que la précédente.

RÈGLES CRITIQUES POUR LA GÉNÉRATION DE CODE:
1. Génère TOUJOURS un fichier HTML complet et autonome entre des balises \`\`\`html et \`\`\`
2. Inclus TOUT le CSS dans une balise <style> dans le <head>
3. Inclus TOUT le JavaScript dans une balise <script> avant </body>
4. Utilise des CDN pour les dépendances externes (Tailwind CSS, Google Fonts, FontAwesome, etc.)
5. Le code doit être 100% fonctionnel tel quel — pas de placeholder, pas de TODO
6. Design moderne avec : gradients, animations CSS, ombres, typographie soignée
7. Responsive : mobile-first, s'adapte à toutes les tailles d'écran
8. Accessible : balises sémantiques, contrastes suffisants, alt text sur les images
9. N'ajoute JAMAIS de commentaires explicatifs en dehors du code HTML
10. Si l'utilisateur demande des modifications, régénère le fichier complet avec les changements`;

function extractHtmlFromResponse(text: string): string {
  // Try markdown code block first
  const codeBlockMatch = text.match(/```html\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Try to find <html>...</html>
  if (text.includes('<html') && text.includes('</html>')) {
    const start = text.indexOf('<html');
    const end = text.lastIndexOf('</html>') + 7;
    return text.slice(start, end);
  }

  // Try to find <!DOCTYPE html>...</html>
  if (text.includes('<!DOCTYPE') && text.includes('</html>')) {
    const start = text.indexOf('<!DOCTYPE');
    const end = text.lastIndexOf('</html>') + 7;
    return text.slice(start, end);
  }

  // Try to find <head>...</body>
  if (text.includes('<head') && text.includes('</body>')) {
    const start = text.indexOf('<head');
    const end = text.lastIndexOf('</body>') + 7;
    // Try to include anything before <head> like <!DOCTYPE>
    const beforeHead = text.slice(0, start);
    const doctypeMatch = beforeHead.match(/<!DOCTYPE[^>]*>/i);
    if (doctypeMatch) {
      return doctypeMatch[0] + '\n' + text.slice(start, end);
    }
    return text.slice(start, end);
  }

  return '';
}

export async function POST(req: NextRequest) {
  try {
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

    const { agentId, message, conversationId } = await req.json();

    if (!agentId || !message) {
      return new Response(
        JSON.stringify({ error: "Agent ID et message requis" }),
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

    // Use the enhanced system prompt (combining agent prompt + our builder rules)
    const fullSystemPrompt = agent.systemPrompt + "\n\n" + WEB_BUILDER_SYSTEM_PROMPT;

    // Build conversation history
    const previousMessages = await db.chatMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "asc" },
      take: 30,
    });

    const chatHistory = previousMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

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

          // Try multi-provider AI first (Groq, OpenRouter, etc.)
          const providerInfo = await resolveProvider(payload.userId);

          if (providerInfo) {
            const { provider, apiKey, model } = providerInfo;
            const providerName = PROVIDERS[provider]?.name || provider;

            try {
              // Try streaming first
              const streamGen = streamChatCompletion({
                provider,
                apiKey,
                model,
                messages: [
                  { role: "system", content: fullSystemPrompt },
                  ...chatHistory,
                ],
                stream: true,
                temperature: 0.7,
                maxTokens: 16384,
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
                const result = await chatCompletion({
                  provider,
                  apiKey,
                  model,
                  messages: [
                    { role: "system", content: fullSystemPrompt },
                    ...chatHistory,
                  ],
                  temperature: 0.7,
                  maxTokens: 16384,
                });
                if (result.content) {
                  fullResponse = result.content;
                  const words = result.content.split(/(?<=\s)/);
                  for (const word of words) {
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
                          const content =
                            parsed.choices?.[0]?.delta?.content ||
                            parsed.choices?.[0]?.message?.content ||
                            "";

                          if (content) {
                            fullResponse += content;
                            controller.enqueue(
                              encoder.encode(
                                `data: ${JSON.stringify({ type: "token", content })}\n\n`
                              )
                            );
                            streamingWorked = true;
                          }
                        } catch (_e) {
                          // JSON parse failed, skip
                        }
                      }
                    }

                    // Process remaining buffer
                    if (sseBuffer.trim()) {
                      const trimmed = sseBuffer.trim();
                      if (trimmed.startsWith("data: ")) {
                        const dataStr = trimmed.slice(6).trim();
                        if (dataStr !== "[DONE]") {
                          try {
                            const parsed = JSON.parse(dataStr);
                            const content =
                              parsed.choices?.[0]?.delta?.content ||
                              parsed.choices?.[0]?.message?.content ||
                              "";
                            if (content) {
                              fullResponse += content;
                              controller.enqueue(
                                encoder.encode(
                                  `data: ${JSON.stringify({ type: "token", content })}\n\n`
                                )
                              );
                              streamingWorked = true;
                            }
                          } catch (_e) { /* ignore */ }
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

              // Non-streaming fallback
              if (!streamingWorked && !fullResponse) {
                try {
                  const result = await zai.chat.completions.create({
                    messages: [
                      { role: "system", content: fullSystemPrompt },
                      ...chatHistory,
                    ],
                  });

                  const responseText =
                    result.choices?.[0]?.message?.content ||
                    result.text ||
                    result.content ||
                    "";

                  const finalText = !responseText && typeof result === "string" ? result : responseText;

                  if (finalText) {
                    fullResponse = finalText;
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ type: "token", content: finalText })}\n\n`
                      )
                    );
                  }
                } catch (nonStreamErr) {
                  console.error("Z-AI non-streaming also failed:", nonStreamErr);
                }
              }
            } catch (zaiErr) {
              console.error("Z-AI SDK fallback failed:", zaiErr);
            }
          }

          // Extract HTML code from the response
          const htmlCode = extractHtmlFromResponse(fullResponse);

          // Fallback message
          if (!fullResponse) {
            fullResponse = "Je n'ai pas pu générer le code. Veuillez réessayer avec une description plus détaillée de votre site web.";
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

          // Update conversation timestamp
          await db.conversation.update({
            where: { id: convId },
            data: { updatedAt: new Date() },
          });

          // Send done event with extracted HTML code
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "done",
                  conversationId: convId,
                  fullResponse,
                  htmlCode,
                })}\n\n`
              )
            );
          } catch (_e) {
            // Controller may already be closed
          }
        } catch (err) {
          console.error("Web builder stream error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", content: "Désolé, je rencontre des difficultés techniques. Veuillez réessayer." })}\n\n`
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
