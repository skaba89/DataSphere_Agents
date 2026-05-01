import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateLeadScore } from '@/lib/prospection';

// GET: Prospect detail with activities
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

    const { id } = await params;
    const prospect = await db.prospect.findFirst({
      where: { id, userId: payload.userId },
      include: {
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ prospect });
  } catch (error) {
    console.error('Prospect GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PATCH: Update prospect (recalculate score on status change)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { company, contactName, email, phone, website, industry, size, status, source, notes, tags, lastContactAt } = body;

    const existing = await db.prospect.findFirst({
      where: { id, userId: payload.userId },
      include: { activities: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Prospect non trouvé' }, { status: 404 });
    }

    const updateData: any = {};
    if (company !== undefined) updateData.company = company;
    if (contactName !== undefined) updateData.contactName = contactName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (industry !== undefined) updateData.industry = industry;
    if (size !== undefined) updateData.size = size;
    if (source !== undefined) updateData.source = source;
    if (notes !== undefined) updateData.notes = notes;
    if (tags !== undefined) updateData.tags = tags ? JSON.stringify(tags) : null;
    if (lastContactAt !== undefined) updateData.lastContactAt = lastContactAt;

    // Handle status change
    if (status !== undefined && status !== existing.status) {
      updateData.status = status;
      updateData.lastContactAt = new Date();

      // Create status change activity
      await db.prospectActivity.create({
        data: {
          prospectId: id,
          type: 'status_change',
          content: `Statut changé: ${existing.status} → ${status}`,
        },
      });
    }

    // Recalculate score
    const mergedData = { ...existing, ...updateData };
    updateData.score = calculateLeadScore({
      industry: mergedData.industry,
      size: mergedData.size,
      website: mergedData.website,
      email: mergedData.email,
      phone: mergedData.phone,
      notes: mergedData.notes,
      activities: existing.activities,
      lastContactAt: mergedData.lastContactAt,
    });

    const prospect = await db.prospect.update({
      where: { id },
      data: updateData,
      include: { activities: { orderBy: { createdAt: 'desc' } } },
    });

    return NextResponse.json({ prospect });
  } catch (error) {
    console.error('Prospect PATCH error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE: Delete prospect
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

    const { id } = await params;
    const existing = await db.prospect.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Prospect non trouvé' }, { status: 404 });
    }

    await db.prospect.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Prospect DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
