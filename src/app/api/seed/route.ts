import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Use a fresh PrismaClient instance to avoid caching issues
function getFreshDb() {
  return new PrismaClient();
}

export async function POST(request: Request) {
  const db = getFreshDb();
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get("force") === "true";

    if (!force) {
      const existingAgents = await db.agent.count();
      if (existingAgents > 0) {
        await db.$disconnect();
        return NextResponse.json({ message: "Base de données déjà initialisée" });
      }
    } else {
      // Force reset: delete all data in correct order (children first)
      const deleteOrder = [
        'ChatMessage', 'Conversation', 'Transaction', 'Document', 'Agent', 'User'
      ];
      for (const table of deleteOrder) {
        try {
          await db.$executeRawUnsafe(`DELETE FROM "${table}" WHERE 1=1`);
        } catch {
          // Table might not exist yet, skip
        }
      }
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 12);
    await db.user.create({
      data: {
        email: "admin@datasphere.ai",
        name: "Admin DataSphere",
        password: hashedPassword,
        role: "admin",
        avatar: null,
      },
    });

    // Create demo user
    const demoPassword = await bcrypt.hash("demo123", 12);
    await db.user.create({
      data: {
        email: "demo@datasphere.ai",
        name: "Utilisateur Demo",
        password: demoPassword,
        role: "user",
        avatar: null,
      },
    });

    // Create default AI Agents
    await db.agent.createMany({
      data: [
        {
          name: "Support Client IA",
          description: "Agent intelligent dédié au support client. Répond aux questions fréquentes, gère les réclamations et guide les utilisateurs dans leurs démarches.",
          type: "support",
          systemPrompt: "Tu es un agent de support client professionnel et empathique pour DataSphere. Tu réponds en français. Tu aides les utilisateurs avec leurs questions techniques, leurs problèmes de compte, et leurs réclamations. Sois courtois, précis et propose des solutions concrètes. Si tu ne connais pas la réponse, dis-le honnêtement et propose de contacter un humain.",
          icon: "Headphones",
          color: "emerald",
          isDefault: true,
        },
        {
          name: "Analyste Financier IA",
          description: "Agent spécialisé dans l'analyse financière. Traite les données de paiement, génère des rapports de revenus et identifie les tendances.",
          type: "finance",
          systemPrompt: "Tu es un analyste financier expert pour DataSphere. Tu réponds en français. Tu analyses les données de transactions, les tendances de revenus, et les métriques financières. Tu fournis des insights clairs et des recommandations basées sur les données. Utilise des termes financiers appropriés mais explique-les quand nécessaire.",
          icon: "TrendingUp",
          color: "amber",
          isDefault: true,
        },
        {
          name: "Assistant Data IA",
          description: "Agent expert en analyse de données et RAG. Téléchargez vos documents et posez des questions — l'agent analyse le contenu et répond basé sur vos fichiers.",
          type: "data",
          systemPrompt: "Tu es un expert en analyse de données pour DataSphere. Tu réponds en français. Tu analyses les documents et données fournis par l'utilisateur, extrais les informations clés, et réponds aux questions basées sur le contenu des documents. Tu peux résumer, comparer, et identifier des patterns dans les données. Quand des documents sont disponibles, base tes réponses dessus.",
          icon: "Database",
          color: "violet",
          isDefault: true,
        },
        {
          name: "Agent Commercial IA",
          description: "Agent dédié à la prospection et aux ventes. Qualifie les leads, propose des offres adaptées et accompagne les clients dans leurs achats.",
          type: "sales",
          systemPrompt: "Tu es un agent commercial expérimenté pour DataSphere. Tu réponds en français. Tu aides à qualifier les prospects, proposes des solutions adaptées aux besoins clients, et accompagnes dans le processus d'achat. Sois persuasif mais honnête, et mets en avant la valeur ajoutée des services DataSphere.",
          icon: "Target",
          color: "rose",
          isDefault: true,
        },
      ],
    });

    // Create sample transactions
    const admin = await db.user.findUnique({ where: { email: "admin@datasphere.ai" } });
    if (admin) {
      await db.transaction.createMany({
        data: [
          { userId: admin.id, amount: 15000, phone: "224600000001", status: "success" },
          { userId: admin.id, amount: 25000, phone: "224600000002", status: "success" },
          { userId: admin.id, amount: 8000, phone: "224600000003", status: "success" },
          { userId: admin.id, amount: 42000, phone: "224600000004", status: "success" },
          { userId: admin.id, amount: 12000, phone: "224600000005", status: "success" },
          { userId: admin.id, amount: 35000, phone: "224600000006", status: "success" },
          { userId: admin.id, amount: 18000, phone: "224600000007", status: "success" },
          { userId: admin.id, amount: 9500, phone: "224600000008", status: "pending" },
        ],
      });
    }

    return NextResponse.json({ message: "Base de données initialisée avec succès" });
  } catch (error) {
    console.error("Seed error:", error);
    await db.$disconnect();
    return NextResponse.json(
      { error: "Erreur lors de l'initialisation" },
      { status: 500 }
    );
  }
}
