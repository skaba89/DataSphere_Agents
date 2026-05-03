import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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

    const { prompt, conversationId } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt requis" }, { status: 400 });
    }

    let imageUrl = "";

    try {
      // SDK loaded via singleton
      const { getZAI } = await import("@/lib/zai");
      const zai = await getZAI();

      const result = await zai.images.generations.create({
        prompt,
        size: "1024x1024",
      });

      const base64Image = result.data?.[0]?.base64;

      if (base64Image) {
        const uploadDir = path.join(process.cwd(), "public", "generated");
        await mkdir(uploadDir, { recursive: true });

        const filename = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
        const filepath = path.join(uploadDir, filename);

        const buffer = Buffer.from(base64Image, "base64");
        await writeFile(filepath, buffer);

        imageUrl = `/generated/${filename}`;
      }
    } catch (aiError) {
      console.error("Image generation error:", aiError);
      return NextResponse.json({
        error: "Erreur de génération d'image. Veuillez réessayer.",
        imageUrl: "",
      }, { status: 500 });
    }

    if (conversationId && imageUrl) {
      await db.chatMessage.create({
        data: {
          conversationId,
          role: "assistant",
          content: `![Image générée](${imageUrl})\n\n*Image générée pour : "${prompt}"*`,
        },
      });
    }

    return NextResponse.json({ imageUrl, prompt });
  } catch (_e) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
