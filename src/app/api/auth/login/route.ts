import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signToken, signTempToken } from "@/lib/auth";
import {
  checkRateLimit,
  isValidEmail,
} from "@/lib/security";
import { seedPlans } from "@/lib/saas/stripe";
import { auditLog } from "@/lib/audit";

// Auto-seed the database if no users exist
async function ensureSeedData() {
  try {
    const userCount = await db.user.count();
    if (userCount > 0) return;

    console.log("[Auto-Seed] No users found, seeding database...");

    // Create admin user
    const hashedAdminPassword = await bcrypt.hash("admin123", 12);
    await db.user.create({
      data: {
        email: "admin@datasphere.ai",
        name: "Admin DataSphere",
        password: hashedAdminPassword,
        role: "admin",
        avatar: null,
      },
    });

    // Create demo user
    const hashedDemoPassword = await bcrypt.hash("demo123", 12);
    await db.user.create({
      data: {
        email: "demo@datasphere.ai",
        name: "Utilisateur Demo",
        password: hashedDemoPassword,
        role: "user",
        avatar: null,
      },
    });

    // Create default agents
    await db.agent.createMany({
      data: [
        {
          name: "Support Client IA",
          description: "Agent intelligent dédié au support client. Répond aux questions fréquentes, gère les réclamations et guide les utilisateurs.",
          type: "support",
          systemPrompt: "Tu es un agent de support client professionnel et empathique pour DataSphere. Tu réponds en français. Tu aides les utilisateurs avec leurs questions techniques, leurs problèmes de compte, et leurs réclamations. Sois courtois, précis et propose des solutions concrètes.",
          icon: "Headphones",
          color: "emerald",
          isDefault: true,
        },
        {
          name: "Analyste Financier IA",
          description: "Agent spécialisé dans l'analyse financière. Traite les données de paiement, génère des rapports de revenus et identifie les tendances.",
          type: "finance",
          systemPrompt: "Tu es un analyste financier expert pour DataSphere. Tu réponds en français. Tu analyses les données de transactions, les tendances de revenus, et les métriques financières.",
          icon: "TrendingUp",
          color: "amber",
          isDefault: true,
        },
        {
          name: "Assistant Data IA",
          description: "Agent expert en analyse de données et RAG. Téléchargez vos documents et posez des questions.",
          type: "data",
          systemPrompt: "Tu es un expert en analyse de données pour DataSphere. Tu réponds en français. Tu analyses les documents et données fournis par l'utilisateur.",
          icon: "Database",
          color: "violet",
          isDefault: true,
        },
        {
          name: "Agent Commercial IA",
          description: "Agent dédié à la prospection et aux ventes. Qualifie les leads, propose des offres adaptées.",
          type: "sales",
          systemPrompt: "Tu es un agent commercial expérimenté pour DataSphere. Tu réponds en français. Tu aides à qualifier les prospects et proposes des solutions adaptées.",
          icon: "Target",
          color: "rose",
          isDefault: true,
        },
        {
          name: "Web Builder IA",
          description: "Créez des sites web modernes et professionnels. Décrivez votre vision et l'IA génère le code complet.",
          type: "webbuilder",
          systemPrompt: "Tu es un architecte web de classe mondiale. Génère TOUJOURS le code complet entre des balises ```html et ```.",
          icon: "Globe",
          color: "cyan",
          isDefault: true,
        },
        {
          name: "Agent Image Designer",
          description: "Créez des images et visuels professionnels par intelligence artificielle.",
          type: "image",
          systemPrompt: "Tu es un designer visuel IA expert pour DataSphere. Tu réponds en français.",
          icon: "Bot",
          color: "orange",
          isDefault: true,
        },
        {
          name: "Agent Rédacteur IA",
          description: "Rédigez du contenu professionnel : articles, rapports, emails commerciaux.",
          type: "custom",
          systemPrompt: "Tu es un rédacteur professionnel expert pour DataSphere. Tu réponds en français.",
          icon: "Bot",
          color: "emerald",
          isDefault: true,
        },
        {
          name: "Agent Documents Pro",
          description: "Générateur de documents professionnels - Rapports, propositions, contrats.",
          type: "custom",
          systemPrompt: "Tu es un expert en rédaction de documents professionnels.",
          icon: "FileText",
          color: "violet",
          isDefault: true,
        },
      ],
    });

    console.log("[Auto-Seed] Database seeded successfully with admin & demo users + agents.");

    // Seed SaaS plans and create free subscriptions
    await seedPlans();
  } catch (seedError) {
    console.error("[Auto-Seed] Error seeding database:", seedError);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per minute for login
    if (!checkRateLimit(request, 5)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Veuillez réessayer dans une minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const rawEmail = (body.email || "").trim().slice(0, 254);
    const password = body.password || "";

    if (!rawEmail || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    // Validate email format (don't HTML-escape email for DB lookup)
    if (!isValidEmail(rawEmail)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      );
    }

    // Auto-seed if no users exist
    await ensureSeedData();

    const user = await db.user.findUnique({ where: { email: rawEmail } });

    if (!user) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    // Check if account is active
    if (user.isActive === false) {
      return NextResponse.json(
        { error: "Votre compte a été suspendu. Contactez l'administrateur." },
        { status: 403 }
      );
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Generate a short-lived temp token for 2FA verification
      const tempToken = await signTempToken({
        userId: user.id,
        email: user.email,
        twoFactorPending: true,
      });

      // Return temp token instead of full auth response
      // The client must verify 2FA code within 5 minutes
      return NextResponse.json({
        requiresTwoFactor: true,
        tempToken,
        userId: user.id,
      });
    }

    // Update last login time
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Audit log for login
    await auditLog({
      userId: user.id,
      action: "user.login",
      entity: "User",
      entityId: user.id,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la connexion" },
      { status: 500 }
    );
  }
}
