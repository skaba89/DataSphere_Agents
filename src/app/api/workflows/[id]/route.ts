import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: Get workflow with execution history
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const workflow = await db.workflow.findUnique({
      where: { id },
      include: {
        executions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        user: { select: { id: true, name: true } },
      },
    });

    if (!workflow) {
      return Response.json({ error: "Workflow non trouvé" }, { status: 404 });
    }

    return Response.json({ workflow });
  } catch {
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH: Update workflow
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return Response.json({ error: "Token invalide" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await db.workflow.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Workflow non trouvé" }, { status: 404 });
    }
    if (existing.userId !== payload.userId) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.steps !== undefined) {
      // Validate steps
      let parsedSteps: unknown[];
      if (typeof body.steps === "string") {
        try {
          parsedSteps = JSON.parse(body.steps);
        } catch {
          return Response.json({ error: "Format d'étapes invalide" }, { status: 400 });
        }
      } else {
        parsedSteps = body.steps;
      }
      if (!Array.isArray(parsedSteps)) {
        return Response.json({ error: "Les étapes doivent être un tableau" }, { status: 400 });
      }
      updates.steps = JSON.stringify(parsedSteps);
    }

    const workflow = await db.workflow.update({
      where: { id },
      data: updates,
    });

    return Response.json({ workflow });
  } catch {
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE: Delete workflow
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return Response.json({ error: "Token invalide" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.workflow.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Workflow non trouvé" }, { status: 404 });
    }
    if (existing.userId !== payload.userId) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    await db.workflow.delete({ where: { id } });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
