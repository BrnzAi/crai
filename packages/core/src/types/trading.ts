/**
 * Trading types for the CryptoAI platform
 * Supports secondary market trading with compliance checks
 */

import type {
  UUID,
  Timestamp,
  BaseEntity,
  Address,
  Money,
} from './common';

// ==========================================
// ORDER TYPES
// ==========================================

/**
 * Order types
 */
export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP_LIMIT = 'stop_limit',
}

/**
 * Order side
 */
export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

/**
 * Order status
 */
export enum OrderStatus {
  PENDING = 'pending',
  OPEN = 'open',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * Trading order
 */
export interface Order extends BaseEntity {
  userId: UUID;
  investorId: UUID;
  tokenId: UUID;
  marketId: UUID;

  // Order details
  type: OrderType;
  side: OrderSide;
  status: OrderStatus;

  // Quantities
  quantity: string;
  filledQuantity: string;
  remainingQuantity: string;

  // Prices
  price?: Money;          // For limit orders
  stopPrice?: Money;      // For stop-limit orders
  averageFillPrice?: Money;

  // Time in force
  timeInForce: TimeInForce;
  expiresAt?: Timestamp;

  // Settlement
  walletAddress: Address;

  // Compliance
  complianceStatus: OrderComplianceStatus;
  complianceChecks?: OrderComplianceCheck[];

  // Execution
  trades: UUID[];
  totalFees?: Money;

  // Timestamps
  submittedAt: Timestamp;
  openedAt?: Timestamp;
  filledAt?: Timestamp;
  cancelledAt?: Timestamp;

  // Client reference
  clientOrderId?: string;

  // Notes
  notes?: string;
}

export enum TimeInForce {
  GTC = 'gtc',     // Good till cancelled
  IOC = 'ioc',     // Immediate or cancel
  FOK = 'fok',     // Fill or kill
  DAY = 'day',     // Day order
  GTD = 'gtd',     // Good till date
}

export enum OrderComplianceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface OrderComplianceCheck {
  type: string;
  passed: boolean;
  reason?: string;
  checkedAt: Timestamp;
}

// ==========================================
// TRADE TYPES
// ==========================================

/**
 * Trade (executed order match)
 */
export interface Trade extends BaseEntity {
  marketId: UUID;
  tokenId: UUID;

  // Parties
  buyOrderId: UUID;
  sellOrderId: UUID;
  buyerId: UUID;
  sellerId: UUID;

  // Trade details
  quantity: string;
  price: Money;
  total: Money;

  // Fees
  buyerFee: Money;
  sellerFee: Money;
  platformFee: Money;

  // Settlement
  status: TradeStatus;
  settlementStatus: SettlementStatus;

  // Blockchain settlement
  txHash?: string;
  settledAt?: Timestamp;

  // Timestamps
  executedAt: Timestamp;
}

export enum TradeStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

export enum SettlementStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SETTLED = 'settled',
  FAILED = 'failed',
}

// ==========================================
// MARKET TYPES
// ==========================================

/**
 * Trading market for a token
 */
export interface Market extends BaseEntity {
  tokenId: UUID;
  assetId: UUID;

  // Market identity
  symbol: string; // e.g., "PROP001/USDC"
  baseToken: string;
  quoteToken: string;

  // Status
  status: MarketStatus;

  // Trading rules
  minOrderSize: string;
  maxOrderSize: string;
  tickSize: string;        // Minimum price increment
  lotSize: string;         // Minimum quantity increment

  // Fees
  makerFee: number;        // percentage
  takerFee: number;        // percentage

  // Compliance
  requiredKycLevel: string;
  allowedJurisdictions?: string[];
  blockedJurisdictions?: string[];
  accreditationRequired: boolean;

  // Trading hours (if restricted)
  tradingHours?: TradingHours;

  // Statistics
  stats?: MarketStats;
}

export enum MarketStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  HALTED = 'halted',
  CLOSED = 'closed',
}

export interface TradingHours {
  timezone: string;
  sessions: {
    day: string;
    open: string;
    close: string;
  }[];
  holidays: string[];
}

export interface MarketStats {
  lastPrice?: Money;
  change24h?: number;
  high24h?: Money;
  low24h?: Money;
  volume24h?: string;
  volumeUsd24h?: Money;
  trades24h?: number;
  openInterest?: string;
  updatedAt: Timestamp;
}

// ==========================================
// ORDER BOOK TYPES
// ==========================================

/**
 * Order book snapshot
 */
export interface OrderBook {
  marketId: UUID;
  symbol: string;
  timestamp: Timestamp;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface OrderBookLevel {
  price: string;
  quantity: string;
  orderCount: number;
}

/**
 * Order book update (for WebSocket)
 */
export interface OrderBookUpdate {
  marketId: UUID;
  type: 'snapshot' | 'update';
  bids?: OrderBookLevel[];
  asks?: OrderBookLevel[];
  timestamp: Timestamp;
}

// ==========================================
// LIQUIDITY POOL TYPES
// ==========================================

/**
 * Compliant liquidity pool
 */
export interface LiquidityPool extends BaseEntity {
  marketId: UUID;
  tokenId: UUID;

  // Pool identity
  name: string;
  status: LiquidityPoolStatus;

  // Token reserves
  tokenReserve: string;
  quoteReserve: string;

  // Pool parameters
  swapFee: number;         // percentage
  protocolFee: number;     // percentage to platform

  // LP tokens
  lpTokenAddress?: Address;
  totalLpTokens: string;

  // Compliance
  kycRequired: boolean;
  whitelistOnly: boolean;

  // Statistics
  totalValueLocked?: Money;
  volume24h?: Money;
  apy?: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export enum LiquidityPoolStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
}

/**
 * Liquidity provider position
 */
export interface LiquidityPosition extends BaseEntity {
  poolId: UUID;
  userId: UUID;
  investorId: UUID;

  // Position
  lpTokenBalance: string;
  sharePercentage: number;

  // Value
  tokenAmount: string;
  quoteAmount: string;
  totalValue: Money;

  // Earnings
  feesEarned: Money;
  impermanentLoss?: Money;

  // Timestamps
  depositedAt: Timestamp;
  lastUpdatedAt: Timestamp;
}

/**
 * Pool swap transaction
 */
export interface PoolSwap extends BaseEntity {
  poolId: UUID;
  userId: UUID;

  // Swap details
  direction: 'buy' | 'sell';
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;

  // Pricing
  effectivePrice: string;
  priceImpact: number;

  // Fees
  fee: Money;

  // Settlement
  txHash?: string;
  status: 'pending' | 'confirmed' | 'failed';

  executedAt: Timestamp;
}

// ==========================================
// MARKET MAKER TYPES
// ==========================================

/**
 * Market maker
 */
export interface MarketMaker extends BaseEntity {
  userId: UUID;
  name: string;
  status: 'active' | 'suspended' | 'inactive';

  // Markets
  marketIds: UUID[];

  // Obligations
  minSpread: number;
  minDepth: Money;
  uptimeRequirement: number; // percentage

  // Incentives
  feeRebate: number;
  rewards?: Money;

  // Performance
  performance?: MarketMakerPerformance;

  // API access
  apiKeyId?: UUID;
  rateLimit?: number;
}

export interface MarketMakerPerformance {
  uptime: number;
  averageSpread: number;
  averageDepth: Money;
  volume30d: Money;
  measuredAt: Timestamp;
}

// ==========================================
// PRICE FEED TYPES
// ==========================================

/**
 * Price feed entry
 */
export interface PriceFeed {
  tokenId: UUID;
  symbol: string;
  price: Money;
  source: PriceSource;
  timestamp: Timestamp;
}

export enum PriceSource {
  PLATFORM = 'platform',
  CHAINLINK = 'chainlink',
  COINGECKO = 'coingecko',
  MANUAL = 'manual',
}

/**
 * OHLCV candle data
 */
export interface Candle {
  marketId: UUID;
  interval: CandleInterval;
  timestamp: Timestamp;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  trades: number;
}

export enum CandleInterval {
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  ONE_HOUR = '1h',
  FOUR_HOURS = '4h',
  ONE_DAY = '1d',
  ONE_WEEK = '1w',
}
