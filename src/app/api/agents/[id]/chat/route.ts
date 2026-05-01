import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { isDatabaseAvailable } from '@/lib/db'
import { getDemoService } from '@/lib/demo-service'
import { getUserFromRequest, verifyToken } from '@/lib/auth'
import { formatErrorResponse, UnauthorizedError, NotFoundError, BadRequestError, ForbiddenError } from '@/lib/api-errors'
import { chatMessageSchema } from '@/lib/validations/agent'

// POST /api/agents/[id]/chat - Send a message to an agent and get AI response via SSE
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params

    // Authenticate user - check Authorization header and cookies
    let user = getUserFromRequest(request.headers.get('authorization'))
    if (!user) {
      const accessToken = request.cookies.get('access-token')?.value
      if (accessToken) {
        try {
          user = verifyToken(accessToken)
        } catch {
          throw new UnauthorizedError()
        }
      } else {
        throw new UnauthorizedError()
      }
    }

    // Validate input
    const body = await request.json()
    const result = chatMessageSchema.safeParse(body)
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

    const { content: userMessage } = result.data

    const dbAvailable = await isDatabaseAvailable()

    if (!dbAvailable) {
      const demo = getDemoService()

      // Find the agent
      const agent = await demo.getAgent(agentId)
      if (!agent) throw new NotFoundError('Agent')
      if (!(agent as Record<string, unknown>).isActive) throw new BadRequestError('This agent is currently inactive')

      // Verify user has access
      const membership = await demo.getOrgMembership(user.userId, agent.organizationId as string)
      if (!membership) throw new ForbiddenError('You do not have access to this agent')

      // Find or create conversation
      let conversationId = body.conversationId as string | undefined
      let conversation

      if (conversationId) {
        conversation = await demo.getConversation(conversationId)
        if (!conversation || (conversation as Record<string, unknown>).userId !== user.userId) {
          throw new NotFoundError('Conversation')
        }
      } else {
        conversation = await demo.createConversation(agentId, user.userId, `Chat with ${agent.name}`)
        conversationId = conversation.id
      }

      // Save user message
      await demo.addMessage(conversation.id, 'USER', userMessage)

      // Get existing messages for context
      const existingMessages = await demo.getConversationMessages(conversation.id)

      // Build messages array for AI
      const systemMessage = agent.systemPrompt || 'You are a helpful AI assistant.'
      const aiMessages = [
        { role: 'system' as const, content: systemMessage },
        ...existingMessages.map((m: { role: string; content: string }) => ({
          role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
      ]

      // Get AI response (already has demo fallback)
      let assistantContent: string

      try {
        assistantContent = await getAIResponse(
          {
            model: agent.model as string,
            provider: agent.provider as { type: string; apiKey: string; name: string },
            temperature: agent.temperature as number,
            maxTokens: agent.maxTokens as number,
          },
          aiMessages
        )
      } catch (aiError) {
        console.error('AI provider error:', aiError)
        assistantContent = 'I apologize, but I am currently unable to process your request. The AI service may be temporarily unavailable. Please try again in a moment.'
      }

      // Save assistant message
      const assistantMessage = await demo.addMessage(conversation.id, 'ASSISTANT', assistantContent)

      // Return as SSE stream
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          const words = assistantContent.split(' ')
          let index = 0

          const interval = setInterval(() => {
            if (index < words.length) {
              const chunk = index === 0 ? words[index] : ' ' + words[index]
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`)
              )
              index++
            } else {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: '', done: true, conversationId: conversation.id, messageId: assistantMessage.id, demoMode: true })}\n\n`)
              )
              clearInterval(interval)
              controller.close()
            }
          }, 30)
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    // Find the agent
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        provider: true,
        organization: { include: { members: true } },
      },
    })

    if (!agent) throw new NotFoundError('Agent')
    if (!agent.isActive) throw new BadRequestError('This agent is currently inactive')

    // Verify user has access
    const isMember = agent.organization.members.some((m) => m.userId === user.userId)
    if (!isMember) throw new ForbiddenError('You do not have access to this agent')

    // Find or create conversation
    let conversationId = body.conversationId as string | undefined
    let conversation

    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
      if (!conversation || conversation.userId !== user.userId) {
        throw new NotFoundError('Conversation')
      }
    } else {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          agentId,
          userId: user.userId,
          title: `Chat with ${agent.name}`,
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
      conversationId = conversation.id
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: userMessage,
      },
    })

    // Build messages array for AI
    const systemMessage = agent.systemPrompt || 'You are a helpful AI assistant.'
    const aiMessages = [
      { role: 'system' as const, content: systemMessage },
      ...conversation.messages.map((m) => ({
        role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      { role: 'user' as const, content: userMessage },
    ]

    // Get AI response using z-ai-web-dev-sdk or OpenAI API
    let assistantContent: string
    const tokensUsed: number | null = null

    try {
      assistantContent = await getAIResponse(agent, aiMessages)
    } catch (aiError) {
      console.error('AI provider error:', aiError)
      // Fallback response
      assistantContent = 'I apologize, but I am currently unable to process your request. The AI service may be temporarily unavailable. Please try again in a moment.'
    }

    // Save assistant message
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: assistantContent,
        tokens: tokensUsed,
      },
    })

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    })

    // Return as SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Stream the response word by word for typing effect
        const words = assistantContent.split(' ')
        let index = 0

        const interval = setInterval(() => {
          if (index < words.length) {
            const chunk = index === 0 ? words[index] : ' ' + words[index]
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`)
            )
            index++
          } else {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: '', done: true, conversationId: conversation.id, messageId: assistantMessage.id })}\n\n`)
            )
            clearInterval(interval)
            controller.close()
          }
        }, 30) // 30ms per word for typing effect
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    const { status, body } = formatErrorResponse(error)
    return NextResponse.json(body, { status })
  }
}

/**
 * Get AI response from the configured provider
 */
async function getAIResponse(
  agent: { model: string; provider: { type: string; apiKey: string; name: string }; temperature: number; maxTokens: number },
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  // Try z-ai-web-dev-sdk first
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      model: agent.model || 'gpt-4',
      temperature: agent.temperature || 0.7,
      max_tokens: agent.maxTokens || 2048,
    })

    const content = completion.choices[0]?.message?.content
    if (content) return content
  } catch (zaiError) {
    console.log('z-ai-web-dev-sdk failed, trying direct API:', (zaiError as Error).message)
  }

  // Fallback: Try OpenAI API directly if API key is configured
  if (agent.provider.apiKey && agent.provider.apiKey !== 'sk-placeholder-add-your-key') {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${agent.provider.apiKey}`,
        },
        body: JSON.stringify({
          model: agent.model || 'gpt-4',
          messages: messages.map((m) => ({
            role: m.role as 'system' | 'user' | 'assistant',
            content: m.content,
          })),
          temperature: agent.temperature || 0.7,
          max_tokens: agent.maxTokens || 2048,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.choices[0]?.message?.content || 'No response from AI.'
      }
    } catch (openaiError) {
      console.log('OpenAI API failed:', (openaiError as Error).message)
    }
  }

  // Fallback: Try Anthropic API if provider type is ANTHROPIC
  if (agent.provider.type === 'ANTHROPIC' && agent.provider.apiKey && agent.provider.apiKey !== 'sk-placeholder-add-your-key') {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': agent.provider.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: agent.model || 'claude-3-5-sonnet-20241022',
          max_tokens: agent.maxTokens || 2048,
          system: messages.find((m) => m.role === 'system')?.content,
          messages: messages.filter((m) => m.role !== 'system').map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.content?.[0]?.text || 'No response from AI.'
      }
    } catch (anthropicError) {
      console.log('Anthropic API failed:', (anthropicError as Error).message)
    }
  }

  // Demo mode - generate contextual responses
  return generateDemoResponse(messages[messages.length - 1]?.content || '', agent.model)
}

/**
 * Generate a demo response when no AI provider is configured
 */
function generateDemoResponse(userMessage: string, model: string): string {
  const lowerMessage = userMessage.toLowerCase()

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return `Hello! I'm an AI agent powered by ${model}. How can I help you today? I'm currently running in demo mode. To get real AI responses, please configure an API key for your AI provider in the settings.`
  }

  if (lowerMessage.includes('help')) {
    return `I'd be happy to help! I'm currently running in demo mode, which means I can provide basic responses but not full AI capabilities. To unlock my full potential, an administrator needs to configure an AI provider API key (OpenAI, Anthropic, etc.) in the organization settings. Here are some things I can assist with once fully configured:\n\n- Answering questions and providing information\n- Writing and analyzing text\n- Code generation and debugging\n- Data analysis and insights\n- Creative brainstorming\n\nIs there something specific you'd like to know?`
  }

  if (lowerMessage.includes('code') || lowerMessage.includes('programming') || lowerMessage.includes('develop')) {
    return `I can help with coding questions! While I'm in demo mode, here's a sample response:\n\nTo get full code assistance, configure an AI provider. I support:\n- Code generation in multiple languages\n- Debugging and error fixing\n- Code review and optimization\n- Architecture suggestions\n\nWould you like to know more about any of these capabilities?`
  }

  return `Thank you for your message! I'm currently running in demo mode with the ${model} model. My responses are limited until an AI provider API key is configured.\n\nTo enable full AI capabilities:\n1. Go to Settings\n2. Navigate to AI Providers\n3. Add your API key (OpenAI, Anthropic, etc.)\n4. Update this agent to use the configured provider\n\nOnce configured, I'll be able to provide intelligent, contextual responses to all your questions!`
}
