import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { scanMarketOpportunities } from '@/lib/prospection';

// GET: List insights (filterable by type)
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    const where: any = { userId: payload.userId };
    if (type) where.type = type;

    const insights = await db.marketInsight.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Market Insights GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST: Trigger market scan { industry, type }
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

    const body = await req.json();
    const { industry } = body;

    if (!industry) {
      return NextResponse.json({ error: 'Secteur d\'activité requis' }, { status: 400 });
    }

    const insights = await scanMarketOpportunities(payload.userId, industry);

    return NextResponse.json({ insights }, { status: 201 });
  } catch (error) {
    console.error('Market Insights POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
