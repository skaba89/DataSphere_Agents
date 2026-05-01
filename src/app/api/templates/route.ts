import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { AGENT_TEMPLATES, getTemplatesByCategory, getTemplateCategories, searchTemplates, getPopularTemplates } from "@/lib/saas/templates";
import { checkAgentQuota, checkFeatureAccess } from "@/lib/saas/quotas";
import { auditLog } from "@/lib/audit";

// GET /api/templates — List available templates
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const popular = searchParams.get("popular") === "true";

    let templates;
    if (search) {
      templates = searchTemplates(search);
    } else if (category) {
      templates = getTemplatesByCategory(category);
    } else if (popular) {
      templates = getPopularTemplates(10);
    } else {
      templates = AGENT_TEMPLATES;
    }

    const categories = getTemplateCategories();

    return NextResponse.json({ templates, categories });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/templates — Instantiate a template (create agent from template)
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const { templateId, customName, customPrompt } = await req.json();

    if (!templateId) {
      return NextResponse.json({ error: "Template ID requis" }, { status: 400 });
    }

    const template = AGENT_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
    }

    // Check if premium template requires Pro+ plan
    if (template.isPremium) {
      const featureCheck = await checkFeatureAccess(payload.userId, 'allowCustomAgents');
      if (!featureCheck.allowed) {
        return NextResponse.json({
          error: `Le template "${template.name}" nécessite le plan Pro ou supérieur.`,
          upgradeRequired: true,
        }, { status: 403 });
      }
    }

    // Check agent quota
    const quotaCheck = await checkAgentQuota(payload.userId);
    if (!quotaCheck.allowed) {
      return NextResponse.json({
        error: quotaCheck.reason || "Quota d'agents atteint",
        quotaExceeded: true,
      }, { status: 403 });
    }

    // Create the agent from template
    const agent = await db.agent.create({
      data: {
        name: customName || template.name,
        description: template.description,
        type: template.type,
        systemPrompt: customPrompt || template.systemPrompt,
        icon: template.icon,
        color: template.color,
        isDefault: false,
        creatorId: payload.userId,
        isTemplate: false,
        templateCategory: template.category,
        tags: JSON.stringify(template.tags),
      },
    });

    await auditLog({
      userId: payload.userId,
      action: "agent.create",
      entity: "Agent",
      entityId: agent.id,
      details: { fromTemplate: templateId, templateName: template.name },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
