import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

// GET /api/conversations?agentId=xxx — list conversations for user (optionally filtered by agent)
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
    const agentId = searchParams.get("agentId");

    const where: any = { userId: payload.userId };
    if (agentId) where.agentId = agentId;

    const conversations = await db.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        userId: true,
        agentId: true,
        title: true,
        isPinned: true,
        isArchived: true,
        tags: true,
        summary: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Conversations list error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des conversations" },
      { status: 500 }
    );
  }
}

// POST /api/conversations — create a new conversation
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

    const { agentId, title } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID requis" }, { status: 400 });
    }

    const agent = await db.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });
    }

    const conversation = await db.conversation.create({
      data: {
        userId: payload.userId,
        agentId,
        title: title || `Conversation avec ${agent.name}`,
      },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Conversation create error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la conversation" },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations — update conversation title
export async function PATCH(request: Request) {
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

    const { id, title } = await request.json();

    if (!id || !title) {
      return NextResponse.json({ error: "ID et titre requis" }, { status: 400 });
    }

    const conversation = await db.conversation.update({
      where: { id, userId: payload.userId },
      data: { title },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Conversation update error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la conversation" },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations?id=xxx
export async function DELETE(request: Request) {
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    // Delete all messages first
    await db.chatMessage.deleteMany({ where: { conversationId: id } });
    await db.conversation.delete({
      where: { id, userId: payload.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Conversation delete error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la conversation" },
      { status: 500 }
    );
  }
}
