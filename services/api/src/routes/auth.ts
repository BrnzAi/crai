import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { hash, compare } from 'bcrypt';
import { z } from 'zod';
import { prisma } from '@cryptoai/database';
import { AppError, ErrorCodes, createUserSchema } from '@cryptoai/core';
import { config } from '../config/index.js';
import type { JwtPayload } from '../middleware/auth.js';

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Refresh token schema
const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

/**
 * Authentication routes
 */
export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /auth/register
   * Register a new user
   */
  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createUserSchema.parse(request.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      throw new AppError(
        ErrorCodes.ALREADY_EXISTS,
        'A user with this email already exists',
        409
      );
    }

    // Hash password
    const passwordHash = await hash(body.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        role: body.role.toUpperCase() as 'ISSUER' | 'INVESTOR',
        status: 'PENDING_VERIFICATION',
        profile: {
          create: {
            firstName: '',
            lastName: '',
            countryOfResidence: '',
            language: 'en',
          },
        },
        ...(body.role === 'investor' && {
          investorProfile: {
            create: {
              taxResidency: '',
            },
          },
        }),
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // TODO: Send verification email

    return reply.status(201).send({
      success: true,
      data: {
        user,
        message: 'Registration successful. Please verify your email.',
      },
    });
  });

  /**
   * POST /auth/login
   * Login and get access token
   */
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.parse(request.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        'Invalid email or password',
        401
      );
    }

    // Check password
    const validPassword = await compare(body.password, user.passwordHash);

    if (!validPassword) {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        'Invalid email or password',
        401
      );
    }

    // Check if account is active
    if (user.status === 'SUSPENDED') {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        'Your account has been suspended',
        403
      );
    }

    if (user.status === 'DEACTIVATED') {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        'Your account has been deactivated',
        403
      );
    }

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = app.jwt.sign(payload);
    const refreshToken = app.jwt.sign(payload, {
      expiresIn: config.refreshTokenExpiresIn,
    });

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: request.ip,
      },
    });

    return reply.send({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: 7 * 24 * 60 * 60, // seconds
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
        },
      },
    });
  });

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  app.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = refreshSchema.parse(request.body);

    // Verify refresh token
    let payload: JwtPayload;
    try {
      payload = app.jwt.verify<JwtPayload>(body.refreshToken);
    } catch {
      throw new AppError(
        ErrorCodes.TOKEN_EXPIRED,
        'Invalid or expired refresh token',
        401
      );
    }

    // Check if session exists
    const session = await prisma.session.findFirst({
      where: {
        refreshToken: body.refreshToken,
        userId: payload.sub,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new AppError(
        ErrorCodes.TOKEN_EXPIRED,
        'Session not found or expired',
        401
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        'User account is not active',
        403
      );
    }

    // Generate new tokens
    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = app.jwt.sign(newPayload);
    const refreshToken = app.jwt.sign(newPayload, {
      expiresIn: config.refreshTokenExpiresIn,
    });

    // Update session
    await prisma.session.update({
      where: { id: session.id },
      data: {
        token: accessToken,
        refreshToken,
        lastActiveAt: new Date(),
      },
    });

    return reply.send({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: 7 * 24 * 60 * 60,
      },
    });
  });

  /**
   * POST /auth/logout
   * Logout and invalidate session
   */
  app.post(
    '/logout',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');

      if (token) {
        await prisma.session.deleteMany({
          where: { token },
        });
      }

      return reply.send({
        success: true,
        data: { message: 'Logged out successfully' },
      });
    }
  );

  /**
   * GET /auth/me
   * Get current user info
   */
  app.get(
    '/me',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user!.sub },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          emailVerified: true,
          phoneNumber: true,
          phoneVerified: true,
          twoFactorEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          profile: true,
          issuerProfile: {
            select: {
              id: true,
              companyName: true,
              isVerified: true,
              kybStatus: true,
            },
          },
          investorProfile: {
            select: {
              id: true,
              classification: true,
              isAccredited: true,
              accreditationExpiresAt: true,
            },
          },
          kycVerifications: {
            where: { status: 'APPROVED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              level: true,
              status: true,
              expiresAt: true,
            },
          },
        },
      });

      if (!user) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'User not found',
          404
        );
      }

      return reply.send({
        success: true,
        data: user,
      });
    }
  );
}

// Register authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
