import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(request: Request) {
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

    const { phone, amount } = await request.json();

    if (!phone || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Numéro de téléphone et montant valide requis" },
        { status: 400 }
      );
    }

    const transaction = await db.transaction.create({
      data: {
        userId: payload.userId,
        phone,
        amount: parseFloat(amount),
        status: "success",
        provider: "Mobile Money",
      },
    });

    return NextResponse.json({
      status: "success",
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        phone: transaction.phone,
        provider: transaction.provider,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json(
      { error: "Erreur lors du paiement" },
      { status: 500 }
    );
  }
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

    const transactions = await db.transaction.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Payment list error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des transactions" },
      { status: 500 }
    );
  }
}
