import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

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

    // Get user's subscription to find invoices
    const subscription = await db.subscription.findUnique({
      where: { userId: payload.userId },
    });

    if (!subscription) {
      return NextResponse.json({ invoices: [] });
    }

    // Fetch invoices for the subscription
    const invoices = await db.invoice.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      invoices: invoices.map((inv) => ({
        id: inv.id,
        amount: inv.amount,
        currency: inv.currency,
        status: inv.status,
        createdAt: inv.createdAt,
        stripeInvoiceId: inv.stripeInvoiceId,
        stripeInvoiceUrl: inv.stripeInvoiceUrl,
        paidAt: inv.paidAt,
      })),
    });
  } catch (error) {
    console.error("Invoices API error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des factures" },
      { status: 500 }
    );
  }
}
