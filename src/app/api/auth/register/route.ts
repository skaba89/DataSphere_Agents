import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import {
  checkRateLimit,
  sanitizeInput,
  isValidEmail,
  isStrongPassword,
} from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 attempts per minute for register
    if (!checkRateLimit(request, 3)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Veuillez réessayer dans une minute." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const rawEmail = (body.email || "").trim().slice(0, 254);
    const password = body.password || "";
    const name = sanitizeInput(body.name || "", 100);

    if (!rawEmail || !password || !name) {
      return NextResponse.json(
        { error: "Nom, email et mot de passe requis" },
        { status: 400 }
      );
    }

    // Validate email format (don't HTML-escape email for DB lookup)
    if (!isValidEmail(rawEmail)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordCheck = isStrongPassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.message },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { email: rawEmail } });

    if (existingUser) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: {
        email: rawEmail,
        name,
        password: hashedPassword,
        role: "user",
      },
    });

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    );
  }
}
