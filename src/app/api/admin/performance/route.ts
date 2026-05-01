import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  try {
    // Total user count
    const userCount = await db.user.count();

    // Active users (last 24h) - approximate by recent login
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = await db.user.count({
      where: {
        lastLoginAt: { gte: oneDayAgo },
      },
    });

    // Total conversations
    const totalConversations = await db.conversation.count();

    // Total messages
    const totalMessages = await db.chatMessage.count();

    // Average response time
    const avgResponseResult = await db.chatMessage.aggregate({
      _avg: { responseTime: true },
      where: { responseTime: { gt: 0 } },
    });
    const avgResponseTime = Math.round(avgResponseResult._avg.responseTime || 0);

    // Total agents
    const totalAgents = await db.agent.count();

    // Memory usage
    const memUsage = process.memoryUsage();
    const memoryMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    // Usage events today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const eventsToday = await db.usageEvent.count({
      where: { createdAt: { gte: todayStart } },
    });

    // Error rate approximation (based on webhook delivery failures)
    const totalDeliveries = await db.webhookDelivery.count();
    const failedDeliveries = await db.webhookDelivery.count({
      where: { success: false },
    });
    const errorRate = totalDeliveries > 0 ? ((failedDeliveries / totalDeliveries) * 100).toFixed(2) : '0';

    return NextResponse.json({
      userCount,
      activeUsers,
      totalConversations,
      totalMessages,
      totalAgents,
      avgResponseTime,
      eventsToday,
      memory: {
        usedMB: memoryMB,
        totalMB: memoryTotalMB,
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      },
      errorRate: parseFloat(errorRate),
      uptime: Math.round(process.uptime()),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des métriques' },
      { status: 500 }
    );
  }
}
