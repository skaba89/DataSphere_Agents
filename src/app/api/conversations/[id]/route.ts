import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getUserFromRequest, verifyToken } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError, NotFoundError, ForbiddenError } from '@/lib/api-errors'

// GET /api/conversations/[id] - Get conversation with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Authenticate
    let user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) {
      const accessToken = request.cookies.get('access-token')?.value
      if (accessToken) {
        try { user = verifyToken(accessToken) } catch { throw new UnauthorizedError() }
      } else {
        throw new UnauthorizedError()
      }
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        agent: { select: { id: true, name: true, model: true, systemPrompt: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!conversation) throw new NotFoundError('Conversation')
    if (conversation.userId !== user.userId) throw new ForbiddenError('Not your conversation')

    return NextResponse.json({ success: true, data: conversation })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

// DELETE /api/conversations/[id] - Delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Authenticate
    let user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) {
      const accessToken = request.cookies.get('access-token')?.value
      if (accessToken) {
        try { user = verifyToken(accessToken) } catch { throw new UnauthorizedError() }
      } else {
        throw new UnauthorizedError()
      }
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    })

    if (!conversation) throw new NotFoundError('Conversation')
    if (conversation.userId !== user.userId) throw new ForbiddenError('Not your conversation')

    await prisma.conversation.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { message: 'Conversation deleted' } })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}
