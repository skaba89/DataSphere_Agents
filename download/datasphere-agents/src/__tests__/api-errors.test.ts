import { describe, it, expect } from 'vitest'
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  TooManyRequestsError,
  InternalError,
  ValidationError,
  formatErrorResponse,
} from '@/lib/api-errors'

describe('API Error Classes', () => {
  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError(500, 'Test error', 'TEST_ERROR')
      expect(error.statusCode).toBe(500)
      expect(error.message).toBe('Test error')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.isOperational).toBe(true)
      expect(error.name).toBe('AppError')
    })

    it('should default code to INTERNAL_ERROR', () => {
      const error = new AppError(500, 'Test error')
      expect(error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('NotFoundError', () => {
    it('should create a 404 error', () => {
      const error = new NotFoundError('User')
      expect(error.statusCode).toBe(404)
      expect(error.message).toBe('User not found')
      expect(error.code).toBe('NOT_FOUND')
      expect(error.name).toBe('NotFoundError')
    })
  })

  describe('UnauthorizedError', () => {
    it('should create a 401 error with default message', () => {
      const error = new UnauthorizedError()
      expect(error.statusCode).toBe(401)
      expect(error.message).toBe('Unauthorized')
      expect(error.code).toBe('UNAUTHORIZED')
    })

    it('should create a 401 error with custom message', () => {
      const error = new UnauthorizedError('Invalid token')
      expect(error.message).toBe('Invalid token')
    })
  })

  describe('ForbiddenError', () => {
    it('should create a 403 error', () => {
      const error = new ForbiddenError()
      expect(error.statusCode).toBe(403)
      expect(error.message).toBe('Forbidden')
      expect(error.code).toBe('FORBIDDEN')
    })
  })

  describe('BadRequestError', () => {
    it('should create a 400 error', () => {
      const error = new BadRequestError('Invalid input')
      expect(error.statusCode).toBe(400)
      expect(error.message).toBe('Invalid input')
      expect(error.code).toBe('BAD_REQUEST')
    })
  })

  describe('ConflictError', () => {
    it('should create a 409 error', () => {
      const error = new ConflictError('Email already exists')
      expect(error.statusCode).toBe(409)
      expect(error.message).toBe('Email already exists')
      expect(error.code).toBe('CONFLICT')
    })
  })

  describe('TooManyRequestsError', () => {
    it('should create a 429 error with default message', () => {
      const error = new TooManyRequestsError()
      expect(error.statusCode).toBe(429)
      expect(error.message).toBe('Too many requests')
      expect(error.code).toBe('TOO_MANY_REQUESTS')
    })
  })

  describe('InternalError', () => {
    it('should create a 500 error with default message', () => {
      const error = new InternalError()
      expect(error.statusCode).toBe(500)
      expect(error.message).toBe('Internal server error')
      expect(error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('ValidationError', () => {
    it('should create a 422 error with validation details', () => {
      const errors = {
        email: ['Invalid email format'],
        password: ['Password too short'],
      }
      const error = new ValidationError(errors)
      expect(error.statusCode).toBe(422)
      expect(error.message).toBe('Validation failed')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.errors).toEqual(errors)
    })
  })
})

describe('formatErrorResponse', () => {
  it('should format AppError correctly', () => {
    const error = new NotFoundError('User')
    const { status, body } = formatErrorResponse(error)
    expect(status).toBe(404)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('NOT_FOUND')
    expect(body.error.message).toBe('User not found')
  })

  it('should format ValidationError with details', () => {
    const error = new ValidationError({
      email: ['Invalid email'],
    })
    const { status, body } = formatErrorResponse(error)
    expect(status).toBe(422)
    expect(body.error.details).toEqual({ email: ['Invalid email'] })
  })

  it('should format unknown errors as 500', () => {
    const error = new Error('Something unexpected')
    const { status, body } = formatErrorResponse(error)
    expect(status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })

  it('should format Prisma unique constraint errors', () => {
    const error = {
      code: 'P2002',
      meta: { target: ['email'] },
    }
    const { status, body } = formatErrorResponse(error)
    expect(status).toBe(409)
    expect(body.error.code).toBe('CONFLICT')
  })

  it('should format Prisma not found errors', () => {
    const error = {
      code: 'P2025',
    }
    const { status, body } = formatErrorResponse(error)
    expect(status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
  })
})
