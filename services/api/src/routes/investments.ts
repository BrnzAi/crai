import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@cryptoai/database';
import { AppError, ErrorCodes } from '@cryptoai/core';
import { authenticate, requireKyc } from '../middleware/auth.js';

/**
 * Investment routes
 */
export async function investmentRoutes(app: FastifyInstance) {
  // All investment routes require authentication
  app.addHook('preHandler', authenticate);

  /**
   * GET /investments
   * List user's investments
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        status: z.string().optional(),
      })
      .parse(request.query);

    const where = {
      investorId: request.user!.sub,
      ...(query.status && { status: query.status }),
    };

    const [investments, total] = await Promise.all([
      prisma.investment.findMany({
        where,
        include: {
          offering: {
            include: {
              asset: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  images: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.investment.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: investments,
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
   * GET /investments/:id
   * Get investment details
   */
  app.get(
    '/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const investment = await prisma.investment.findFirst({
        where: {
          id: request.params.id,
          investorId: request.user!.sub,
        },
        include: {
          offering: {
            include: {
              asset: {
                include: {
                  issuer: {
                    select: {
                      id: true,
                      companyName: true,
                    },
                  },
                  token: {
                    select: {
                      id: true,
                      symbol: true,
                      currentPrice: true,
                    },
                  },
                },
              },
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
          },
          documents: true,
          complianceChecks: true,
        },
      });

      if (!investment) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Investment not found',
          404
        );
      }

      return reply.send({
        success: true,
        data: investment,
      });
    }
  );

  /**
   * POST /investments
   * Create a new investment
   */
  app.post(
    '/',
    { preHandler: [requireKyc] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = z
        .object({
          offeringId: z.string(),
          amount: z.number().positive(),
          currency: z.string().default('USD'),
          paymentMethod: z.enum([
            'credit_card', 'debit_card', 'bank_transfer',
            'ach', 'wire', 'usdc', 'usdt', 'eth', 'crypto_other',
          ]),
          deliveryWallet: z.string().optional(),
          acceptTerms: z.literal(true),
        })
        .parse(request.body);

      // Get offering
      const offering = await prisma.offering.findUnique({
        where: { id: body.offeringId },
        include: {
          asset: {
            include: {
              token: true,
            },
          },
        },
      });

      if (!offering) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Offering not found',
          404
        );
      }

      // Check offering is open
      if (offering.status !== 'OPEN') {
        throw new AppError(
          ErrorCodes.OFFERING_CLOSED,
          'This offering is not currently open for investment',
          400
        );
      }

      // Check dates
      const now = new Date();
      if (now < offering.startDate || now > offering.endDate) {
        throw new AppError(
          ErrorCodes.OFFERING_CLOSED,
          'This offering is outside its investment period',
          400
        );
      }

      // Check minimum investment
      if (body.amount < Number(offering.minimumInvestment)) {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          `Minimum investment is ${offering.minimumInvestment} ${body.currency}`,
          400
        );
      }

      // Check maximum investment
      if (offering.maximumInvestment && body.amount > Number(offering.maximumInvestment)) {
        throw new AppError(
          ErrorCodes.INVESTMENT_LIMIT_EXCEEDED,
          `Maximum investment is ${offering.maximumInvestment} ${body.currency}`,
          400
        );
      }

      // Check investor eligibility
      const investorProfile = await prisma.investorProfile.findUnique({
        where: { userId: request.user!.sub },
      });

      if (offering.requireAccreditation && !investorProfile?.isAccredited) {
        throw new AppError(
          ErrorCodes.ACCREDITATION_REQUIRED,
          'This offering requires accredited investor status',
          403
        );
      }

      // Calculate token quantity
      const tokenPrice = Number(offering.tokenPrice);
      const tokenQuantity = Math.floor(body.amount / tokenPrice);

      if (tokenQuantity === 0) {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          'Investment amount is too small for minimum token purchase',
          400
        );
      }

      // Check available tokens
      const availableTokens = BigInt(offering.tokensAvailable);
      if (BigInt(tokenQuantity) > availableTokens) {
        throw new AppError(
          ErrorCodes.INSUFFICIENT_BALANCE,
          'Not enough tokens available',
          400
        );
      }

      // Get or set delivery wallet
      let deliveryWallet = body.deliveryWallet;
      if (!deliveryWallet) {
        const primaryWallet = await prisma.wallet.findFirst({
          where: {
            userId: request.user!.sub,
            isPrimary: true,
          },
        });
        deliveryWallet = primaryWallet?.address;
      }

      // Create investment
      const investment = await prisma.investment.create({
        data: {
          investorId: request.user!.sub,
          offeringId: body.offeringId,
          status: 'INITIATED',
          amount: body.amount,
          currency: body.currency,
          tokenQuantity: tokenQuantity.toString(),
          pricePerToken: tokenPrice,
          paymentMethod: body.paymentMethod,
          deliveryWallet,
        },
      });

      // TODO: Create payment intent based on payment method

      return reply.status(201).send({
        success: true,
        data: {
          investment,
          tokenQuantity,
          totalAmount: body.amount,
          nextStep: 'complete_payment',
        },
      });
    }
  );

  /**
   * POST /investments/:id/cancel
   * Cancel an investment (if allowed)
   */
  app.post(
    '/:id/cancel',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const investment = await prisma.investment.findFirst({
        where: {
          id: request.params.id,
          investorId: request.user!.sub,
        },
      });

      if (!investment) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Investment not found',
          404
        );
      }

      // Only allow cancellation in certain states
      const cancellableStatuses = ['INITIATED', 'PENDING_PAYMENT'];
      if (!cancellableStatuses.includes(investment.status)) {
        throw new AppError(
          ErrorCodes.FORBIDDEN,
          'This investment cannot be cancelled',
          403
        );
      }

      const updated = await prisma.investment.update({
        where: { id: request.params.id },
        data: {
          status: 'CANCELLED',
          notes: 'Cancelled by investor',
        },
      });

      return reply.send({
        success: true,
        data: updated,
      });
    }
  );

  /**
   * GET /investments/portfolio
   * Get portfolio summary
   */
  app.get('/portfolio', async (request: FastifyRequest, reply: FastifyReply) => {
    // Get all completed investments
    const investments = await prisma.investment.findMany({
      where: {
        investorId: request.user!.sub,
        status: 'COMPLETED',
      },
      include: {
        offering: {
          include: {
            asset: {
              include: {
                token: true,
              },
            },
          },
        },
      },
    });

    // Get token holdings
    const investorProfile = await prisma.investorProfile.findUnique({
      where: { userId: request.user!.sub },
    });

    const holdings = investorProfile
      ? await prisma.tokenHolder.findMany({
          where: { investorProfileId: investorProfile.id },
          include: {
            token: {
              include: {
                asset: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
                market: {
                  select: {
                    lastPrice: true,
                    change24h: true,
                  },
                },
              },
            },
          },
        })
      : [];

    // Calculate totals
    let totalInvested = 0;
    let totalCurrentValue = 0;

    for (const holding of holdings) {
      const balance = parseFloat(holding.balance);
      const currentPrice = holding.token.market?.lastPrice
        ? Number(holding.token.market.lastPrice)
        : Number(holding.token.currentPrice);

      totalCurrentValue += balance * currentPrice;
    }

    for (const inv of investments) {
      totalInvested += Number(inv.amount);
    }

    // Get recent distributions
    const distributions = investorProfile
      ? await prisma.distributionPayment.findMany({
          where: {
            investorProfileId: investorProfile.id,
            status: 'completed',
          },
          orderBy: { completedAt: 'desc' },
          take: 10,
          include: {
            distribution: {
              select: {
                type: true,
                periodStart: true,
                periodEnd: true,
              },
            },
          },
        })
      : [];

    const totalDistributions = distributions.reduce(
      (sum, d) => sum + Number(d.netAmount),
      0
    );

    return reply.send({
      success: true,
      data: {
        summary: {
          totalInvested,
          totalCurrentValue,
          totalDistributions,
          totalReturn: totalCurrentValue - totalInvested + totalDistributions,
          returnPercentage:
            totalInvested > 0
              ? ((totalCurrentValue - totalInvested + totalDistributions) / totalInvested) * 100
              : 0,
        },
        holdings: holdings.map((h) => ({
          tokenId: h.tokenId,
          symbol: h.token.asset.name,
          balance: h.balance,
          currentPrice: h.token.market?.lastPrice || h.token.currentPrice,
          value:
            parseFloat(h.balance) *
            Number(h.token.market?.lastPrice || h.token.currentPrice),
          change24h: h.token.market?.change24h || 0,
        })),
        recentDistributions: distributions,
      },
    });
  });

  /**
   * GET /investments/distributions
   * Get distribution history
   */
  app.get('/distributions', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
      })
      .parse(request.query);

    const investorProfile = await prisma.investorProfile.findUnique({
      where: { userId: request.user!.sub },
    });

    if (!investorProfile) {
      return reply.send({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: query.limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      });
    }

    const where = { investorProfileId: investorProfile.id };

    const [distributions, total] = await Promise.all([
      prisma.distributionPayment.findMany({
        where,
        include: {
          distribution: {
            include: {
              asset: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { scheduledAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.distributionPayment.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: distributions,
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
}
