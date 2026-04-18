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

    let ragContext = "";
    if (agent.type === "data") {
      const docs = await db.document.findMany({
        where: { userId: payload.userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      if (docs.length > 0) {
        ragContext =
          "\n\nDocuments de l'utilisateur pour référence:\n" +
          docs
            .map((d) => `--- ${d.filename} ---\n${d.content.slice(0, 2000)}`)
            .join("\n\n");
      } else {
        ragContext = "\n\nL'utilisateur n'a pas encore téléchargé de documents. Encourage-le à en télécharger pour que tu puisses les analyser.";
      }
    }

    const fullSystemPrompt = agent.systemPrompt + ragContext;

    // Build conversation history for multi-turn context
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

          // SDK loaded via singleton
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
                      // JSON parse failed for this line, skip
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
                      } catch {
                        // Ignore
                      }
                    }
                  }
                }
              } finally {
                reader.releaseLock();
              }
            }
          } catch (streamErr) {
            console.error("Streaming failed, falling back:", streamErr);
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
                const words = finalText.split(/(?<=\s)/);
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
            } catch (nonStreamErr) {
              console.error("Non-streaming also failed:", nonStreamErr);
            }
          }

          // Fallback message
          if (!fullResponse) {
            fullResponse =
              "Je suis actuellement en mode hors ligne. Veuillez réessayer dans un instant.";
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

          // Send done event
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "done",
                  conversationId: convId,
                  fullResponse,
                })}\n\n`
              )
            );
          } catch {
            // Controller may already be closed
          }
        } catch (err) {
          console.error("Chat stream error:", err);
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
