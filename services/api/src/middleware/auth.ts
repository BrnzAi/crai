import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppError, ErrorCodes } from '@cryptoai/core';
import { prisma } from '@cryptoai/database';

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Extended FastifyRequest with user info
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = await request.jwtVerify<JwtPayload>();
    request.user = token;

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: token.sub },
      select: { id: true, status: true },
    });

    if (!user) {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        'User not found',
        401
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        'Account is not active',
        403
      );
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      ErrorCodes.UNAUTHORIZED,
      'Invalid or expired token',
      401
    );
  }
}

/**
 * Authorization middleware - checks user role
 */
export function authorize(...allowedRoles: string[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        'Authentication required',
        401
      );
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        'You do not have permission to perform this action',
        403
      );
    }
  };
}

/**
 * KYC verification middleware
 */
export async function requireKyc(request: FastifyRequest, _reply: FastifyReply) {
  if (!request.user) {
    throw new AppError(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      401
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: request.user.sub },
    include: {
      kycVerifications: {
        where: { status: 'APPROVED' },
        take: 1,
      },
    },
  });

  if (!user?.kycVerifications.length) {
    throw new AppError(
      ErrorCodes.KYC_REQUIRED,
      'KYC verification is required to perform this action',
      403
    );
  }
}

/**
 * Accreditation verification middleware
 */
export async function requireAccreditation(request: FastifyRequest, _reply: FastifyReply) {
  if (!request.user) {
    throw new AppError(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required',
      401
    );
  }

  const investorProfile = await prisma.investorProfile.findUnique({
    where: { userId: request.user.sub },
  });

  if (!investorProfile?.isAccredited) {
    throw new AppError(
      ErrorCodes.ACCREDITATION_REQUIRED,
      'Accredited investor status is required to perform this action',
      403
    );
  }

  // Check if accreditation has expired
  if (
    investorProfile.accreditationExpiresAt &&
    investorProfile.accreditationExpiresAt < new Date()
  ) {
    throw new AppError(
      ErrorCodes.ACCREDITATION_REQUIRED,
      'Accredited investor status has expired',
      403
    );
  }
}
