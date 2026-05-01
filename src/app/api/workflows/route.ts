import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: List user's workflows
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return Response.json({ error: "Token invalide" }, { status: 401 });
    }

    const workflows = await db.workflow.findMany({
      where: { userId: payload.userId },
      include: {
        executions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const enriched = workflows.map((wf) => {
      let steps: unknown[] = [];
      try {
        steps = JSON.parse(wf.steps);
      } catch { /* ignore */ }

      const lastExecution = wf.executions[0];

      return {
        id: wf.id,
        name: wf.name,
        description: wf.description,
        steps: wf.steps,
        stepCount: steps.length,
        isActive: wf.isActive,
        createdAt: wf.createdAt,
        updatedAt: wf.updatedAt,
        lastExecution: lastExecution ? {
          id: lastExecution.id,
          status: lastExecution.status,
          createdAt: lastExecution.createdAt,
        } : null,
      };
    });

    return Response.json({ workflows: enriched });
  } catch {
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST: Create workflow
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return Response.json({ error: "Token invalide" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, steps } = body;

    if (!name || !steps) {
      return Response.json({ error: "Nom et étapes requis" }, { status: 400 });
    }

    // Validate steps is a valid JSON array
    let parsedSteps: unknown[];
    if (typeof steps === "string") {
      try {
        parsedSteps = JSON.parse(steps);
      } catch {
        return Response.json({ error: "Format d'étapes invalide" }, { status: 400 });
      }
    } else {
      parsedSteps = steps;
    }

    if (!Array.isArray(parsedSteps) || parsedSteps.length === 0) {
      return Response.json({ error: "Au moins une étape est requise" }, { status: 400 });
    }

    const workflow = await db.workflow.create({
      data: {
        userId: payload.userId,
        name,
        description: description || null,
        steps: JSON.stringify(parsedSteps),
      },
    });

    return Response.json({ workflow }, { status: 201 });
  } catch {
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
