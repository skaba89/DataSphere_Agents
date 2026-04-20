import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "Fichier audio requis" }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    try {
      // SDK loaded via singleton
      const { getZAI } = await import("@/lib/zai");
      const zai = await getZAI();

      const result = await zai.audio.asr.create({
        file_base64: base64Audio,
      });

      const text = result?.text || result?.content || result?.result?.text || "";

      if (!text) {
        return NextResponse.json({
          text: "",
          message: "Aucune parole détectée",
        });
      }

      return NextResponse.json({ text });
    } catch (aiError) {
      console.error("ASR AI error:", aiError);
      return NextResponse.json({
        text: "",
        message: "Service vocal temporairement indisponible.",
      });
    }
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
