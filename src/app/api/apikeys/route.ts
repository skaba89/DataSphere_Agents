import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { encryptKey, PROVIDERS, ProviderId } from "@/lib/ai-providers";

// GET /api/apikeys — list user's API keys (masked)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const keys = await db.apiKey.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: "desc" },
    });

    // Return keys with masked values
    const masked = keys.map((k) => ({
      id: k.id,
      provider: k.provider,
      model: k.model,
      isActive: k.isActive,
      keyMasked: "••••••••" + (k.keyEnc.length > 8 ? k.keyEnc.slice(-4) : ""),
      providerName: PROVIDERS[k.provider as ProviderId]?.name || k.provider,
      providerIcon: PROVIDERS[k.provider as ProviderId]?.icon || "🔑",
      providerColor: PROVIDERS[k.provider as ProviderId]?.color || "#666",
      createdAt: k.createdAt,
      updatedAt: k.updatedAt,
    }));

    // Also return available providers (with info on which are configured)
    const providers = Object.values(PROVIDERS).map((p) => ({
      ...p,
      configured: keys.some((k) => k.provider === p.id && k.isActive),
    }));

    return NextResponse.json({ keys: masked, providers });
  } catch (error) {
    console.error("ApiKeys list error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/apikeys — save or update an API key
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey, model, validate } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: "Provider et clé API requis" },
        { status: 400 }
      );
    }

    // Validate provider
    if (!PROVIDERS[provider as ProviderId]) {
      return NextResponse.json(
        { error: `Provider invalide: ${provider}` },
        { status: 400 }
      );
    }

    // Validate the API key only if explicitly requested (validate=true)
    // Otherwise, save directly — validation happens naturally on first chat
    const providerConfig = PROVIDERS[provider as ProviderId];
    if (validate) {
      let isValid = false;
      let validationError = "";

      try {
        if (provider === "anthropic") {
          const testRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "anthropic-dangerous-direct-browser-access": "true",
            },
            body: JSON.stringify({
              model: model || providerConfig.defaultModel,
              messages: [{ role: "user", content: "Hi" }],
              max_tokens: 5,
            }),
            signal: AbortSignal.timeout(10000),
          });
          if (testRes.ok || testRes.status === 400) {
            isValid = true;
          } else {
            validationError = `Clé invalide (${testRes.status})`;
          }
        } else {
          const testRes = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              ...(provider === "openrouter"
                ? { "HTTP-Referer": "https://datasphere.agents.app", "X-Title": "DataSphere Agents" }
                : {}),
            },
            body: JSON.stringify({
              model: model || providerConfig.defaultModel,
              messages: [{ role: "user", content: "Hi" }],
              max_tokens: 5,
            }),
            signal: AbortSignal.timeout(10000),
          });
          if (testRes.ok || testRes.status === 400) {
            isValid = true;
          } else {
            validationError = `Clé invalide (${testRes.status})`;
          }
        }
      } catch (err: any) {
        validationError = `Erreur de validation: ${err.message}`;
      }

      if (!isValid) {
        return NextResponse.json(
          { error: `Clé API invalide pour ${providerConfig.name}. ${validationError}` },
          { status: 400 }
        );
      }
    }

    // Encrypt and save
    const keyEnc = encryptKey(apiKey);
    const selectedModel = model || providerConfig.defaultModel;

    // Upsert: update if exists, create if not
    const saved = await db.apiKey.upsert({
      where: {
        userId_provider: {
          userId: payload.userId,
          provider,
        },
      },
      update: {
        keyEnc,
        model: selectedModel,
        isActive: true,
      },
      create: {
        userId: payload.userId,
        provider,
        keyEnc,
        model: selectedModel,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Clé API ${providerConfig.name} sauvegardée avec succès`,
      keyId: saved.id,
    });
  } catch (error) {
    console.error("ApiKey save error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/apikeys?provider=xxx
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const payload = await verifyToken(authHeader.slice(7));
    if (!payload) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    if (!provider) {
      return NextResponse.json(
        { error: "Provider requis" },
        { status: 400 }
      );
    }

    await db.apiKey.deleteMany({
      where: { userId: payload.userId, provider },
    });

    return NextResponse.json({
      success: true,
      message: `Clé API ${provider} supprimée`,
    });
  } catch (error) {
    console.error("ApiKey delete error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
