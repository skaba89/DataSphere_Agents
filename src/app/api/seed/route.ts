import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST() {
  try {
    // Check if already seeded
    const existingAgents = await db.agent.count();
    if (existingAgents > 0) {
      return NextResponse.json({ message: "Base de données déjà initialisée" });
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

    // Create AI Agents
    await db.agent.createMany({
      data: [
        {
          name: "Support Client IA",
          description: "Agent intelligent dédié au support client. Répond aux questions fréquentes, gère les réclamations et guide les utilisateurs dans leurs démarches.",
          type: "support",
          systemPrompt: "Tu es un agent de support client professionnel et empathique pour DataSphere. Tu réponds en français. Tu aides les utilisateurs avec leurs questions techniques, leurs problèmes de compte, et leurs réclamations. Sois courtois, précis et propose des solutions concrètes. Si tu ne connais pas la réponse, dis-le honnêtement et propose de contacter un humain.",
          icon: "Headphones",
          color: "emerald",
        },
        {
          name: "Analyste Financier IA",
          description: "Agent spécialisé dans l'analyse financière. Traite les données de paiement, génère des rapports de revenus et identifie les tendances.",
          type: "finance",
          systemPrompt: "Tu es un analyste financier expert pour DataSphere. Tu réponds en français. Tu analyses les données de transactions, les tendances de revenus, et les métriques financières. Tu fournis des insights clairs et des recommandations basées sur les données. Utilise des termes financiers appropriés mais explique-les quand nécessaire.",
          icon: "TrendingUp",
          color: "amber",
        },
        {
          name: "Assistant Data IA",
          description: "Agent expert en analyse de données. Traite les documents téléchargés, extrait des informations clés et répond aux questions basées sur les documents.",
          type: "data",
          systemPrompt: "Tu es un expert en analyse de données pour DataSphere. Tu réponds en français. Tu analyses les documents et données fournis par l'utilisateur, extrais les informations clés, et réponds aux questions basées sur le contenu des documents. Tu peux résumer, comparer, et identifier des patterns dans les données.",
          icon: "Database",
          color: "violet",
        },
        {
          name: "Agent Commercial IA",
          description: "Agent dédié à la prospection et aux ventes. Qualifie les leads, propose des offres adaptées et accompagne les clients dans leurs achats.",
          type: "sales",
          systemPrompt: "Tu es un agent commercial expérimenté pour DataSphere. Tu réponds en français. Tu aides à qualifier les prospects, proposes des solutions adaptées aux besoins clients, et accompagnes dans le processus d'achat. Sois persuasif mais honnête, et mets en avant la valeur ajoutée des services DataSphere.",
          icon: "Target",
          color: "rose",
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
    return NextResponse.json(
      { error: "Erreur lors de l'initialisation" },
      { status: 500 }
    );
  }
}
