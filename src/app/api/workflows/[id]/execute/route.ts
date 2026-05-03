import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { executeWorkflow } from "@/lib/workflow-engine";

export const dynamic = "force-dynamic";

// POST: Execute workflow with input data
export async function POST(
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
    const workflow = await db.workflow.findUnique({ where: { id } });
    if (!workflow) {
      return Response.json({ error: "Workflow non trouvé" }, { status: 404 });
    }
    if (workflow.userId !== payload.userId) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    const input = body.input || {};

    // Execute the workflow
    const result = await executeWorkflow(id, input);

    return Response.json(result);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Erreur serveur";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
