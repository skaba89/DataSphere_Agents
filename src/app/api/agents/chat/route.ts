import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import ZAI from "z-ai-web-dev-sdk";

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

    const { agentId, message, conversationId } = await request.json();

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
      // RAG: inject user's documents as context
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

    // Call AI via z-ai-web-dev-sdk
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
      ],
    });

    const assistantContent =
      completion.choices?.[0]?.message?.content ||
      "Désolé, je n'ai pas pu générer une réponse.";

    // Save assistant response
    await db.chatMessage.create({
      data: {
        conversationId: convId,
        role: "assistant",
        content: assistantContent,
      },
    });

    // Update conversation timestamp
    await db.conversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      response: assistantContent,
      conversationId: convId,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chat avec l'agent" },
      { status: 500 }
    );
  }
}
