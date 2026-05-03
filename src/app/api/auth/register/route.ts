<<<<<<< HEAD
import { NextRequest, NextResponse } from 'next/server'
import prisma, { isDatabaseAvailable } from '@/lib/db'
import { hashPassword, generateTokenPair, generateRandomToken } from '@/lib/auth'
import { formatErrorResponse, ConflictError, ServiceUnavailableError } from '@/lib/api-errors'
import { registerSchema } from '@/lib/validations/auth'
import { getDemoService } from '@/lib/demo-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const result = registerSchema.safeParse(body)
    if (!result.success) {
      const errors: Record<string, string[]> = {}
      result.error.issues.forEach((issue) => {
        const key = issue.path.join('.')
        if (!errors[key]) errors[key] = []
        errors[key].push(issue.message)
      })
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: errors } },
        { status: 422 }
      )
    }

    const { name, email, password } = result.data

    // Check database availability — fall back to demo service if unavailable
    const dbAvailable = await isDatabaseAvailable()
    if (!dbAvailable) {
      const demo = getDemoService()
      const demoResult = await demo.register({ name, email, password })

      if (!demoResult.success) {
        if (demoResult.error === 'CONFLICT') throw new ConflictError(demoResult.message)
        throw new ServiceUnavailableError(demoResult.message)
      }

      const response = NextResponse.json({
        success: true,
        data: {
          ...demoResult.data,
          demoMode: true,
        },
      }, { status: 201 })

      const tokens = demoResult.data!.tokens
      response.cookies.set('access-token', tokens.accessToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60, path: '/',
      })
      response.cookies.set('refresh-token', tokens.refreshToken, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60, path: '/',
      })

      return response
    }

    // --- Database path ---
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) throw new ConflictError('User with this email already exists')

    const passwordHash = await hashPassword(password)

    const result_data = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name: name || email.split('@')[0], passwordHash, emailVerified: false },
      })
      const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-') + '-' + Date.now().toString(36)
      const org = await tx.organization.create({
        data: {
          name: `${user.name}'s Organization`, slug, ownerId: user.id, plan: 'FREE',
          members: { create: { userId: user.id, role: 'OWNER' } },
        },
      })
      const provider = await tx.aiProvider.create({
        data: { name: 'OpenAI (Default)', type: 'OPENAI', apiKey: 'sk-placeholder-add-your-key', organizationId: org.id, isActive: false },
      })
      const verificationToken = generateRandomToken()
      await tx.emailVerification.create({
        data: { userId: user.id, token: verificationToken, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      })
      await tx.notification.create({
        data: { userId: user.id, type: 'INFO', title: 'Welcome to DataSphere Agents!', message: 'Your account has been created. Start by setting up an AI provider and creating your first agent.' },
      })
      return { user, org, provider, verificationToken }
    })

    const tokens = generateTokenPair({ userId: result_data.user.id, email: result_data.user.email, role: result_data.user.role })
    await prisma.refreshToken.create({
      data: { userId: result_data.user.id, token: tokens.refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    })

    const response = NextResponse.json({
      success: true,
      data: {
        user: { id: result_data.user.id, email: result_data.user.email, name: result_data.user.name, role: result_data.user.role, emailVerified: result_data.user.emailVerified },
        organization: { id: result_data.org.id, name: result_data.org.name, slug: result_data.org.slug },
        tokens: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
        verificationToken: process.env.NODE_ENV === 'development' ? result_data.verificationToken : undefined,
      },
    }, { status: 201 })

    response.cookies.set('access-token', tokens.accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60, path: '/' })
    response.cookies.set('refresh-token', tokens.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60, path: '/' })
    return response
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
=======
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
>>>>>>> e18a62a3dc925c7a6dc59f9438555db31d87525f
  }
}
