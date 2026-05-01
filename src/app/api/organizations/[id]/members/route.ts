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

// POST - Invite member: { email: string, role: string }
export async function POST(
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

    // Check membership — only owner/admin can invite
    const userRole = await getMemberRole(orgId, payload.userId);
    if (!userRole) {
      return NextResponse.json({ error: 'Vous n\'êtes pas membre de cette organisation' }, { status: 403 });
    }

    if (userRole !== 'owner' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Seuls les propriétaires et administrateurs peuvent inviter des membres' }, { status: 403 });
    }

    const body = await req.json();
    const { email, role } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const validRoles = ['owner', 'admin', 'member'];
    const memberRole = role || 'member';
    if (!validRoles.includes(memberRole)) {
      return NextResponse.json({ error: 'Rôle invalide. Rôles valides : owner, admin, member' }, { status: 400 });
    }

    // Only owner can assign owner role
    if (memberRole === 'owner' && userRole !== 'owner') {
      return NextResponse.json({ error: 'Seul le propriétaire peut attribuer le rôle propriétaire' }, { status: 403 });
    }

    // Look up user by email
    const targetUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Aucun utilisateur trouvé avec cet email' }, { status: 404 });
    }

    // Check if already a member
    const existingMember = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: targetUser.id } },
    });

    if (existingMember) {
      return NextResponse.json({ error: 'Cet utilisateur est déjà membre de l\'organisation' }, { status: 409 });
    }

    // Check member quota
    const org = await db.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: { select: { members: true } },
        plan: { select: { maxTeamMembers: true } },
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 });
    }

    const maxMembers = org.plan?.maxTeamMembers ?? 1;
    if (maxMembers !== -1 && org._count.members >= maxMembers) {
      return NextResponse.json(
        { error: `Limite de ${maxMembers} membre(s) atteinte pour cette organisation` },
        { status: 403 }
      );
    }

    // Add as member
    const newMember = await db.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: targetUser.id,
        role: memberRole,
        joinedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    // Create notification for invited user
    await db.notification.create({
      data: {
        userId: targetUser.id,
        title: 'Invitation à une organisation',
        message: `Vous avez été ajouté(e) à l'organisation "${org.name}" en tant que ${memberRole === 'owner' ? 'propriétaire' : memberRole === 'admin' ? 'administrateur' : 'membre'}.`,
        type: 'info',
      },
    });

    // Audit log
    await auditLog({
      userId: payload.userId,
      action: 'organization.member_invite',
      entity: 'OrganizationMember',
      entityId: newMember.id,
      details: { organizationId: orgId, invitedEmail: email, role: memberRole },
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      member: {
        id: newMember.id,
        userId: newMember.user.id,
        name: newMember.user.name,
        email: newMember.user.email,
        avatar: newMember.user.avatar,
        role: newMember.role,
        invitedAt: newMember.invitedAt,
        joinedAt: newMember.joinedAt,
      },
    }, { status: 201 });
  } catch (_e) {
    console.error('Member invite error:', _e);
    return NextResponse.json({ error: 'Erreur lors de l\'invitation du membre' }, { status: 500 });
  }
}

// DELETE - Remove member: { userId: string }
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
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 400 });
    }

    // Check membership
    const userRole = await getMemberRole(orgId, payload.userId);
    if (!userRole) {
      return NextResponse.json({ error: 'Vous n\'êtes pas membre de cette organisation' }, { status: 403 });
    }

    // Allow self-removal (leaving) or owner/admin removal
    const isSelf = userId === payload.userId;

    if (!isSelf && userRole !== 'owner' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Seuls les propriétaires et administrateurs peuvent retirer des membres' }, { status: 403 });
    }

    // Find the member to remove
    const memberToRemove = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!memberToRemove) {
      return NextResponse.json({ error: 'Membre introuvable dans cette organisation' }, { status: 404 });
    }

    // Cannot remove the last owner
    if (memberToRemove.role === 'owner') {
      const ownerCount = await db.organizationMember.count({
        where: { organizationId: orgId, role: 'owner' },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Impossible de retirer le dernier propriétaire. Transférez d\'abord la propriété.' },
          { status: 400 }
        );
      }

      // Only owner can remove another owner
      if (userRole !== 'owner') {
        return NextResponse.json({ error: 'Seul le propriétaire peut retirer un autre propriétaire' }, { status: 403 });
      }
    }

    // Admin cannot remove another admin (only owner can)
    if (memberToRemove.role === 'admin' && userRole === 'admin' && !isSelf) {
      return NextResponse.json({ error: 'Vous ne pouvez pas retirer un autre administrateur' }, { status: 403 });
    }

    await db.organizationMember.delete({
      where: { id: memberToRemove.id },
    });

    // Audit log
    await auditLog({
      userId: payload.userId,
      action: isSelf ? 'organization.member_leave' : 'organization.member_remove',
      entity: 'OrganizationMember',
      entityId: memberToRemove.id,
      details: {
        organizationId: orgId,
        removedUserId: userId,
        removedUserName: memberToRemove.user.name,
        removedUserRole: memberToRemove.role,
      },
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (_e) {
    console.error('Member remove error:', _e);
    return NextResponse.json({ error: 'Erreur lors du retrait du membre' }, { status: 500 });
  }
}

// PATCH - Update member role: { userId: string, role: string }
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
    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: 'ID utilisateur et rôle requis' }, { status: 400 });
    }

    const validRoles = ['owner', 'admin', 'member'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide. Rôles valides : owner, admin, member' }, { status: 400 });
    }

    // Only owner can change roles
    const userRole = await getMemberRole(orgId, payload.userId);
    if (userRole !== 'owner') {
      return NextResponse.json({ error: 'Seul le propriétaire peut changer les rôles des membres' }, { status: 403 });
    }

    // Find the target member
    const targetMember = await db.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!targetMember) {
      return NextResponse.json({ error: 'Membre introuvable dans cette organisation' }, { status: 404 });
    }

    // Cannot change own role if you're the last owner
    if (userId === payload.userId && targetMember.role === 'owner' && role !== 'owner') {
      const ownerCount = await db.organizationMember.count({
        where: { organizationId: orgId, role: 'owner' },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Vous êtes le dernier propriétaire. Transférez d\'abord la propriété avant de changer votre rôle.' },
          { status: 400 }
        );
      }
    }

    const previousRole = targetMember.role;
    const updatedMember = await db.organizationMember.update({
      where: { id: targetMember.id },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    // Create notification for the user whose role changed
    if (previousRole !== role) {
      const roleLabels: Record<string, string> = {
        owner: 'propriétaire',
        admin: 'administrateur',
        member: 'membre',
      };

      await db.notification.create({
        data: {
          userId,
          title: 'Changement de rôle',
          message: `Votre rôle dans l'organisation a été changé de ${roleLabels[previousRole]} à ${roleLabels[role]}.`,
          type: role === 'owner' ? 'success' : 'info',
        },
      });
    }

    // Audit log
    await auditLog({
      userId: payload.userId,
      action: 'organization.member_role_change',
      entity: 'OrganizationMember',
      entityId: targetMember.id,
      details: {
        organizationId: orgId,
        targetUserId: userId,
        targetUserName: targetMember.user.name,
        previousRole,
        newRole: role,
      },
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      member: {
        id: updatedMember.id,
        userId: updatedMember.user.id,
        name: updatedMember.user.name,
        email: updatedMember.user.email,
        avatar: updatedMember.user.avatar,
        role: updatedMember.role,
        invitedAt: updatedMember.invitedAt,
        joinedAt: updatedMember.joinedAt,
      },
    });
  } catch (_e) {
    console.error('Member role update error:', _e);
    return NextResponse.json({ error: 'Erreur lors du changement de rôle' }, { status: 500 });
  }
}
