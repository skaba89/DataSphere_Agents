<<<<<<< HEAD
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { isDatabaseAvailable } from '@/lib/db'
import { getDemoService } from '@/lib/demo-service'
import { getUserFromRequest } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError, BadRequestError } from '@/lib/api-errors'

// GET /api/conversations - List conversations for the user
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      const demo = getDemoService()
      const result = await demo.listConversations(user.userId, agentId || undefined, limit, skip)

      return NextResponse.json({
        success: true,
        data: result.data,
        pagination: {
          page,
          limit,
          total: result.pagination.total,
          totalPages: Math.ceil(result.pagination.total / limit),
        },
        demoMode: true,
      })
    }

    const where: Record<string, unknown> = { userId: user.userId }
    if (agentId) where.agentId = agentId

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          agent: {
            select: { id: true, name: true, model: true },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const body = await request.json()
    const { agentId, title } = body

    if (!agentId) throw new BadRequestError('agentId is required')

    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      const demo = getDemoService()

      // Verify agent exists and user has access
      const agent = await demo.getAgent(agentId)
      if (!agent) throw new BadRequestError('Agent not found')

      const membership = await demo.getOrgMembership(user.userId, agent.organizationId as string)
      if (!membership) throw new BadRequestError('Not a member of this organization')

      const conversation = await demo.createConversation(agentId, user.userId, title || `Chat with ${(agent as Record<string, unknown>).name}`)

      return NextResponse.json({ success: true, data: conversation, demoMode: true }, { status: 201 })
    }

    // Verify agent exists and user has access
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { organization: { include: { members: true } } },
    })

    if (!agent) throw new BadRequestError('Agent not found')

    const isMember = agent.organization.members.some(
      (m) => m.userId === user.userId
    )
    if (!isMember) throw new BadRequestError('Not a member of this organization')

    const conversation = await prisma.conversation.create({
      data: {
        agentId,
        userId: user.userId,
        title: title || `Chat with ${agent.name}`,
      },
      include: {
        agent: {
          select: { id: true, name: true, model: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: conversation }, { status: 201 })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
=======
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
>>>>>>> e18a62a3dc925c7a6dc59f9438555db31d87525f
  }
}
