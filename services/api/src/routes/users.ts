import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@cryptoai/database';
import { AppError, ErrorCodes, updateUserProfileSchema } from '@cryptoai/core';
import { authenticate, authorize } from '../middleware/auth.js';

// Update profile request
interface UpdateProfileRequest {
  Body: z.infer<typeof updateUserProfileSchema>;
}

// User list query params
const userListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(['ADMIN', 'ISSUER', 'INVESTOR', 'PARTNER']).optional(),
  status: z.enum(['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']).optional(),
  search: z.string().optional(),
});

/**
 * User routes
 */
export async function userRoutes(app: FastifyInstance) {
  // Add authentication to all routes in this module
  app.addHook('preHandler', authenticate);

  /**
   * GET /users
   * List all users (admin only)
   */
  app.get(
    '/',
    { preHandler: [authorize('ADMIN')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = userListQuerySchema.parse(request.query);

      const where = {
        ...(query.role && { role: query.role }),
        ...(query.status && { status: query.status }),
        ...(query.search && {
          OR: [
            { email: { contains: query.search, mode: 'insensitive' as const } },
            {
              profile: {
                OR: [
                  { firstName: { contains: query.search, mode: 'insensitive' as const } },
                  { lastName: { contains: query.search, mode: 'insensitive' as const } },
                ],
              },
            },
          ],
        }),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            emailVerified: true,
            lastLoginAt: true,
            createdAt: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                countryOfResidence: true,
              },
            },
          },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: users,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
          hasNext: query.page * query.limit < total,
          hasPrevious: query.page > 1,
        },
      });
    }
  );

  /**
   * GET /users/:id
   * Get user by ID (admin only)
   */
  app.get(
    '/:id',
    { preHandler: [authorize('ADMIN')] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.params.id },
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
          lastLoginIp: true,
          createdAt: true,
          updatedAt: true,
          profile: true,
          issuerProfile: true,
          investorProfile: true,
          kycVerifications: {
            orderBy: { createdAt: 'desc' },
          },
          amlScreenings: {
            orderBy: { createdAt: 'desc' },
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

  /**
   * PATCH /users/profile
   * Update current user's profile
   */
  app.patch(
    '/profile',
    async (request: FastifyRequest<UpdateProfileRequest>, reply: FastifyReply) => {
      const body = updateUserProfileSchema.parse(request.body);

      const profile = await prisma.userProfile.update({
        where: { userId: request.user!.sub },
        data: body,
      });

      return reply.send({
        success: true,
        data: profile,
      });
    }
  );

  /**
   * PATCH /users/:id/status
   * Update user status (admin only)
   */
  app.patch(
    '/:id/status',
    { preHandler: [authorize('ADMIN')] },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { status: string };
      }>,
      reply: FastifyReply
    ) => {
      const { status } = z
        .object({
          status: z.enum(['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED']),
        })
        .parse(request.body);

      // Prevent self-deactivation
      if (request.params.id === request.user!.sub && status !== 'ACTIVE') {
        throw new AppError(
          ErrorCodes.FORBIDDEN,
          'You cannot change your own status',
          403
        );
      }

      const user = await prisma.user.update({
        where: { id: request.params.id },
        data: { status },
        select: {
          id: true,
          email: true,
          status: true,
          updatedAt: true,
        },
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          userId: request.params.id,
          performedBy: request.user!.sub,
          entityType: 'User',
          entityId: request.params.id,
          action: 'STATUS_CHANGE',
          changes: { status: { new: status } },
          ipAddress: request.ip,
        },
      });

      return reply.send({
        success: true,
        data: user,
      });
    }
  );

  /**
   * GET /users/wallets
   * Get current user's wallets
   */
  app.get('/wallets', async (request: FastifyRequest, reply: FastifyReply) => {
    const wallets = await prisma.wallet.findMany({
      where: { userId: request.user!.sub },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    return reply.send({
      success: true,
      data: wallets,
    });
  });

  /**
   * POST /users/wallets
   * Add a new wallet
   */
  app.post(
    '/wallets',
    async (
      request: FastifyRequest<{
        Body: {
          address: string;
          blockchain: string;
          type: string;
          label?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const body = z
        .object({
          address: z.string().min(1),
          blockchain: z.string().min(1),
          type: z.enum(['custodial', 'self_custody', 'multi_sig']),
          label: z.string().optional(),
        })
        .parse(request.body);

      // Check if wallet already exists
      const existing = await prisma.wallet.findFirst({
        where: {
          address: body.address.toLowerCase(),
          blockchain: body.blockchain,
        },
      });

      if (existing) {
        throw new AppError(
          ErrorCodes.ALREADY_EXISTS,
          'This wallet is already registered',
          409
        );
      }

      // Check if this is the first wallet
      const walletCount = await prisma.wallet.count({
        where: { userId: request.user!.sub },
      });

      const wallet = await prisma.wallet.create({
        data: {
          userId: request.user!.sub,
          address: body.address.toLowerCase(),
          blockchain: body.blockchain,
          type: body.type,
          label: body.label,
          isPrimary: walletCount === 0, // First wallet is primary
        },
      });

      return reply.status(201).send({
        success: true,
        data: wallet,
      });
    }
  );

  /**
   * DELETE /users/wallets/:id
   * Remove a wallet
   */
  app.delete(
    '/wallets/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const wallet = await prisma.wallet.findFirst({
        where: {
          id: request.params.id,
          userId: request.user!.sub,
        },
      });

      if (!wallet) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Wallet not found',
          404
        );
      }

      await prisma.wallet.delete({
        where: { id: request.params.id },
      });

      // If this was the primary wallet, make another one primary
      if (wallet.isPrimary) {
        const nextWallet = await prisma.wallet.findFirst({
          where: { userId: request.user!.sub },
        });

        if (nextWallet) {
          await prisma.wallet.update({
            where: { id: nextWallet.id },
            data: { isPrimary: true },
          });
        }
      }

      return reply.send({
        success: true,
        data: { message: 'Wallet removed successfully' },
      });
    }
  );
}
