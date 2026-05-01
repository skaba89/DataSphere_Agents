export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(statusCode: number, message: string, code?: string, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.code = code || 'INTERNAL_ERROR'
    this.isOperational = isOperational
    this.name = 'AppError'

    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND')
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
    Object.setPrototypeOf(this, UnauthorizedError.prototype)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN')
    this.name = 'ForbiddenError'
    Object.setPrototypeOf(this, ForbiddenError.prototype)
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message, 'BAD_REQUEST')
    this.name = 'BadRequestError'
    Object.setPrototypeOf(this, BadRequestError.prototype)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT')
    this.name = 'ConflictError'
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests') {
    super(429, message, 'TOO_MANY_REQUESTS')
    this.name = 'TooManyRequestsError'
    Object.setPrototypeOf(this, TooManyRequestsError.prototype)
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(500, message, 'INTERNAL_ERROR')
    this.name = 'InternalError'
    Object.setPrototypeOf(this, InternalError.prototype)
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable. Please try again later.') {
    super(503, message, 'SERVICE_UNAVAILABLE')
    this.name = 'ServiceUnavailableError'
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype)
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>

  constructor(errors: Record<string, string[]>) {
    super(422, 'Validation failed', 'VALIDATION_ERROR')
    this.name = 'ValidationError'
    this.errors = errors
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown) {
  if (error instanceof ValidationError) {
    return {
      status: error.statusCode,
      body: {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.errors,
        },
      },
    }
  }

  if (error instanceof AppError) {
    return {
      status: error.statusCode,
      body: {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
    }
  }

  // Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: { target?: string[] } }
    switch (prismaError.code) {
      case 'P2002':
        return {
          status: 409,
          body: {
            success: false,
            error: {
              code: 'CONFLICT',
              message: `Unique constraint violation on: ${prismaError.meta?.target?.join(', ') || 'unknown field'}`,
            },
          },
        }
      case 'P2025':
        return {
          status: 404,
          body: {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Record not found',
            },
          },
        }
      default:
        break
    }
  }

  // Unknown errors
  console.error('Unhandled error:', error)
  return {
    status: 500,
    body: {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
  }
}
