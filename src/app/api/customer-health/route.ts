import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateCustomerHealth, calculateChurnRisk } from '@/lib/prospection';

// GET: List customer health scores with churn risk
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const churnRisk = searchParams.get('churnRisk');
    const sortBy = searchParams.get('sortBy') || 'healthScore';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const where: any = { userId: payload.userId };
    if (churnRisk) where.churnRisk = churnRisk;

    const customers = await db.customerHealth.findMany({
      where,
      orderBy: { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
    });

    // Also get churn risk summary
    const churnSummary = await calculateChurnRisk(payload.userId);

    return NextResponse.json({ customers, churnSummary });
  } catch (error) {
    console.error('Customer Health GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST: Recalculate all health scores
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token invalide' }, { status: 401 });

    const results = await calculateCustomerHealth(payload.userId);
    const churnSummary = await calculateChurnRisk(payload.userId);

    return NextResponse.json({
      customers: results,
      churnSummary,
      recalculated: results.length,
    });
  } catch (error) {
    console.error('Customer Health POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
