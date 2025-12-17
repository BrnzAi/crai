import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@cryptoai/database';
import { AppError, ErrorCodes } from '@cryptoai/core';
import { authenticate, authorize } from '../middleware/auth.js';

/**
 * KYC routes
 */
export async function kycRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /kyc/status
   * Get current KYC status
   */
  app.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const [latestKyc, latestAml] = await Promise.all([
      prisma.kycVerification.findFirst({
        where: { userId: request.user!.sub },
        orderBy: { createdAt: 'desc' },
        include: {
          documents: {
            select: {
              id: true,
              type: true,
              status: true,
              submittedAt: true,
              verifiedAt: true,
            },
          },
        },
      }),
      prisma.amlScreening.findFirst({
        where: { userId: request.user!.sub },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return reply.send({
      success: true,
      data: {
        kyc: latestKyc,
        aml: latestAml,
        isVerified: latestKyc?.status === 'APPROVED',
        requiresAction: latestKyc?.status === 'ADDITIONAL_INFO_REQUIRED' ||
          latestKyc?.status === 'REJECTED',
      },
    });
  });

  /**
   * POST /kyc/start
   * Start KYC verification process
   */
  app.post('/start', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = z
      .object({
        level: z.enum(['basic', 'standard', 'enhanced']).default('standard'),
        provider: z.enum(['sumsub', 'onfido', 'uae_pass', 'manual']).default('sumsub'),
      })
      .parse(request.body);

    // Check if there's an existing verification in progress
    const existingKyc = await prisma.kycVerification.findFirst({
      where: {
        userId: request.user!.sub,
        status: { in: ['IN_PROGRESS', 'PENDING_REVIEW'] },
      },
    });

    if (existingKyc) {
      throw new AppError(
        ErrorCodes.CONFLICT,
        'KYC verification already in progress',
        409
      );
    }

    // Create new KYC verification
    const kyc = await prisma.kycVerification.create({
      data: {
        userId: request.user!.sub,
        level: body.level,
        status: 'IN_PROGRESS',
        provider: body.provider,
      },
    });

    // TODO: Initialize verification with provider (Sumsub, etc.)
    // For now, return the KYC record with a placeholder URL

    return reply.status(201).send({
      success: true,
      data: {
        kyc,
        verificationUrl: `https://kyc.cryptoai.ai/verify/${kyc.id}`, // Placeholder
        expiresIn: 3600, // 1 hour
      },
    });
  });

  /**
   * POST /kyc/:id/documents
   * Upload KYC document
   */
  app.post(
    '/:id/documents',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          type: string;
          fileName: string;
          fileUrl: string;
          fileSize: number;
          mimeType: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const kyc = await prisma.kycVerification.findFirst({
        where: {
          id: request.params.id,
          userId: request.user!.sub,
        },
      });

      if (!kyc) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'KYC verification not found',
          404
        );
      }

      const body = z
        .object({
          type: z.string(),
          fileName: z.string(),
          fileUrl: z.string().url(),
          fileSize: z.number().positive(),
          mimeType: z.string(),
        })
        .parse(request.body);

      const document = await prisma.kycDocument.create({
        data: {
          kycVerificationId: kyc.id,
          type: body.type,
          fileName: body.fileName,
          fileUrl: body.fileUrl,
          fileSize: body.fileSize,
          mimeType: body.mimeType,
          status: 'pending',
        },
      });

      return reply.status(201).send({
        success: true,
        data: document,
      });
    }
  );

  /**
   * POST /kyc/:id/submit
   * Submit KYC for review
   */
  app.post(
    '/:id/submit',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { personalInfo: Record<string, unknown> };
      }>,
      reply: FastifyReply
    ) => {
      const kyc = await prisma.kycVerification.findFirst({
        where: {
          id: request.params.id,
          userId: request.user!.sub,
        },
        include: {
          documents: true,
        },
      });

      if (!kyc) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'KYC verification not found',
          404
        );
      }

      if (kyc.status !== 'IN_PROGRESS') {
        throw new AppError(
          ErrorCodes.CONFLICT,
          'KYC verification cannot be submitted',
          409
        );
      }

      // Update KYC with personal info and change status
      const updated = await prisma.kycVerification.update({
        where: { id: request.params.id },
        data: {
          status: 'PENDING_REVIEW',
          personalInfo: request.body.personalInfo,
        },
      });

      // TODO: Submit to KYC provider for verification

      return reply.send({
        success: true,
        data: updated,
      });
    }
  );

  // Admin KYC review routes
  app.register(async (adminRoutes) => {
    adminRoutes.addHook('preHandler', authorize('ADMIN'));

    /**
     * GET /kyc/pending
     * Get pending KYC verifications (admin)
     */
    adminRoutes.get('/pending', async (request: FastifyRequest, reply: FastifyReply) => {
      const query = z
        .object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().max(100).default(20),
        })
        .parse(request.query);

      const where = { status: 'PENDING_REVIEW' as const };

      const [verifications, total] = await Promise.all([
        prisma.kycVerification.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            documents: true,
          },
          orderBy: { createdAt: 'asc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        prisma.kycVerification.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: verifications,
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
     * POST /kyc/:id/review
     * Review KYC verification (admin)
     */
    adminRoutes.post(
      '/:id/review',
      async (
        request: FastifyRequest<{
          Params: { id: string };
          Body: {
            decision: 'approve' | 'reject' | 'request_info';
            notes?: string;
            riskScore?: number;
            riskLevel?: string;
          };
        }>,
        reply: FastifyReply
      ) => {
        const body = z
          .object({
            decision: z.enum(['approve', 'reject', 'request_info']),
            notes: z.string().optional(),
            riskScore: z.number().min(0).max(100).optional(),
            riskLevel: z.enum(['low', 'medium', 'high', 'very_high']).optional(),
          })
          .parse(request.body);

        const kyc = await prisma.kycVerification.findUnique({
          where: { id: request.params.id },
        });

        if (!kyc) {
          throw new AppError(
            ErrorCodes.NOT_FOUND,
            'KYC verification not found',
            404
          );
        }

        const statusMap = {
          approve: 'APPROVED' as const,
          reject: 'REJECTED' as const,
          request_info: 'ADDITIONAL_INFO_REQUIRED' as const,
        };

        const updated = await prisma.kycVerification.update({
          where: { id: request.params.id },
          data: {
            status: statusMap[body.decision],
            reviewedBy: request.user!.sub,
            reviewedAt: new Date(),
            reviewNotes: body.notes,
            riskScore: body.riskScore,
            riskLevel: body.riskLevel,
            expiresAt:
              body.decision === 'approve'
                ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
                : undefined,
          },
        });

        // If approved, update user KYC status
        if (body.decision === 'approve') {
          await prisma.user.update({
            where: { id: kyc.userId },
            data: { status: 'ACTIVE' },
          });
        }

        // Log the action
        await prisma.auditLog.create({
          data: {
            userId: kyc.userId,
            performedBy: request.user!.sub,
            entityType: 'KycVerification',
            entityId: kyc.id,
            action: `KYC_${body.decision.toUpperCase()}`,
            changes: { status: { new: statusMap[body.decision] } },
            ipAddress: request.ip,
          },
        });

        return reply.send({
          success: true,
          data: updated,
        });
      }
    );
  });

  /**
   * GET /kyc/accreditation
   * Get accreditation status
   */
  app.get('/accreditation', async (request: FastifyRequest, reply: FastifyReply) => {
    const investorProfile = await prisma.investorProfile.findUnique({
      where: { userId: request.user!.sub },
      include: {
        accreditations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!investorProfile) {
      return reply.send({
        success: true,
        data: {
          isAccredited: false,
          classification: 'RETAIL',
        },
      });
    }

    return reply.send({
      success: true,
      data: {
        isAccredited: investorProfile.isAccredited,
        classification: investorProfile.classification,
        method: investorProfile.accreditationMethod,
        verifiedAt: investorProfile.accreditationVerifiedAt,
        expiresAt: investorProfile.accreditationExpiresAt,
        latestVerification: investorProfile.accreditations[0] || null,
      },
    });
  });

  /**
   * POST /kyc/accreditation/verify
   * Start accreditation verification
   */
  app.post(
    '/accreditation/verify',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = z
        .object({
          method: z.enum(['income', 'net_worth', 'professional', 'entity', 'third_party']),
        })
        .parse(request.body);

      const investorProfile = await prisma.investorProfile.findUnique({
        where: { userId: request.user!.sub },
      });

      if (!investorProfile) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Investor profile not found',
          404
        );
      }

      // Create accreditation verification record
      const verification = await prisma.accreditationVerification.create({
        data: {
          investorProfileId: investorProfile.id,
          method: body.method,
          status: 'pending',
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        },
      });

      // TODO: Integrate with third-party verification provider

      return reply.status(201).send({
        success: true,
        data: {
          verification,
          nextSteps: getAccreditationSteps(body.method),
        },
      });
    }
  );
}

/**
 * Get next steps for accreditation based on method
 */
function getAccreditationSteps(method: string): string[] {
  switch (method) {
    case 'income':
      return [
        'Provide tax returns for the past 2 years',
        'Show annual income exceeding $200,000 (or $300,000 joint)',
        'Attest to expectation of meeting this threshold in the current year',
      ];
    case 'net_worth':
      return [
        'Provide documentation of assets (bank statements, brokerage accounts)',
        'Provide documentation of liabilities (loan statements, credit reports)',
        'Show net worth exceeding $1,000,000 (excluding primary residence)',
      ];
    case 'professional':
      return [
        'Provide proof of professional certification (Series 7, Series 65, Series 82)',
        'Certification must be current and in good standing',
      ];
    case 'entity':
      return [
        'Provide entity formation documents',
        'Show total assets exceeding $5,000,000',
        'Confirm entity was not formed for the purpose of this investment',
      ];
    case 'third_party':
      return [
        'Select a third-party verification provider',
        'Complete verification through provider portal',
        'Provider will submit verification to platform',
      ];
    default:
      return [];
  }
}
