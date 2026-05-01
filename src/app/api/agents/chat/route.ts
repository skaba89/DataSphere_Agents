import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { resolveProvider, chatCompletion, PROVIDERS } from "@/lib/ai-providers";
import { checkTokenQuota, checkConversationQuota, recordUsage } from "@/lib/saas/quotas";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (_e) {
      return NextResponse.json(
        { error: "Corps de la requête invalide" },
        { status: 400 }
      );
    }

    const { agentId, message, conversationId, provider: requestedProvider } = body;

    if (!agentId || !message) {
      return NextResponse.json(
        { error: "Agent ID et message requis" },
        { status: 400 }
      );
    }

    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });
    }

    // Check conversation quota if creating a new conversation
    if (!conversationId) {
      const convQuota = await checkConversationQuota(payload.userId);
      if (!convQuota.allowed) {
        return NextResponse.json(
          { error: convQuota.reason, quotaExceeded: true, quotaType: "conversations" },
          { status: 403 }
        );
      }
    }

    // Check token quota (estimate ~500 tokens per message)
    const tokenQuota = await checkTokenQuota(payload.userId, 500);
    if (!tokenQuota.allowed) {
      return NextResponse.json(
        { error: tokenQuota.reason, quotaExceeded: true, quotaType: "tokens" },
        { status: 403 }
      );
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const conv = await db.conversation.create({
        data: {
          userId: payload.userId,
          agentId,
          title: message.slice(0, 60) + (message.length > 60 ? "..." : ""),
        },
      });
      convId = conv.id;
    }

    // Verify conversation ownership
    const conversation = await db.conversation.findUnique({
      where: { id: convId },
    });
    if (!conversation || conversation.userId !== payload.userId) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    // Save user message
    await db.chatMessage.create({
      data: {
        conversationId: convId,
        role: "user",
        content: message,
      },
    });

    // Get recent conversation context
    const recentMessages = await db.chatMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const conversationHistory = recentMessages
      .reverse()
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Build system prompt — enhanced with RAG for data-type agents
    let systemPrompt = agent.systemPrompt;

    if (agent.type === "data") {
      const documents = await db.document.findMany({
        where: { userId: payload.userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      if (documents.length > 0) {
        const docContext = documents
          .map((d) => `--- Document: ${d.filename} ---\n${d.content.slice(0, 3000)}`)
          .join("\n\n");
        systemPrompt += `\n\nVoici les documents de l'utilisateur que tu peux utiliser pour répondre :\n\n${docContext}\n\nBase tes réponses sur ces documents quand c'est pertinent. Si l'information n'est pas dans les documents, dis-le honnêtement.`;
      } else {
        systemPrompt += "\n\nL'utilisateur n'a pas encore téléchargé de documents. Encourage-le à en télécharger pour que tu puisses les analyser.";
      }
    }

    // Call AI — try multi-provider first, then fallback to Z-AI SDK
    let assistantContent: string;

    // Try multi-provider
    const providerInfo = await resolveProvider(payload.userId, requestedProvider);

    if (providerInfo) {
      try {
        const result = await chatCompletion({
          provider: providerInfo.provider,
          apiKey: providerInfo.apiKey,
          model: providerInfo.model,
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
          ],
        });
        assistantContent = result.content || "Désolé, je n'ai pas pu générer une réponse.";
      } catch (aiError: any) {
        console.error(`${PROVIDERS[providerInfo.provider]?.name} error:`, aiError?.message);
        assistantContent = `Erreur avec ${PROVIDERS[providerInfo.provider]?.name}: ${aiError?.message || 'Service temporairement indisponible.'}`;
      }
    } else {
      // Fallback to Z-AI SDK
      try {
        const { getZAI } = await import("@/lib/zai");
        const zai = await getZAI();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
          ],
        });
        assistantContent =
          completion.choices?.[0]?.message?.content ||
          "Désolé, je n'ai pas pu générer une réponse.";
      } catch (aiError) {
        console.error("Z-AI SDK error:", aiError);
        assistantContent = "Aucun fournisseur IA n'est configuré. Veuillez ajouter une clé API dans les Paramètres (OpenAI, Anthropic, Groq, Qwen ou OpenRouter).";
      }
    }

    // Save assistant response
    await db.chatMessage.create({
      data: {
        conversationId: convId,
        role: "assistant",
        content: assistantContent,
      },
    });

    // Record usage event
    await recordUsage({
      userId: payload.userId,
      eventType: 'chat_message',
      tokensUsed: Math.ceil(assistantContent.length / 4), // rough token estimate
      provider: providerInfo?.provider || 'zai',
      agentId: agentId,
    });

    // Update conversation timestamp
    await db.conversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      response: assistantContent,
      conversationId: convId,
      quotaRemaining: tokenQuota.remaining,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chat avec l'agent" },
      { status: 500 }
    );
  }
}
