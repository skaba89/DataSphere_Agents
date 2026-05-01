import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { auditLog } from "@/lib/audit";
import { checkTokenQuota, recordUsage } from "@/lib/saas/quotas";
import { decryptKey, PROVIDERS, ProviderId } from "@/lib/ai-providers";

interface ComparisonProvider {
  id: string;
  name: string;
  model: string;
}

// POST /api/comparison — Run multi-AI comparison
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    if (!hasPermission(payload.role, PERMISSIONS.COMPARISON_USE)) {
      return NextResponse.json({ error: "Accès refusé - fonctionnalité réservée aux plans Pro+" }, { status: 403 });
    }

    const { prompt, providers: selectedProviders, agentId } = await req.json();

    if (!prompt || !selectedProviders || selectedProviders.length < 2) {
      return NextResponse.json({ error: "Prompt et au moins 2 providers requis" }, { status: 400 });
    }

    // Check token quota (estimate 500 tokens per provider)
    const estimatedTokens = selectedProviders.length * 500;
    const quotaCheck = await checkTokenQuota(payload.userId, estimatedTokens);
    if (!quotaCheck.allowed) {
      return NextResponse.json({
        error: quotaCheck.reason || "Quota de tokens insuffisant",
        quotaExceeded: true,
      }, { status: 429 });
    }

    // Get user's API keys
    const userKeys = await db.aiProviderKey.findMany({
      where: { userId: payload.userId, isActive: true },
    });

    // Run comparisons in parallel
    const results = await Promise.allSettled(
      selectedProviders.map(async (providerId: string) => {
        const startTime = Date.now();
        const providerConfig = PROVIDERS[providerId as ProviderId];
        if (!providerConfig) {
          return { provider: providerId, error: `Provider inconnu: ${providerId}` };
        }

        // Find user's key for this provider
        const userKey = userKeys.find(k => k.provider === providerId);
        const apiKey = userKey ? decryptKey(userKey.keyEnc) : null;

        if (!apiKey) {
          return {
            provider: providerId,
            providerName: providerConfig.name,
            model: providerConfig.defaultModel,
            error: `Clé API non configurée pour ${providerConfig.name}`,
          };
        }

        try {
          const model = userKey?.model || providerConfig.defaultModel;

          let response: Response;
          if (providerId === 'anthropic') {
            response = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "anthropic-dangerous-direct-browser-access": "true",
              },
              body: JSON.stringify({
                model,
                max_tokens: 500,
                messages: [{ role: "user", content: prompt }],
              }),
              signal: AbortSignal.timeout(30000),
            });
          } else {
            response = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                ...(providerId === "openrouter"
                  ? { "HTTP-Referer": "https://datasphere.agents.app", "X-Title": "DataSphere Agents" }
                  : {}),
              },
              body: JSON.stringify({
                model,
                messages: [{ role: "user", content: prompt }],
                max_tokens: 500,
              }),
              signal: AbortSignal.timeout(30000),
            });
          }

          const responseTime = Date.now() - startTime;

          if (!response.ok) {
            const errorData = await response.text();
            return {
              provider: providerId,
              providerName: providerConfig.name,
              model,
              error: `Erreur API (${response.status}): ${errorData.slice(0, 200)}`,
              responseTime,
            };
          }

          const data = await response.json();
          let content = '';
          let tokensUsed = 0;

          if (providerId === 'anthropic') {
            content = data.content?.[0]?.text || '';
            tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
          } else {
            content = data.choices?.[0]?.message?.content || '';
            tokensUsed = data.usage?.total_tokens || 0;
          }

          // Score the response
          const score = calculateResponseScore(content, responseTime, tokensUsed);

          return {
            provider: providerId,
            providerName: providerConfig.name,
            model,
            response: content,
            tokensUsed,
            responseTime,
            score,
          };
        } catch (err: any) {
          return {
            provider: providerId,
            providerName: providerConfig.name,
            error: `Erreur: ${err.message}`,
            responseTime: Date.now() - startTime,
          };
        }
      })
    );

    // Process results
    const processedResults = results.map(r =>
      r.status === 'fulfilled' ? r.value : { error: r.reason?.message || 'Erreur inconnue' }
    );

    // Find best provider (highest score)
    const successfulResults = processedResults.filter((r: any) => r.score !== undefined);
    const bestProvider = successfulResults.length > 0
      ? successfulResults.reduce((best: any, curr: any) => curr.score > best.score ? curr : best).provider
      : null;

    // Save comparison result
    await db.comparisonResult.create({
      data: {
        userId: payload.userId,
        prompt,
        results: JSON.stringify(processedResults),
        bestProvider,
      },
    });

    // Record usage
    const totalTokens = processedResults.reduce((sum: number, r: any) => sum + (r.tokensUsed || 0), 0);
    await recordUsage({
      userId: payload.userId,
      eventType: 'comparison',
      tokensUsed: totalTokens,
      provider: 'multi',
      agentId,
    });

    await auditLog({
      userId: payload.userId,
      action: 'comparison.run',
      entity: 'ComparisonResult',
      details: {
        providerCount: selectedProviders.length,
        totalTokens,
        bestProvider,
      },
    });

    return NextResponse.json({
      results: processedResults,
      bestProvider,
      totalTokens,
    });
  } catch (_e) {
    console.error('Comparison error:', _e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET /api/comparison — Get comparison history
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const comparisons = await db.comparisonResult.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      comparisons: comparisons.map(c => ({
        id: c.id,
        prompt: c.prompt,
        bestProvider: c.bestProvider,
        results: JSON.parse(c.results),
        createdAt: c.createdAt,
      })),
    });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * Calculate a score for a comparison response
 * Based on: content length, response time, and token efficiency
 */
function calculateResponseScore(content: string, responseTime: number, tokensUsed: number): number {
  let score = 50; // Base score

  // Content quality (length-based, optimal 200-800 chars)
  if (content.length > 50) score += 10;
  if (content.length > 200) score += 10;
  if (content.length > 500) score += 5;
  if (content.length > 1500) score -= 5; // Too verbose

  // Response time (faster is better)
  if (responseTime < 2000) score += 15;
  else if (responseTime < 5000) score += 10;
  else if (responseTime < 10000) score += 5;
  else score -= 5;

  // Token efficiency
  if (tokensUsed > 0 && content.length > 0) {
    const efficiency = content.length / tokensUsed;
    if (efficiency > 2) score += 10;
    else if (efficiency > 1) score += 5;
  }

  return Math.min(100, Math.max(0, score));
}
