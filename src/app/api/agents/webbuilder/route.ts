import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const fullSystemPrompt = agent.systemPrompt + `

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

    // Build conversation history
    const previousMessages = await db.chatMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "asc" },
      take: 20,
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

          const { getZAI } = await import("@/lib/zai");
          const zai = await getZAI();

          let streamingWorked = false;

          // Try streaming first
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
                    } catch {
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
                      } catch { /* ignore */ }
                    }
                  }
                }
              } finally {
                reader.releaseLock();
              }
            }
          } catch (streamErr) {
            console.error("Web builder streaming failed, falling back:", streamErr);
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
              console.error("Web builder non-streaming also failed:", nonStreamErr);
            }
          }

          // Extract HTML code from the response
          const htmlMatch = fullResponse.match(/```html\s*([\s\S]*?)```/);
          const htmlCode = htmlMatch ? htmlMatch[1].trim() : "";

          // Fallback message
          if (!fullResponse) {
            fullResponse = "Je n'ai pas pu générer le code. Veuillez réessayer avec une description plus détaillée.";
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
          } catch {
            // Controller may already be closed
          }
        } catch (err) {
          console.error("Web builder stream error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", content: "Désolé, je rencontre des difficultés techniques." })}\n\n`
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
  } catch {
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
