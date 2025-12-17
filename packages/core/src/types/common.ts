/**
 * Common types used across the CryptoAI platform
 */

export type UUID = string;
export type Address = `0x${string}`;
export type ChainId = number;
export type Timestamp = Date;

/**
 * Supported blockchains
 */
export enum Blockchain {
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  ARBITRUM = 'arbitrum',
  XRP_LEDGER = 'xrp_ledger',
  HEDERA = 'hedera',
}

/**
 * Supported currencies
 */
export enum Currency {
  USD = 'USD',
  AED = 'AED',
  EUR = 'EUR',
  GBP = 'GBP',
  USDC = 'USDC',
  USDT = 'USDT',
  ETH = 'ETH',
  MATIC = 'MATIC',
}

/**
 * Regulatory jurisdictions
 */
export enum Jurisdiction {
  VARA = 'VARA',      // Dubai mainland
  DFSA = 'DFSA',      // DIFC
  ADGM = 'ADGM',      // Abu Dhabi
  SEC = 'SEC',        // United States
  FCA = 'FCA',        // United Kingdom
  MAS = 'MAS',        // Singapore
}

/**
 * UAE Emirates for property location
 */
export enum Emirate {
  DUBAI = 'dubai',
  ABU_DHABI = 'abu_dhabi',
  SHARJAH = 'sharjah',
  AJMAN = 'ajman',
  RAS_AL_KHAIMAH = 'ras_al_khaimah',
  UMM_AL_QUWAIN = 'umm_al_quwain',
  FUJAIRAH = 'fujairah',
}

/**
 * Base entity interface
 */
export interface BaseEntity {
  id: UUID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

/**
 * Money representation
 */
export interface Money {
  amount: string; // Using string to preserve decimal precision
  currency: Currency;
}

/**
 * Date range for queries
 */
export interface DateRange {
  from: Timestamp;
  to: Timestamp;
}

/**
 * Audit trail entry
 */
export interface AuditEntry {
  id: UUID;
  entityType: string;
  entityId: UUID;
  action: string;
  performedBy: UUID;
  performedAt: Timestamp;
  changes: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
}

/**
 * File/Document reference
 */
export interface FileReference {
  id: UUID;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  hash?: string; // For integrity verification
  uploadedAt: Timestamp;
}
