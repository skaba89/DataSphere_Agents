import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { createCheckoutSession } from "@/lib/saas/stripe";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { planName, billingInterval } = body;

    if (!planName || !['pro', 'enterprise'].includes(planName)) {
      return NextResponse.json(
        { error: "Plan invalide. Choisissez 'pro' ou 'enterprise'." },
        { status: 400 }
      );
    }

    if (!billingInterval || !['monthly', 'yearly'].includes(billingInterval)) {
      return NextResponse.json(
        { error: "Intervalle de facturation invalide" },
        { status: 400 }
      );
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "https";

    const result = await createCheckoutSession({
      userId: payload.userId,
      userEmail: payload.email,
      planName,
      billingInterval,
      successUrl: `${protocol}://${host}/?billing=success`,
      cancelUrl: `${protocol}://${host}/?billing=canceled`,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session de paiement" },
      { status: 500 }
    );
  }
}
