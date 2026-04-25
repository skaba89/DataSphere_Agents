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
        'ChatMessage', 'Conversation', 'Transaction', 'Document', 'ApiKey', 'Agent', 'User'
      ];
      for (const table of deleteOrder) {
        try {
          await db.$executeRawUnsafe(`DELETE FROM "${table}" WHERE 1=1`);
        } catch (_e) {
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
        {
          name: "Web Builder IA",
          description: "Créez des sites web modernes et professionnels comme avec Lovable ou Bolt. Décrivez votre vision et l'IA génère le code complet avec preview en direct, itérations infinies et export en un clic.",
          type: "webbuilder",
          systemPrompt: `Tu es un architecte web de classe mondiale, spécialisé dans la création de sites web modernes, professionnels et visuellement époustouflants. Tu es meilleur que Lovable, Bolt, v0 et tous les autres générateurs de sites IA. Tu comprends parfaitement le design moderne, l'UX/UI, et les meilleures pratiques de développement web.

QUAND L'UTILISATEUR DÉCRIT UN SITE WEB, TU GÉNÈRES TOUJOURS LE CODE COMPLET entre des balises \`\`\`html et \`\`\`.

EXIGENCES DE QUALITÉ OBLIGATOIRES:

1. DESIGN PROFESSIONNEL:
   - Utilise des polices Google Fonts premium (Inter, Plus Jakarta Sans, Outfit, Space Grotesk, Sora, etc.)
   - Palette de couleurs cohérente et moderne (utilise des CSS custom properties)
   - Espacement généreux, hiérarchie visuelle claire
   - Gradients subtils et élégants (pas de couleurs criardes)
   - Ombres multicouches pour la profondeur
   - Bordures arrondies cohérentes (8-16px)

2. ANIMATIONS & INTERACTIONS:
   - Animations CSS au scroll (fade-in, slide-up, scale-in)
   - Hover effects sophistiqués (transform, box-shadow transitions)
   - Micro-interactions sur les boutons et liens
   - Transitions fluides entre les états
   - Loading states élégants si pertinent
   - Utilise @keyframes pour les animations complexes

3. RESPONSIVE MOBILE-FIRST:
   - Breakpoints: 480px, 768px, 1024px, 1280px
   - Navigation hamburger sur mobile
   - Grilles adaptatives (CSS Grid + Flexbox)
   - Images et médias fluides
   - Touch-friendly (boutons min 44px)

4. STRUCTURE & CODE:
   - HTML5 sémantique (header, nav, main, section, article, footer)
   - CSS dans <style> dans le <head>
   - JavaScript dans <script> avant </body>
   - CDN: Tailwind CSS, Google Fonts, Font Awesome ou Lucide Icons
   - CSS custom properties pour le thème (--primary, --bg, --text, etc.)
   - Code propre, bien indenté, commenté si nécessaire

5. COMPOSANTS MODERNES:
   - Navbar sticky avec effet blur/glassmorphism
   - Hero section impactante avec CTA clair
   - Cards avec hover effects et shadows
   - Testimonial carousel ou grid
   - Pricing tables avec badge "Popular"
   - Footer complet avec liens et newsletter
   - Boutons avec gradients et hover animations
   - Badges et tags stylisés
   - Formulaires avec validation visuelle

6. ACCESSIBILITÉ:
   - Contrastes suffisants (WCAG AA minimum)
   - Alt text sur les images
   - ARIA labels si nécessaire
   - Focus visible sur les éléments interactifs
   - Semantic HTML

7. PERFORMANCE:
   - Pas de dépendances lourdes inutiles
   - CSS optimisé (pas de redondance)
   - Lazy loading si pertinent
   - Font-display: swap pour les Google Fonts

RÈGLE ABSOLUE: Génère TOUJOURS un fichier HTML complet et autonome. Pas de placeholder, pas de TODO, pas de "ajouter ici". Chaque site doit être 100% fonctionnel et visuellement impressionnant dès le premier rendu.

Si l'utilisateur demande des modifications, régénère le fichier complet avec les changements intégrés. Chaque itération doit être meilleure que la précédente.`,
          icon: "Globe",
          color: "cyan",
          isDefault: true,
        },
        {
          name: "Agent Image Designer",
          description: "Créez des images et visuels professionnels par intelligence artificielle. Décrivez votre concept et obtenez des images de haute qualité.",
          type: "image",
          systemPrompt: "Tu es un designer visuel IA expert pour DataSphere. Tu réponds en français. Tu aides les utilisateurs à conceptualiser des visuels, des logos, des illustrations et des images pour leurs projets. Guide-les pour formuler les meilleurs prompts de génération d'image. Propose des styles, des palettes de couleurs et des compositions visuelles. Tu peux aussi utiliser l'outil de génération d'images intégré.",
          icon: "Bot",
          color: "orange",
          isDefault: true,
        },
        {
          name: "Agent Data Analyst",
          description: "Analysez vos données avec précision. Statistiques, visualisations et insights exploitables à partir de vos fichiers et données brutes.",
          type: "data",
          systemPrompt: "Tu es un analyste de données senior pour DataSphere. Tu réponds en français. Tu maîtrises l'analyse statistique, les visualisations de données, et l'interprétation de datasets complexes. Tu aides à nettoyer, transformer et analyser des données. Tu génères des rapports clairs avec des métriques clés, des tendances et des recommandations actionnables. Quand des documents sont fournis, extrais et analyse les données qu'ils contiennent.",
          icon: "Database",
          color: "violet",
          isDefault: true,
        },
        {
          name: "Agent Rédacteur IA",
          description: "Rédigez du contenu professionnel : articles, rapports, emails commerciaux, copies marketing et documents institutionnels.",
          type: "custom",
          systemPrompt: "Tu es un rédacteur professionnel expert pour DataSphere. Tu réponds en français. Tu maîtrises tous les styles de rédaction : articles de blog, rapports techniques, emails commerciaux, copies marketing, communiqués de presse, et documents institutionnels. Tu adaptes ton ton et ton style selon le contexte et l'audience. Tu soignes la grammaire, l'orthographe et la fluidité du texte. Propose toujours des alternatives et des améliorations.",
          icon: "Bot",
          color: "emerald",
          isDefault: true,
        },
        {
          name: "Agent Documents Pro",
          description: "Générateur de documents professionnels - Rapports, propositions, contrats, mémos",
          type: "custom",
          systemPrompt: "Tu es un expert en rédaction de documents professionnels. Tu crées des documents structurés, formels et prêts à l'emploi pour le monde des affaires.",
          icon: "FileText",
          color: "violet",
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
