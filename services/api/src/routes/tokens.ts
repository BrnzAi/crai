import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@cryptoai/database';
import { AppError, ErrorCodes } from '@cryptoai/core';
import { authenticate, authorize } from '../middleware/auth.js';

/**
 * Token routes
 */
export async function tokenRoutes(app: FastifyInstance) {
  /**
   * GET /tokens
   * List all active tokens
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        status: z.enum(['DRAFT', 'DEPLOYING', 'DEPLOYED', 'ACTIVE', 'PAUSED', 'FROZEN']).optional(),
      })
      .parse(request.query);

    const where = {
      status: query.status || 'ACTIVE',
    };

    const [tokens, total] = await Promise.all([
      prisma.token.findMany({
        where,
        select: {
          id: true,
          name: true,
          symbol: true,
          decimals: true,
          standard: true,
          status: true,
          totalSupply: true,
          circulatingSupply: true,
          currentPrice: true,
          asset: {
            select: {
              id: true,
              name: true,
              category: true,
              jurisdiction: true,
            },
          },
          deployments: {
            where: { isActive: true },
            select: {
              blockchain: true,
              contractAddress: true,
              isVerified: true,
            },
          },
          market: {
            select: {
              symbol: true,
              lastPrice: true,
              change24h: true,
              volume24h: true,
            },
          },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.token.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: tokens,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasNext: query.page * query.limit < total,
        hasPrevious: query.page > 1,
      },
    });
  });

  /**
   * GET /tokens/:id
   * Get token details
   */
  app.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const token = await prisma.token.findUnique({
        where: { id: request.params.id },
        include: {
          asset: {
            include: {
              issuer: {
                select: {
                  id: true,
                  companyName: true,
                  isVerified: true,
                },
              },
              images: { where: { isPrimary: true }, take: 1 },
            },
          },
          deployments: true,
          complianceModules: true,
          transferRestrictions: { where: { isActive: true } },
          market: true,
        },
      });

      if (!token) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Token not found',
          404
        );
      }

      return reply.send({
        success: true,
        data: token,
      });
    }
  );

  /**
   * GET /tokens/:id/holders
   * Get token holders
   */
  app.get(
    '/:id/holders',
    { preHandler: [authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const query = z
        .object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().max(100).default(20),
        })
        .parse(request.query);

      const [holders, total] = await Promise.all([
        prisma.tokenHolder.findMany({
          where: { tokenId: request.params.id },
          select: {
            id: true,
            walletAddress: true,
            balance: true,
            lockedBalance: true,
            availableBalance: true,
            isWhitelisted: true,
            firstPurchaseAt: true,
            lastTransactionAt: true,
          },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          orderBy: { balance: 'desc' },
        }),
        prisma.tokenHolder.count({ where: { tokenId: request.params.id } }),
      ]);

      return reply.send({
        success: true,
        data: holders,
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
   * GET /tokens/:id/transactions
   * Get token transactions
   */
  app.get(
    '/:id/transactions',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const query = z
        .object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().max(100).default(20),
          type: z.string().optional(),
        })
        .parse(request.query);

      const where = {
        tokenId: request.params.id,
        ...(query.type && { type: query.type }),
      };

      const [transactions, total] = await Promise.all([
        prisma.tokenTransaction.findMany({
          where,
          orderBy: { executedAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        prisma.tokenTransaction.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: transactions,
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
   * POST /tokens
   * Create token for an asset (issuer only)
   */
  app.post(
    '/',
    { preHandler: [authenticate, authorize('ISSUER')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = z
        .object({
          assetId: z.string(),
          name: z.string().min(1).max(100),
          symbol: z.string().min(2).max(10).regex(/^[A-Z0-9]+$/),
          decimals: z.number().int().min(0).max(18).default(18),
          totalSupply: z.string().regex(/^\d+$/),
          initialPrice: z.number().positive(),
          features: z.object({
            mintable: z.boolean().default(false),
            burnable: z.boolean().default(false),
            pausable: z.boolean().default(true),
            freezable: z.boolean().default(true),
            votingEnabled: z.boolean().default(false),
            dividendsEnabled: z.boolean().default(true),
          }).optional(),
        })
        .parse(request.body);

      // Verify asset ownership and status
      const asset = await prisma.asset.findFirst({
        where: {
          id: body.assetId,
          issuer: { userId: request.user!.sub },
        },
      });

      if (!asset) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Asset not found or you do not have permission',
          404
        );
      }

      if (asset.status !== 'APPROVED') {
        throw new AppError(
          ErrorCodes.FORBIDDEN,
          'Asset must be approved before tokenization',
          403
        );
      }

      // Check if token already exists
      const existingToken = await prisma.token.findUnique({
        where: { assetId: body.assetId },
      });

      if (existingToken) {
        throw new AppError(
          ErrorCodes.ALREADY_EXISTS,
          'Token already exists for this asset',
          409
        );
      }

      // Create token
      const token = await prisma.token.create({
        data: {
          assetId: body.assetId,
          name: body.name,
          symbol: body.symbol,
          decimals: body.decimals,
          totalSupply: body.totalSupply,
          circulatingSupply: '0',
          initialPrice: body.initialPrice,
          currentPrice: body.initialPrice,
          features: body.features,
          status: 'DRAFT',
        },
      });

      // Update asset status
      await prisma.asset.update({
        where: { id: body.assetId },
        data: { status: 'TOKENIZING' },
      });

      return reply.status(201).send({
        success: true,
        data: token,
      });
    }
  );

  /**
   * POST /tokens/:id/deploy
   * Deploy token to blockchain (issuer only)
   */
  app.post(
    '/:id/deploy',
    { preHandler: [authenticate, authorize('ISSUER', 'ADMIN')] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const body = z
        .object({
          blockchain: z.enum(['ethereum', 'polygon', 'arbitrum']),
          chainId: z.number(),
        })
        .parse(request.body);

      const token = await prisma.token.findUnique({
        where: { id: request.params.id },
        include: {
          asset: {
            include: {
              issuer: true,
            },
          },
          deployments: true,
        },
      });

      if (!token) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Token not found',
          404
        );
      }

      // Check if already deployed on this chain
      const existingDeployment = token.deployments.find(
        (d) => d.chainId === body.chainId
      );

      if (existingDeployment) {
        throw new AppError(
          ErrorCodes.ALREADY_EXISTS,
          'Token already deployed on this blockchain',
          409
        );
      }

      // Update token status
      await prisma.token.update({
        where: { id: request.params.id },
        data: { status: 'DEPLOYING' },
      });

      // TODO: Actual blockchain deployment via Token Factory service
      // For now, create a placeholder deployment record

      const deployment = await prisma.tokenDeployment.create({
        data: {
          tokenId: request.params.id,
          blockchain: body.blockchain,
          chainId: body.chainId,
          contractAddress: '0x' + '0'.repeat(40), // Placeholder
          deploymentTxHash: '0x' + '0'.repeat(64), // Placeholder
          deployedAt: new Date(),
          deployedBy: request.user!.sub,
          isActive: true,
          isPrimary: token.deployments.length === 0,
        },
      });

      return reply.status(201).send({
        success: true,
        data: {
          deployment,
          message: 'Token deployment initiated',
        },
      });
    }
  );

  /**
   * GET /tokens/:id/corporate-actions
   * Get corporate actions for a token
   */
  app.get(
    '/:id/corporate-actions',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const query = z
        .object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().max(100).default(20),
          status: z.string().optional(),
        })
        .parse(request.query);

      const where = {
        tokenId: request.params.id,
        ...(query.status && { status: query.status }),
      };

      const [actions, total] = await Promise.all([
        prisma.corporateAction.findMany({
          where,
          orderBy: { announcementDate: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        prisma.corporateAction.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: actions,
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
}
