import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@cryptoai/database';
import { AppError, ErrorCodes } from '@cryptoai/core';
import { authenticate, requireKyc } from '../middleware/auth.js';

/**
 * Trading routes
 */
export async function tradingRoutes(app: FastifyInstance) {
  /**
   * GET /trading/markets
   * List all active markets
   */
  app.get('/markets', async (request: FastifyRequest, reply: FastifyReply) => {
    const markets = await prisma.market.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        symbol: true,
        baseToken: true,
        quoteToken: true,
        status: true,
        minOrderSize: true,
        maxOrderSize: true,
        makerFee: true,
        takerFee: true,
        lastPrice: true,
        change24h: true,
        high24h: true,
        low24h: true,
        volume24h: true,
        volumeUsd24h: true,
        trades24h: true,
        statsUpdatedAt: true,
        token: {
          select: {
            id: true,
            name: true,
            symbol: true,
            asset: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: { volumeUsd24h: 'desc' },
    });

    return reply.send({
      success: true,
      data: markets,
    });
  });

  /**
   * GET /trading/markets/:symbol
   * Get market details
   */
  app.get(
    '/markets/:symbol',
    async (
      request: FastifyRequest<{ Params: { symbol: string } }>,
      reply: FastifyReply
    ) => {
      const market = await prisma.market.findUnique({
        where: { symbol: request.params.symbol },
        include: {
          token: {
            include: {
              asset: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                  jurisdiction: true,
                },
              },
            },
          },
        },
      });

      if (!market) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Market not found',
          404
        );
      }

      return reply.send({
        success: true,
        data: market,
      });
    }
  );

  /**
   * GET /trading/markets/:symbol/orderbook
   * Get order book for a market
   */
  app.get(
    '/markets/:symbol/orderbook',
    async (
      request: FastifyRequest<{ Params: { symbol: string } }>,
      reply: FastifyReply
    ) => {
      const query = z
        .object({
          depth: z.coerce.number().int().positive().max(100).default(20),
        })
        .parse(request.query);

      const market = await prisma.market.findUnique({
        where: { symbol: request.params.symbol },
      });

      if (!market) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Market not found',
          404
        );
      }

      // Get open orders grouped by price level
      const [bids, asks] = await Promise.all([
        prisma.order.groupBy({
          by: ['price'],
          where: {
            marketId: market.id,
            side: 'BUY',
            status: 'OPEN',
          },
          _sum: { remainingQuantity: true },
          _count: true,
          orderBy: { price: 'desc' },
          take: query.depth,
        }),
        prisma.order.groupBy({
          by: ['price'],
          where: {
            marketId: market.id,
            side: 'SELL',
            status: 'OPEN',
          },
          _sum: { remainingQuantity: true },
          _count: true,
          orderBy: { price: 'asc' },
          take: query.depth,
        }),
      ]);

      return reply.send({
        success: true,
        data: {
          symbol: market.symbol,
          timestamp: new Date().toISOString(),
          bids: bids.map((b) => ({
            price: b.price?.toString() || '0',
            quantity: b._sum.remainingQuantity || '0',
            orderCount: b._count,
          })),
          asks: asks.map((a) => ({
            price: a.price?.toString() || '0',
            quantity: a._sum.remainingQuantity || '0',
            orderCount: a._count,
          })),
        },
      });
    }
  );

  /**
   * GET /trading/markets/:symbol/trades
   * Get recent trades for a market
   */
  app.get(
    '/markets/:symbol/trades',
    async (
      request: FastifyRequest<{ Params: { symbol: string } }>,
      reply: FastifyReply
    ) => {
      const query = z
        .object({
          limit: z.coerce.number().int().positive().max(100).default(50),
        })
        .parse(request.query);

      const market = await prisma.market.findUnique({
        where: { symbol: request.params.symbol },
      });

      if (!market) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Market not found',
          404
        );
      }

      const trades = await prisma.trade.findMany({
        where: { marketId: market.id },
        select: {
          id: true,
          quantity: true,
          price: true,
          total: true,
          executedAt: true,
        },
        orderBy: { executedAt: 'desc' },
        take: query.limit,
      });

      return reply.send({
        success: true,
        data: trades,
      });
    }
  );

  // Authenticated trading routes
  app.register(async (protectedRoutes) => {
    protectedRoutes.addHook('preHandler', authenticate);
    protectedRoutes.addHook('preHandler', requireKyc);

    /**
     * GET /trading/orders
     * Get user's orders
     */
    protectedRoutes.get('/orders', async (request: FastifyRequest, reply: FastifyReply) => {
      const query = z
        .object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().max(100).default(20),
          status: z.enum(['PENDING', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED']).optional(),
          side: z.enum(['BUY', 'SELL']).optional(),
          marketId: z.string().optional(),
        })
        .parse(request.query);

      const where = {
        userId: request.user!.sub,
        ...(query.status && { status: query.status }),
        ...(query.side && { side: query.side }),
        ...(query.marketId && { marketId: query.marketId }),
      };

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            market: {
              select: {
                symbol: true,
                baseToken: true,
                quoteToken: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        prisma.order.count({ where }),
      ]);

      return reply.send({
        success: true,
        data: orders,
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
     * POST /trading/orders
     * Place a new order
     */
    protectedRoutes.post('/orders', async (request: FastifyRequest, reply: FastifyReply) => {
      const body = z
        .object({
          marketId: z.string(),
          type: z.enum(['MARKET', 'LIMIT', 'STOP_LIMIT']),
          side: z.enum(['BUY', 'SELL']),
          quantity: z.string().regex(/^\d+(\.\d+)?$/),
          price: z.number().positive().optional(),
          stopPrice: z.number().positive().optional(),
          timeInForce: z.enum(['gtc', 'ioc', 'fok', 'day', 'gtd']).default('gtc'),
          expiresAt: z.coerce.date().optional(),
          walletAddress: z.string(),
          clientOrderId: z.string().max(50).optional(),
        })
        .refine(
          (data) => {
            if (data.type === 'LIMIT' || data.type === 'STOP_LIMIT') {
              return data.price !== undefined;
            }
            return true;
          },
          { message: 'Price is required for limit orders' }
        )
        .refine(
          (data) => {
            if (data.type === 'STOP_LIMIT') {
              return data.stopPrice !== undefined;
            }
            return true;
          },
          { message: 'Stop price is required for stop-limit orders' }
        )
        .parse(request.body);

      // Get market
      const market = await prisma.market.findUnique({
        where: { id: body.marketId },
      });

      if (!market) {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          'Market not found',
          404
        );
      }

      if (market.status !== 'active') {
        throw new AppError(
          ErrorCodes.FORBIDDEN,
          'Market is not currently active',
          403
        );
      }

      // Validate order size
      const quantity = parseFloat(body.quantity);
      if (quantity < parseFloat(market.minOrderSize)) {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          `Minimum order size is ${market.minOrderSize}`,
          400
        );
      }
      if (quantity > parseFloat(market.maxOrderSize)) {
        throw new AppError(
          ErrorCodes.VALIDATION_ERROR,
          `Maximum order size is ${market.maxOrderSize}`,
          400
        );
      }

      // For sell orders, check token balance
      if (body.side === 'SELL') {
        const investorProfile = await prisma.investorProfile.findUnique({
          where: { userId: request.user!.sub },
        });

        if (investorProfile) {
          const holding = await prisma.tokenHolder.findFirst({
            where: {
              tokenId: market.tokenId,
              investorProfileId: investorProfile.id,
            },
          });

          const availableBalance = holding ? parseFloat(holding.availableBalance) : 0;
          if (quantity > availableBalance) {
            throw new AppError(
              ErrorCodes.INSUFFICIENT_BALANCE,
              'Insufficient token balance',
              400
            );
          }
        }
      }

      // Create order
      const order = await prisma.order.create({
        data: {
          userId: request.user!.sub,
          marketId: body.marketId,
          type: body.type,
          side: body.side,
          status: 'PENDING',
          quantity: body.quantity,
          filledQuantity: '0',
          remainingQuantity: body.quantity,
          price: body.price,
          stopPrice: body.stopPrice,
          timeInForce: body.timeInForce,
          expiresAt: body.expiresAt,
          walletAddress: body.walletAddress,
          complianceStatus: 'pending',
          clientOrderId: body.clientOrderId,
        },
        include: {
          market: {
            select: {
              symbol: true,
            },
          },
        },
      });

      // TODO: Submit to order matching engine

      return reply.status(201).send({
        success: true,
        data: order,
      });
    });

    /**
     * DELETE /trading/orders/:id
     * Cancel an order
     */
    protectedRoutes.delete(
      '/orders/:id',
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        const order = await prisma.order.findFirst({
          where: {
            id: request.params.id,
            userId: request.user!.sub,
          },
        });

        if (!order) {
          throw new AppError(
            ErrorCodes.NOT_FOUND,
            'Order not found',
            404
          );
        }

        // Only allow cancellation of open orders
        const cancellableStatuses = ['PENDING', 'OPEN', 'PARTIALLY_FILLED'];
        if (!cancellableStatuses.includes(order.status)) {
          throw new AppError(
            ErrorCodes.FORBIDDEN,
            'This order cannot be cancelled',
            403
          );
        }

        const updated = await prisma.order.update({
          where: { id: request.params.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
        });

        return reply.send({
          success: true,
          data: updated,
        });
      }
    );

    /**
     * GET /trading/trades
     * Get user's trade history
     */
    protectedRoutes.get('/trades', async (request: FastifyRequest, reply: FastifyReply) => {
      const query = z
        .object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().max(100).default(20),
          marketId: z.string().optional(),
        })
        .parse(request.query);

      const where = {
        OR: [
          { buyerId: request.user!.sub },
          { sellerId: request.user!.sub },
        ],
        ...(query.marketId && { marketId: query.marketId }),
      };

      const [trades, total] = await Promise.all([
        prisma.trade.findMany({
          where,
          include: {
            market: {
              select: {
                symbol: true,
              },
            },
          },
          orderBy: { executedAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        prisma.trade.count({ where }),
      ]);

      // Add side info to each trade
      const tradesWithSide = trades.map((trade) => ({
        ...trade,
        side: trade.buyerId === request.user!.sub ? 'BUY' : 'SELL',
        fee: trade.buyerId === request.user!.sub ? trade.buyerFee : trade.sellerFee,
      }));

      return reply.send({
        success: true,
        data: tradesWithSide,
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
  });
}
