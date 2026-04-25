import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { createPortalSession } from "@/lib/saas/stripe";

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

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "https";

    const result = await createPortalSession({
      userId: payload.userId,
      returnUrl: `${protocol}://${host}/?billing=portal`,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'accès au portail client" },
      { status: 500 }
    );
  }
}
