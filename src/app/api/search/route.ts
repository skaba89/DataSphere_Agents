import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const typesParam = searchParams.get("types") || "conversations,agents,documents";
    const types = typesParam.split(",").map((t) => t.trim()).filter(Boolean);

    if (!q || q.length < 2) {
      return NextResponse.json({
        query: q,
        conversations: [],
        agents: [],
        documents: [],
      });
    }

    const results: {
      query: string;
      conversations: Array<{
        id: string;
        title: string;
        agentId: string;
        agentName: string;
        updatedAt: string;
        matchedText: string;
      }>;
      agents: Array<{
        id: string;
        name: string;
        type: string;
        description: string;
        icon: string;
        color: string;
      }>;
      documents: Array<{
        id: string;
        filename: string;
        size: number;
        matchedSnippet: string;
      }>;
    } = {
      query: q,
      conversations: [],
      agents: [],
      documents: [],
    };

    // Search conversations
    if (types.includes("conversations")) {
      const conversations = await db.conversation.findMany({
        where: {
          userId: payload.userId,
          OR: [
            { title: { contains: q } },
            { tags: { contains: q } },
          ],
        },
        include: { agent: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      });

      results.conversations = conversations.map((conv) => {
        let matchedText = conv.title;
        if (!conv.title.toLowerCase().includes(q.toLowerCase()) && conv.tags) {
          matchedText = conv.tags;
        }
        return {
          id: conv.id,
          title: conv.title,
          agentId: conv.agentId,
          agentName: conv.agent.name,
          updatedAt: conv.updatedAt.toISOString(),
          matchedText: matchedText.slice(0, 200),
        };
      });
    }

    // Search agents
    if (types.includes("agents")) {
      const agents = await db.agent.findMany({
        where: {
          OR: [
            { isDefault: true },
            { creatorId: payload.userId },
          ],
          AND: [
            {
              OR: [
                { name: { contains: q } },
                { description: { contains: q } },
                { systemPrompt: { contains: q } },
              ],
            },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      results.agents = agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        description: agent.description,
        icon: agent.icon,
        color: agent.color,
      }));
    }

    // Search documents
    if (types.includes("documents")) {
      const documents = await db.document.findMany({
        where: {
          userId: payload.userId,
          OR: [
            { filename: { contains: q } },
            { content: { contains: q } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      results.documents = documents.map((doc) => {
        let matchedSnippet = doc.filename;
        if (doc.content) {
          const lowerContent = doc.content.toLowerCase();
          const lowerQ = q.toLowerCase();
          const matchIndex = lowerContent.indexOf(lowerQ);
          if (matchIndex !== -1) {
            const start = Math.max(0, matchIndex - 100);
            const end = Math.min(doc.content.length, matchIndex + q.length + 400);
            matchedSnippet = (start > 0 ? "..." : "") + doc.content.slice(start, end) + (end < doc.content.length ? "..." : "");
          }
        }
        return {
          id: doc.id,
          filename: doc.filename,
          size: doc.size,
          matchedSnippet: matchedSnippet.slice(0, 500),
        };
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recherche" },
      { status: 500 }
    );
  }
}
