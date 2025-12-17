import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@cryptoai/database';
import { AppError, ErrorCodes } from '@cryptoai/core';
import { authenticate, authorize } from '../middleware/auth.js';

// Asset list query params
const assetListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.enum(['REAL_ESTATE', 'EQUITY']).optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'TOKENIZING', 'ACTIVE', 'PAUSED', 'CLOSED', 'DELISTED']).optional(),
  jurisdiction: z.string().optional(),
  minValue: z.coerce.number().optional(),
  maxValue: z.coerce.number().optional(),
  search: z.string().optional(),
});

/**
 * Asset routes
 */
export async function assetRoutes(app: FastifyInstance) {
  /**
   * GET /assets
   * List all published assets (public endpoint)
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = assetListQuerySchema.parse(request.query);

    const where = {
      status: 'ACTIVE' as const, // Only show active assets publicly
      ...(query.category && { category: query.category }),
      ...(query.jurisdiction && { jurisdiction: query.jurisdiction }),
      ...(query.minValue && { totalValue: { gte: query.minValue } }),
      ...(query.maxValue && { totalValue: { lte: query.maxValue } }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { description: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        select: {
          id: true,
          category: true,
          status: true,
          name: true,
          shortDescription: true,
          jurisdiction: true,
          totalValue: true,
          currency: true,
          publishedAt: true,
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          token: {
            select: {
              id: true,
              symbol: true,
              currentPrice: true,
            },
          },
          offering: {
            select: {
              id: true,
              status: true,
              tokenPrice: true,
              minimumInvestment: true,
              tokensAvailable: true,
              endDate: true,
            },
          },
          realEstateDetails: {
            select: {
              propertyType: true,
              emirate: true,
              area: true,
              projectedYield: true,
            },
          },
          equityDetails: {
            select: {
              stage: true,
              industry: true,
            },
          },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.asset.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: assets,
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
   * GET /assets/:id
   * Get asset details
   */
  app.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const asset = await prisma.asset.findUnique({
        where: { id: request.params.id },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          documents: {
            where: { isVerified: true },
            select: {
              id: true,
              type: true,
              fileName: true,
              createdAt: true,
            },
          },
          issuer: {
            select: {
              id: true,
              companyName: true,
              description: true,
              logo: true,
              isVerified: true,
            },
          },
          token: {
            include: {
              deployments: {
                where: { isActive: true },
              },
            },
          },
          offering: true,
          realEstateDetails: {
            include: {
              tenants: {
                where: { isActive: true },
                select: {
                  id: true,
                  tenantName: true,
                  leaseEnd: true,
                  leaseType: true,
                },
              },
            },
          },
          equityDetails: {
            include: {
              founders: true,
              board: true,
            },
          },
          spv: {
            select: {
              id: true,
              type: true,
              legalName: true,
              jurisdiction: true,
              status: true,
            },
          },
        },
      });

      if (!asset) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Asset not found',
          404
        );
      }

      // If asset is not active, only allow issuer or admin to view
      if (asset.status !== 'ACTIVE') {
        // TODO: Check authentication
      }

      return reply.send({
        success: true,
        data: asset,
      });
    }
  );

  /**
   * POST /assets
   * Create a new asset (issuer only)
   */
  app.post(
    '/',
    { preHandler: [authenticate, authorize('ISSUER')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Get issuer profile
      const issuerProfile = await prisma.issuerProfile.findUnique({
        where: { userId: request.user!.sub },
      });

      if (!issuerProfile) {
        throw new AppError(
          ErrorCodes.FORBIDDEN,
          'Issuer profile not found',
          403
        );
      }

      if (!issuerProfile.isVerified) {
        throw new AppError(
          ErrorCodes.FORBIDDEN,
          'Issuer profile must be verified before creating assets',
          403
        );
      }

      const body = z
        .object({
          category: z.enum(['REAL_ESTATE', 'EQUITY']),
          name: z.string().min(1).max(200),
          description: z.string().min(10),
          shortDescription: z.string().max(500).optional(),
          jurisdiction: z.enum(['VARA', 'DFSA', 'ADGM']),
          totalValue: z.number().positive(),
          currency: z.string().default('AED'),
        })
        .parse(request.body);

      const asset = await prisma.asset.create({
        data: {
          issuerId: issuerProfile.id,
          category: body.category,
          status: 'DRAFT',
          name: body.name,
          description: body.description,
          shortDescription: body.shortDescription,
          jurisdiction: body.jurisdiction,
          totalValue: body.totalValue,
          currency: body.currency,
        },
      });

      return reply.status(201).send({
        success: true,
        data: asset,
      });
    }
  );

  /**
   * PATCH /assets/:id
   * Update asset details (issuer only)
   */
  app.patch(
    '/:id',
    { preHandler: [authenticate, authorize('ISSUER')] },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: Record<string, unknown>;
      }>,
      reply: FastifyReply
    ) => {
      // Verify ownership
      const asset = await prisma.asset.findFirst({
        where: {
          id: request.params.id,
          issuer: { userId: request.user!.sub },
        },
      });

      if (!asset) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Asset not found or you do not have permission to edit it',
          404
        );
      }

      // Only allow editing draft assets
      if (asset.status !== 'DRAFT') {
        throw new AppError(
          ErrorCodes.FORBIDDEN,
          'Only draft assets can be edited',
          403
        );
      }

      const body = z
        .object({
          name: z.string().min(1).max(200).optional(),
          description: z.string().min(10).optional(),
          shortDescription: z.string().max(500).optional(),
          jurisdiction: z.enum(['VARA', 'DFSA', 'ADGM']).optional(),
          totalValue: z.number().positive().optional(),
          currency: z.string().optional(),
        })
        .parse(request.body);

      const updated = await prisma.asset.update({
        where: { id: request.params.id },
        data: body,
      });

      return reply.send({
        success: true,
        data: updated,
      });
    }
  );

  /**
   * POST /assets/:id/submit
   * Submit asset for review
   */
  app.post(
    '/:id/submit',
    { preHandler: [authenticate, authorize('ISSUER')] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      // Verify ownership
      const asset = await prisma.asset.findFirst({
        where: {
          id: request.params.id,
          issuer: { userId: request.user!.sub },
        },
        include: {
          documents: true,
          realEstateDetails: true,
          equityDetails: true,
        },
      });

      if (!asset) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Asset not found',
          404
        );
      }

      if (asset.status !== 'DRAFT') {
        throw new AppError(
          ErrorCodes.CONFLICT,
          'Asset has already been submitted',
          409
        );
      }

      // Validate completeness
      const requiredDocs = asset.documents.filter((d) => d.isRequired);
      const missingDocs = requiredDocs.filter((d) => !d.fileUrl);

      if (missingDocs.length > 0) {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          'Required documents are missing',
          400,
          { missingDocuments: missingDocs.map((d) => d.type) }
        );
      }

      // Update status
      const updated = await prisma.asset.update({
        where: { id: request.params.id },
        data: { status: 'PENDING_REVIEW' },
      });

      // TODO: Notify admin team

      return reply.send({
        success: true,
        data: {
          ...updated,
          message: 'Asset submitted for review',
        },
      });
    }
  );

  /**
   * POST /assets/:id/approve
   * Approve asset (admin only)
   */
  app.post(
    '/:id/approve',
    { preHandler: [authenticate, authorize('ADMIN')] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const asset = await prisma.asset.findUnique({
        where: { id: request.params.id },
      });

      if (!asset) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Asset not found',
          404
        );
      }

      if (asset.status !== 'PENDING_REVIEW' && asset.status !== 'UNDER_REVIEW') {
        throw new AppError(
          ErrorCodes.CONFLICT,
          'Asset is not pending review',
          409
        );
      }

      const updated = await prisma.asset.update({
        where: { id: request.params.id },
        data: { status: 'APPROVED' },
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          performedBy: request.user!.sub,
          entityType: 'Asset',
          entityId: request.params.id,
          action: 'APPROVE',
          ipAddress: request.ip,
        },
      });

      return reply.send({
        success: true,
        data: updated,
      });
    }
  );

  /**
   * GET /assets/my-assets
   * Get issuer's own assets
   */
  app.get(
    '/my-assets',
    { preHandler: [authenticate, authorize('ISSUER')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = assetListQuerySchema.parse(request.query);

      const issuerProfile = await prisma.issuerProfile.findUnique({
        where: { userId: request.user!.sub },
      });

      if (!issuerProfile) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Issuer profile not found',
          404
        );
      }

      const where = {
        issuerId: issuerProfile.id,
        ...(query.category && { category: query.category }),
        ...(query.status && { status: query.status }),
      };

      const [assets, total] = await Promise.all([
        prisma.asset.findMany({
          where,
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            token: {
              select: {
                id: true,
                symbol: true,
                status: true,
              },
            },
            offering: {
              select: {
                id: true,
                status: true,
                amountRaised: true,
                targetRaise: true,
              },
            },
          },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.asset.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: assets,
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
