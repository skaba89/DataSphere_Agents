<<<<<<< HEAD
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { isDatabaseAvailable } from '@/lib/db'
import { getDemoService } from '@/lib/demo-service'
import { getUserFromRequest } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError, BadRequestError, ForbiddenError } from '@/lib/api-errors'

// GET /api/agents - List agents for the user's organization
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const activeOnly = searchParams.get('active') === 'true'

    if (!organizationId) throw new BadRequestError('organizationId is required')

    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      const demo = getDemoService()
      const membership = await demo.getOrgMembership(user.userId, organizationId)
      if (!membership) throw new ForbiddenError('Not a member of this organization')

      let agents = await demo.listAgents(organizationId)
      if (activeOnly) agents = agents.filter((a: Record<string, unknown>) => a.isActive === true)

      return NextResponse.json({ success: true, data: agents, demoMode: true })
    }

    // Verify user is member of organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.userId,
        },
      },
    })

    if (!membership) throw new ForbiddenError('Not a member of this organization')

    const where: Record<string, unknown> = { organizationId }
    if (activeOnly) where.isActive = true

    const agents = await prisma.agent.findMany({
      where,
      include: {
        provider: {
          select: { id: true, name: true, type: true },
        },
        _count: {
          select: { conversations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: agents })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) throw new UnauthorizedError()

    const body = await request.json()
    const { name, description, organizationId, providerId, model, systemPrompt, temperature, maxTokens } = body

    if (!name || !organizationId || !providerId || !model) {
      throw new BadRequestError('name, organizationId, providerId, and model are required')
    }

    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      const demo = getDemoService()
      const membership = await demo.getOrgMembership(user.userId, organizationId)
      if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        throw new ForbiddenError('Only admins can create agents')
      }

      const result = await demo.createAgent({
        name,
        description,
        organizationId,
        providerId,
        model,
        systemPrompt,
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? 2048,
      })

      if (!result.success) {
        throw new BadRequestError('Failed to create agent')
      }

      return NextResponse.json({ success: true, data: result.data, demoMode: true }, { status: 201 })
    }

    // Verify user is admin/owner of organization
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.userId,
        },
      },
    })

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      throw new ForbiddenError('Only admins can create agents')
    }

    const agent = await prisma.agent.create({
      data: {
        name,
        description,
        organizationId,
        providerId,
        model,
        systemPrompt,
        temperature: temperature ?? 0.7,
        maxTokens: maxTokens ?? 2048,
      },
      include: {
        provider: {
          select: { id: true, name: true, type: true },
        },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'CREATE_AGENT',
        resource: 'Agent',
        resourceId: agent.id,
        details: { name: agent.name, organizationId },
      },
    })

    return NextResponse.json({ success: true, data: agent }, { status: 201 })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
=======
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

    // Get default agents + user's custom agents
    const agents = await db.agent.findMany({
      where: {
        OR: [
          { isDefault: true },
          { creatorId: payload.userId },
        ],
      },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Agents list error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des agents" },
      { status: 500 }
    );
>>>>>>> e18a62a3dc925c7a6dc59f9438555db31d87525f
  }
}
