import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { auditLog } from '@/lib/audit';

// Helper: generate a slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// Helper: make slug unique
async function generateUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  while (await db.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  return slug;
}

// GET - List user's organizations
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const memberships = await db.organizationMember.findMany({
      where: { userId: payload.userId },
      include: {
        organization: {
          include: {
            _count: { select: { members: true } },
            plan: { select: { name: true, displayName: true } },
          },
        },
      },
      orderBy: { organization: { createdAt: 'desc' } },
    });

    const organizations = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      logo: m.organization.logo,
      plan: m.organization.plan,
      memberCount: m.organization._count.members,
      role: m.role,
      joinedAt: m.joinedAt,
      createdAt: m.organization.createdAt,
    }));

    return NextResponse.json({ organizations });
  } catch (_e) {
    console.error('Organizations list error:', _e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Create organization
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Le nom de l\'organisation doit contenir au moins 2 caractères' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Le nom de l\'organisation ne peut pas dépasser 100 caractères' },
        { status: 400 }
      );
    }

    // Check quota: how many orgs the user can create based on their plan
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      include: {
        subscription: { include: { plan: true } },
        organizationMembers: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Count orgs where user is owner
    const ownedOrgs = await db.organizationMember.count({
      where: { userId: payload.userId, role: 'owner' },
    });

    const maxTeamMembers = user.subscription?.plan?.maxTeamMembers ?? 1;
    // Use maxTeamMembers as proxy for max organizations a user can own
    if (maxTeamMembers !== -1 && ownedOrgs >= maxTeamMembers) {
      return NextResponse.json(
        { error: `Vous avez atteint la limite de ${maxTeamMembers} organisation(s) pour votre plan` },
        { status: 403 }
      );
    }

    // Generate unique slug
    const baseSlug = generateSlug(name.trim());
    if (!baseSlug) {
      return NextResponse.json(
        { error: 'Impossible de générer un identifiant à partir de ce nom' },
        { status: 400 }
      );
    }
    const slug = await generateUniqueSlug(baseSlug);

    // Create organization and add creator as owner
    const organization = await db.organization.create({
      data: {
        name: name.trim(),
        slug,
        members: {
          create: {
            userId: payload.userId,
            role: 'owner',
            joinedAt: new Date(),
          },
        },
      },
      include: {
        _count: { select: { members: true } },
        plan: { select: { name: true, displayName: true } },
      },
    });

    // Audit log
    await auditLog({
      userId: payload.userId,
      action: 'organization.create',
      entity: 'Organization',
      entityId: organization.id,
      details: { name: organization.name, slug: organization.slug },
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        plan: organization.plan,
        memberCount: organization._count.members,
        role: 'owner',
        joinedAt: new Date().toISOString(),
        createdAt: organization.createdAt,
      },
    }, { status: 201 });
  } catch (_e) {
    console.error('Organization create error:', _e);
    return NextResponse.json({ error: 'Erreur lors de la création de l\'organisation' }, { status: 500 });
  }
}
