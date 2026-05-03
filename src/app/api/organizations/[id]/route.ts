import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { auditLog } from '@/lib/audit';

// Helper: verify user membership and return role
async function getMemberRole(orgId: string, userId: string): Promise<string | null> {
  const member = await db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
  });
  return member?.role || null;
}

// GET - Get org details with members list
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const orgId = params.id;

    // Check membership
    const userRole = await getMemberRole(orgId, payload.userId);
    if (!userRole) {
      return NextResponse.json({ error: 'Vous n\'êtes pas membre de cette organisation' }, { status: 403 });
    }

    const organization = await db.organization.findUnique({
      where: { id: orgId },
      include: {
        plan: { select: { name: true, displayName: true, maxTeamMembers: true } },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: [{ role: 'asc' }, { invitedAt: 'asc' }],
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo: organization.logo,
        plan: organization.plan,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
        members: organization.members.map((m) => ({
          id: m.id,
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
          avatar: m.user.avatar,
          role: m.role,
          invitedAt: m.invitedAt,
          joinedAt: m.joinedAt,
        })),
        userRole,
      },
    });
  } catch (_e) {
    console.error('Organization get error:', _e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH - Update org (name, logo) — owner/admin only
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const orgId = params.id;

    // Check membership and role
    const userRole = await getMemberRole(orgId, payload.userId);
    if (!userRole) {
      return NextResponse.json({ error: 'Vous n\'êtes pas membre de cette organisation' }, { status: 403 });
    }

    if (userRole !== 'owner' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Seuls les propriétaires et administrateurs peuvent modifier l\'organisation' }, { status: 403 });
    }

    const body = await req.json();
    const { name, logo } = body;

    const updateData: { name?: string; logo?: string; slug?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json(
          { error: 'Le nom doit contenir au moins 2 caractères' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();

      // Regenerate slug if name changes
      const newSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);

      if (newSlug) {
        // Check if slug is taken by another org
        const existingOrg = await db.organization.findFirst({
          where: { slug: newSlug, id: { not: orgId } },
        });
        if (!existingOrg) {
          updateData.slug = newSlug;
        } else {
          // Append a number
          let counter = 1;
          let uniqueSlug = `${newSlug}-${counter}`;
          while (await db.organization.findFirst({ where: { slug: uniqueSlug, id: { not: orgId } } })) {
            counter++;
            uniqueSlug = `${newSlug}-${counter}`;
          }
          updateData.slug = uniqueSlug;
        }
      }
    }

    if (logo !== undefined) {
      updateData.logo = logo;
    }

    const organization = await db.organization.update({
      where: { id: orgId },
      data: updateData,
      include: {
        plan: { select: { name: true, displayName: true } },
        _count: { select: { members: true } },
      },
    });

    // Audit log
    await auditLog({
      userId: payload.userId,
      action: 'organization.update',
      entity: 'Organization',
      entityId: orgId,
      details: { name: updateData.name, logo: updateData.logo },
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
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      },
    });
  } catch (_e) {
    console.error('Organization update error:', _e);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

// DELETE - Delete org — owner only
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const orgId = params.id;

    // Check membership and role
    const userRole = await getMemberRole(orgId, payload.userId);
    if (userRole !== 'owner') {
      return NextResponse.json({ error: 'Seul le propriétaire peut supprimer l\'organisation' }, { status: 403 });
    }

    // Get org name for audit
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 });
    }

    // Delete the organization (cascade will remove members)
    await db.organization.delete({
      where: { id: orgId },
    });

    // Audit log
    await auditLog({
      userId: payload.userId,
      action: 'organization.delete',
      entity: 'Organization',
      entityId: orgId,
      details: { name: org.name },
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (_e) {
    console.error('Organization delete error:', _e);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
