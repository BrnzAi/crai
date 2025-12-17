import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError, ErrorCodes } from '@cryptoai/core';

/**
 * Global error handler for the API
 */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Validation failed',
        details: {
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      },
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle custom application errors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle JWT errors
  if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
    return reply.status(401).send({
      success: false,
      error: {
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Authorization header is required',
      },
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (
    error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' ||
    error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID'
  ) {
    return reply.status(401).send({
      success: false,
      error: {
        code: ErrorCodes.TOKEN_EXPIRED,
        message: 'Invalid or expired token',
      },
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle rate limit errors
  if (error.statusCode === 429) {
    return reply.status(429).send({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as unknown as { code: string; meta?: { target?: string[] } };

    if (prismaError.code === 'P2002') {
      return reply.status(409).send({
        success: false,
        error: {
          code: ErrorCodes.ALREADY_EXISTS,
          message: 'Resource already exists',
          details: { field: prismaError.meta?.target },
        },
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (prismaError.code === 'P2025') {
      return reply.status(404).send({
        success: false,
        error: {
          code: ErrorCodes.NOT_FOUND,
          message: 'Resource not found',
        },
        meta: {
          requestId: request.id,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  // Default internal server error
  const statusCode = error.statusCode || 500;
  const message =
    statusCode === 500 ? 'Internal server error' : error.message || 'An error occurred';

  return reply.status(statusCode).send({
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message,
    },
    meta: {
      requestId: request.id,
      timestamp: new Date().toISOString(),
    },
  });
}
