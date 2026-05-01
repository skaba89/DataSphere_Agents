import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { getUserUsageStats } from "@/lib/saas/quotas";

function getPeriodDates(period: string) {
  const now = new Date();
  const currentStart = new Date();

  switch (period) {
    case "7d":
      currentStart.setDate(now.getDate() - 7);
      break;
    case "30d":
      currentStart.setDate(now.getDate() - 30);
      break;
    case "90d":
      currentStart.setDate(now.getDate() - 90);
      break;
    default:
      currentStart.setDate(now.getDate() - 7);
  }

  currentStart.setHours(0, 0, 0, 0);

  // Previous period (same length, just before currentStart)
  const periodLength = now.getTime() - currentStart.getTime();
  const prevStart = new Date(currentStart.getTime() - periodLength);

  return { currentStart, prevStart, now };
}

function calcGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const userId = payload.userId;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";

    const { currentStart, prevStart, now } = getPeriodDates(period);

    // ─── Current period data ───────────────────────────────────
    const [
      currentMessages,
      currentConversations,
      currentUsageEvents,
      allUserAgents,
    ] = await Promise.all([
      db.chatMessage.findMany({
        where: {
          conversation: { userId },
          createdAt: { gte: currentStart, lte: now },
        },
        include: { conversation: { select: { agentId: true } } },
      }),
      db.conversation.findMany({
        where: {
          userId,
          createdAt: { gte: currentStart, lte: now },
        },
      }),
      db.usageEvent.findMany({
        where: {
          userId,
          createdAt: { gte: currentStart, lte: now },
        },
      }),
      db.agent.findMany({
        where: {
          OR: [{ isDefault: true }, { creatorId: userId }],
        },
      }),
    ]);

    // ─── Previous period data for growth ───────────────────────
    const [prevMessages, prevConversations, prevUsageEvents] =
      await Promise.all([
        db.chatMessage.findMany({
          where: {
            conversation: { userId },
            createdAt: { gte: prevStart, lt: currentStart },
          },
        }),
        db.conversation.findMany({
          where: {
            userId,
            createdAt: { gte: prevStart, lt: currentStart },
          },
        }),
        db.usageEvent.findMany({
          where: {
            userId,
            createdAt: { gte: prevStart, lt: currentStart },
          },
        }),
      ]);

    // ─── Overview ──────────────────────────────────────────────
    const totalMessages = currentMessages.length;
    const totalTokens = currentUsageEvents.reduce(
      (sum, e) => sum + e.tokensUsed,
      0
    );
    const totalConversations = currentConversations.length;
    const totalAgents = allUserAgents.length;
    const avgResponseTime =
      totalMessages > 0
        ? Math.round(
            currentMessages.reduce((sum, m) => sum + m.responseTime, 0) /
              totalMessages
          )
        : 0;

    const prevTotalMessages = prevMessages.length;
    const prevTotalTokens = prevUsageEvents.reduce(
      (sum, e) => sum + e.tokensUsed,
      0
    );
    const prevTotalConversations = prevConversations.length;

    const overview = {
      totalMessages,
      totalTokens,
      totalConversations,
      totalAgents,
      avgResponseTime,
      messagesGrowth: calcGrowth(totalMessages, prevTotalMessages),
      tokensGrowth: calcGrowth(totalTokens, prevTotalTokens),
      conversationsGrowth: calcGrowth(totalConversations, prevTotalConversations),
    };

    // ─── Daily Activity ────────────────────────────────────────
    const dailyMap: Record<
      string,
      { messages: number; tokens: number; conversations: number }
    > = {};

    // Initialize all days in the period
    const dayIter = new Date(currentStart);
    while (dayIter <= now) {
      const key = formatDay(dayIter);
      dailyMap[key] = { messages: 0, tokens: 0, conversations: 0 };
      dayIter.setDate(dayIter.getDate() + 1);
    }

    // Count messages per day
    currentMessages.forEach((msg) => {
      const key = formatDay(msg.createdAt);
      if (dailyMap[key]) dailyMap[key].messages++;
    });

    // Count tokens per day from usage events
    currentUsageEvents.forEach((evt) => {
      const key = formatDay(evt.createdAt);
      if (dailyMap[key]) dailyMap[key].tokens += evt.tokensUsed;
    });

    // Count conversations per day
    currentConversations.forEach((conv) => {
      const key = formatDay(conv.createdAt);
      if (dailyMap[key]) dailyMap[key].conversations++;
    });

    const dailyActivity = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    // ─── Provider Usage ────────────────────────────────────────
    const providerMap: Record<string, { count: number; tokens: number }> = {};
    currentUsageEvents.forEach((evt) => {
      const provider = evt.provider || "auto";
      if (!providerMap[provider]) {
        providerMap[provider] = { count: 0, tokens: 0 };
      }
      providerMap[provider].count++;
      providerMap[provider].tokens += evt.tokensUsed;
    });

    const providerUsage = Object.entries(providerMap)
      .map(([provider, data]) => ({ provider, ...data }))
      .sort((a, b) => b.count - a.count);

    // ─── Agent Usage ───────────────────────────────────────────
    const agentMessageMap: Record<
      string,
      { messages: number; tokens: number }
    > = {};

    currentMessages.forEach((msg) => {
      const agentId = msg.conversation?.agentId;
      if (agentId) {
        if (!agentMessageMap[agentId]) {
          agentMessageMap[agentId] = { messages: 0, tokens: 0 };
        }
        agentMessageMap[agentId].messages++;
        agentMessageMap[agentId].tokens += msg.tokensUsed;
      }
    });

    const agentUsage = Object.entries(agentMessageMap)
      .map(([agentId, data]) => {
        const agent = allUserAgents.find((a) => a.id === agentId);
        return {
          agentId,
          agentName: agent?.name || "Inconnu",
          agentType: agent?.type || "unknown",
          messages: data.messages,
          tokens: data.tokens,
        };
      })
      .sort((a, b) => b.messages - a.messages);

    // ─── Hourly Distribution ───────────────────────────────────
    const hourlyMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyMap[h] = 0;

    currentMessages.forEach((msg) => {
      const hour = new Date(msg.createdAt).getHours();
      hourlyMap[hour]++;
    });

    const hourlyDistribution = Object.entries(hourlyMap).map(
      ([hour, count]) => ({
        hour: parseInt(hour),
        count,
      })
    );

    // ─── Top Conversations ─────────────────────────────────────
    const convMsgCount: Record<string, number> = {};
    currentMessages.forEach((msg) => {
      const cId = msg.conversationId;
      convMsgCount[cId] = (convMsgCount[cId] || 0) + 1;
    });

    const topConvIds = Object.entries(convMsgCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    const topConvDetails = await db.conversation.findMany({
      where: { id: { in: topConvIds } },
      include: { agent: { select: { name: true } } },
    });

    const topConversations = topConvIds
      .map((id) => {
        const conv = topConvDetails.find((c) => c.id === id);
        if (!conv) return null;
        return {
          id: conv.id,
          title: conv.title || "Sans titre",
          messageCount: convMsgCount[id],
          agentName: conv.agent?.name || "Agent",
        };
      })
      .filter(Boolean) as {
      id: string;
      title: string;
      messageCount: number;
      agentName: string;
    }[];

    // ─── Plan Usage ────────────────────────────────────────────
    const usageStats = await getUserUsageStats(userId);

    const planUsage = {
      tokensUsed: usageStats.usage.tokens.used,
      tokensLimit: usageStats.usage.tokens.limit,
      agentsUsed: usageStats.usage.agents.used,
      agentsLimit: usageStats.usage.agents.limit,
      conversationsUsed: usageStats.usage.conversations.used,
      conversationsLimit: usageStats.usage.conversations.limit,
      documentsUsed: usageStats.usage.documents.used,
      documentsLimit: usageStats.usage.documents.limit,
    };

    return NextResponse.json({
      overview,
      dailyActivity,
      providerUsage,
      agentUsage,
      hourlyDistribution,
      topConversations,
      planUsage,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des analytics" },
      { status: 500 }
    );
  }
}
