import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateLeadScore } from '@/lib/prospection';

// GET: List prospects with filters
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const industry = searchParams.get('industry');
    const search = searchParams.get('search');

    const where: any = { userId: payload.userId };
    if (status) where.status = status;
    if (minScore || maxScore) {
      where.score = {};
      if (minScore) where.score.gte = parseFloat(minScore);
      if (maxScore) where.score.lte = parseFloat(maxScore);
    }
    if (industry) where.industry = industry;
    if (search) {
      where.OR = [
        { company: { contains: search } },
        { contactName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const prospects = await db.prospect.findMany({
      where,
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ prospects });
  } catch (error) {
    console.error('Prospects GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST: Create prospect (auto-calculate score)
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

    const body = await req.json();
    const { company, contactName, email, phone, website, industry, size, source, notes, tags } = body;

    if (!company) {
      return NextResponse.json({ error: 'Le nom de l\'entreprise est requis' }, { status: 400 });
    }

    // Calculate lead score
    const score = calculateLeadScore({
      industry,
      size,
      website,
      email,
      phone,
      notes,
      activities: [],
      lastContactAt: null,
    });

    const prospect = await db.prospect.create({
      data: {
        userId: payload.userId,
        company,
        contactName: contactName || null,
        email: email || null,
        phone: phone || null,
        website: website || null,
        industry: industry || null,
        size: size || null,
        source: source || 'manual',
        notes: notes || null,
        tags: tags ? JSON.stringify(tags) : null,
        score,
      },
      include: { activities: true },
    });

    // Create initial activity
    await db.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        type: 'note',
        content: `Prospect créé avec un score de ${score}/100`,
      },
    });

    return NextResponse.json({ prospect }, { status: 201 });
  } catch (error) {
    console.error('Prospects POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
