import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { getBuiltinTool, getBuiltinToolsForAgent } from "@/lib/agent-tools";

export const dynamic = "force-dynamic";

// GET: List agent's tools
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = _req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return Response.json({ error: "Token invalide" }, { status: 401 });
    }

    const { id } = await params;

    // Verify agent exists
    const agent = await db.agent.findUnique({ where: { id } });
    if (!agent) {
      return Response.json({ error: "Agent non trouvé" }, { status: 404 });
    }

    const tools = await db.agentTool.findMany({
      where: { agentId: id },
      orderBy: { name: "asc" },
    });

    // Also return available built-in tools that are not yet added
    const existingToolNames = new Set(tools.map((t) => t.name));
    const availableBuiltin = getBuiltinToolsForAgent().filter(
      (t) => !existingToolNames.has(t.name)
    );

    return Response.json({
      tools,
      availableBuiltin,
    });
  } catch {
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST: Add tool to agent
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

    const body = await req.json();
    const { name, type } = body;

    if (!name) {
      return Response.json({ error: "Nom de l'outil requis" }, { status: 400 });
    }

    // Check if it's a built-in tool
    const builtinTool = getBuiltinTool(name);
    if (builtinTool && (!type || type === "builtin")) {
      const tool = await db.agentTool.create({
        data: {
          agentId: id,
          name: builtinTool.name,
          description: builtinTool.description,
          parameters: JSON.stringify(builtinTool.parameterSchema),
          type: "builtin",
        },
      });

      return Response.json({ tool }, { status: 201 });
    }

    // Custom tool
    if (type === "custom") {
      const { description, parameters } = body;
      if (!description) {
        return Response.json({ error: "Description requise pour un outil personnalisé" }, { status: 400 });
      }

      const tool = await db.agentTool.create({
        data: {
          agentId: id,
          name,
          description,
          parameters: parameters || '{"type":"object","properties":{}}',
          type: "custom",
        },
      });

      return Response.json({ tool }, { status: 201 });
    }

    return Response.json({ error: "Outil non reconnu" }, { status: 400 });
  } catch (err: unknown) {
    // Handle unique constraint violation
    if (String(err).includes("Unique constraint")) {
      return Response.json({ error: "Cet outil est déjà associé à cet agent" }, { status: 409 });
    }
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE: Remove tool from agent
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
    const body = await req.json();
    const { toolId, toolName } = body;

    if (toolId) {
      await db.agentTool.delete({ where: { id: toolId } });
    } else if (toolName) {
      await db.agentTool.deleteMany({
        where: { agentId: id, name: toolName },
      });
    } else {
      return Response.json({ error: "toolId ou toolName requis" }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
