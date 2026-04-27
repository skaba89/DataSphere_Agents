import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { authenticatePlatformKey } from "@/lib/platform-auth";
import { resolveProvider, chatCompletion, PROVIDERS } from "@/lib/ai-providers";

/**
 * POST /api/v1/chat
 *
 * External API endpoint that supports both JWT and Platform API key authentication.
 * If the Bearer token starts with "ds_live_", use platform key auth; otherwise use JWT auth.
 * Enforces that the platform key must have "chat" in its permissions array.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé — Bearer token requis" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    let userId: string;
    let isPlatformKey = false;

    // Determine auth method: platform key vs JWT
    if (token.startsWith("ds_live_")) {
      // Platform API key authentication
      const authResult = await authenticatePlatformKey(token);
      if (!authResult) {
        return NextResponse.json({ error: "Clé API platform invalide ou expirée" }, { status: 401 });
      }

      // Enforce permissions: key must have "chat" in its permissions
      if (!authResult.permissions.includes("chat")) {
        return NextResponse.json(
          { error: "Permission insuffisante — la clé ne dispose pas de la permission 'chat'" },
          { status: 403 }
        );
      }

      userId = authResult.userId;
      isPlatformKey = true;
    } else {
      // JWT authentication
      const payload = await verifyToken(token);
      if (!payload) {
        return NextResponse.json({ error: "Token invalide" }, { status: 401 });
      }
      userId = payload.userId;
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (_e) {
      return NextResponse.json(
        { error: "Corps de la requête invalide" },
        { status: 400 }
      );
    }

    const { agentId, message, stream } = body;

    if (!agentId || !message) {
      return NextResponse.json(
        { error: "agentId et message requis" },
        { status: 400 }
      );
    }

    // Streaming is not supported via this endpoint (use chat-stream instead)
    if (stream) {
      return NextResponse.json(
        { error: "Le streaming n'est pas supporté sur cet endpoint. Utilisez /api/agents/chat-stream à la place." },
        { status: 400 }
      );
    }

    // Find the agent
    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });
    }

    if (!agent.isActive) {
      return NextResponse.json({ error: "Agent désactivé" }, { status: 403 });
    }

    // Create a new conversation for this API request
    const conversation = await db.conversation.create({
      data: {
        userId,
        agentId,
        title: message.slice(0, 60) + (message.length > 60 ? "..." : ""),
      },
    });

    // Save user message
    await db.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // Build conversation history (just the user message for a new conversation)
    const conversationHistory = [{ role: "user" as const, content: message }];

    // Build system prompt — enhanced with RAG for data-type agents
    let systemPrompt = agent.systemPrompt;

    if (agent.type === "data") {
      const documents = await db.document.findMany({
        where: { userId },
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

    const providerInfo = await resolveProvider(userId);

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
        assistantContent = "Aucun fournisseur IA n'est configuré. Veuillez ajouter une clé API dans les Paramètres.";
      }
    }

    // Save assistant response
    await db.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: assistantContent,
      },
    });

    // Update conversation timestamp
    await db.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      response: assistantContent,
      conversationId: conversation.id,
      agentId: agent.id,
      authType: isPlatformKey ? "platform_key" : "jwt",
    });
  } catch (error) {
    console.error("V1 Chat error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chat avec l'agent" },
      { status: 500 }
    );
  }
}
