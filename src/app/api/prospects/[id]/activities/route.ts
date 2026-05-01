import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

// GET: List activities for a prospect
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

    // Verify prospect belongs to user
    const prospect = await db.prospect.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect non trouvé' }, { status: 404 });
    }

    const activities = await db.prospectActivity.findMany({
      where: { prospectId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Activities GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST: Add activity to a prospect
export async function POST(
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
    const { type, content } = body;

    if (!type || !content) {
      return NextResponse.json({ error: 'Type et contenu requis' }, { status: 400 });
    }

    // Verify prospect belongs to user
    const prospect = await db.prospect.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect non trouvé' }, { status: 404 });
    }

    const activity = await db.prospectActivity.create({
      data: {
        prospectId: id,
        type,
        content,
      },
    });

    // Update lastContactAt for call, email, meeting types
    if (['call', 'email', 'meeting'].includes(type)) {
      await db.prospect.update({
        where: { id },
        data: { lastContactAt: new Date() },
      });
    }

    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error('Activities POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
