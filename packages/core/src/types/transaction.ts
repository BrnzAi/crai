/**
 * Transaction types for the CryptoAI platform
 * Covers investments, payments, and distributions
 */

import type {
  UUID,
  Timestamp,
  BaseEntity,
  Address,
  Money,
  Currency,
  FileReference,
} from './common';

// ==========================================
// INVESTMENT TRANSACTIONS
// ==========================================

/**
 * Investment transaction status
 */
export enum InvestmentStatus {
  INITIATED = 'initiated',
  PENDING_PAYMENT = 'pending_payment',
  PAYMENT_RECEIVED = 'payment_received',
  COMPLIANCE_CHECK = 'compliance_check',
  PENDING_DOCUMENTS = 'pending_documents',
  DOCUMENTS_SIGNED = 'documents_signed',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

/**
 * Investment transaction
 */
export interface Investment extends BaseEntity {
  investorId: UUID;
  offeringId: UUID;
  assetId: UUID;
  tokenId?: UUID;

  status: InvestmentStatus;

  // Investment details
  amount: Money;
  tokenQuantity: string;
  pricePerToken: Money;

  // Payment
  paymentMethod: PaymentMethod;
  paymentId?: UUID;
  paymentReceivedAt?: Timestamp;

  // Documents
  subscriptionAgreement?: SignedDocument;
  additionalDocuments?: SignedDocument[];

  // Token delivery
  deliveryWallet?: Address;
  tokensDelivered: boolean;
  tokensDeliveredAt?: Timestamp;
  deliveryTxHash?: string;

  // Compliance
  complianceChecks: InvestmentComplianceCheck[];
  compliancePassed: boolean;

  // Cooling off (if applicable)
  coolingOffEnds?: Timestamp;
  coolingOffWaived?: boolean;

  // Refund (if applicable)
  refundedAt?: Timestamp;
  refundReason?: string;
  refundAmount?: Money;

  // Metadata
  referralCode?: string;
  source?: string;
  notes?: string;
}

/**
 * Payment methods
 */
export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  ACH = 'ach',
  WIRE = 'wire',
  USDC = 'usdc',
  USDT = 'usdt',
  ETH = 'eth',
  CRYPTO_OTHER = 'crypto_other',
}

/**
 * Signed document
 */
export interface SignedDocument {
  id: UUID;
  type: string;
  file: FileReference;
  signatureProvider: 'docusign' | 'adobe_sign' | 'platform';
  externalId?: string;
  status: 'pending' | 'signed' | 'declined' | 'expired';
  signedAt?: Timestamp;
  signerName: string;
  signerEmail: string;
  ipAddress?: string;
}

/**
 * Investment compliance check
 */
export interface InvestmentComplianceCheck {
  type: string;
  status: 'pending' | 'passed' | 'failed' | 'manual_review';
  checkedAt: Timestamp;
  details?: Record<string, unknown>;
  failureReason?: string;
}

// ==========================================
// PAYMENT TRANSACTIONS
// ==========================================

/**
 * Payment status
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled',
}

/**
 * Payment transaction
 */
export interface Payment extends BaseEntity {
  userId: UUID;
  investmentId?: UUID;

  type: PaymentType;
  status: PaymentStatus;
  method: PaymentMethod;

  // Amounts
  amount: Money;
  fee?: Money;
  netAmount: Money;

  // Provider details
  provider: PaymentProvider;
  providerTransactionId?: string;
  providerStatus?: string;

  // For card payments
  cardDetails?: {
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    country?: string;
  };

  // For bank transfers
  bankDetails?: {
    bankName: string;
    accountLast4: string;
    routingNumber?: string;
    reference?: string;
  };

  // For crypto payments
  cryptoDetails?: {
    currency: string;
    network: string;
    fromAddress?: Address;
    toAddress: Address;
    txHash?: string;
    confirmations?: number;
    requiredConfirmations?: number;
  };

  // Timestamps
  initiatedAt: Timestamp;
  completedAt?: Timestamp;
  failedAt?: Timestamp;

  // Error handling
  errorCode?: string;
  errorMessage?: string;

  // Metadata
  metadata?: Record<string, unknown>;
}

export enum PaymentType {
  INVESTMENT = 'investment',
  SUBSCRIPTION = 'subscription',
  FEE = 'fee',
  REFUND = 'refund',
  WITHDRAWAL = 'withdrawal',
  DISTRIBUTION = 'distribution',
}

export enum PaymentProvider {
  STRIPE = 'stripe',
  CIRCLE = 'circle',
  BANK_PARTNER = 'bank_partner',
  MOONPAY = 'moonpay',
  INTERNAL = 'internal',
}

// ==========================================
// DISTRIBUTION TRANSACTIONS
// ==========================================

/**
 * Distribution status
 */
export enum DistributionStatus {
  SCHEDULED = 'scheduled',
  CALCULATING = 'calculating',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  PARTIALLY_COMPLETED = 'partially_completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Distribution (dividend/rental income payment)
 */
export interface Distribution extends BaseEntity {
  assetId: UUID;
  tokenId: UUID;
  issuerId: UUID;

  type: DistributionType;
  status: DistributionStatus;

  // Period
  periodStart: Timestamp;
  periodEnd: Timestamp;
  recordDate: Timestamp;

  // Amounts
  totalAmount: Money;
  amountPerToken: string;
  currency: Currency;

  // Token snapshot
  eligibleTokens: string;
  eligibleHolders: number;

  // Tax withholding
  totalWithholding?: Money;
  withholdingRate?: number;

  // Payment details
  paymentMethod: 'stablecoin' | 'fiat' | 'crypto';
  paymentCurrency: string;

  // Processing
  approvedBy?: UUID;
  approvedAt?: Timestamp;
  processedAt?: Timestamp;

  // Results
  successfulPayments: number;
  failedPayments: number;
  totalPaid: Money;

  // Individual payments
  payments?: DistributionPayment[];

  // Notes
  description?: string;
  notes?: string;
}

export enum DistributionType {
  DIVIDEND = 'dividend',
  RENTAL_INCOME = 'rental_income',
  INTEREST = 'interest',
  CAPITAL_RETURN = 'capital_return',
  SPECIAL = 'special',
}

/**
 * Individual distribution payment
 */
export interface DistributionPayment extends BaseEntity {
  distributionId: UUID;
  investorId: UUID;
  walletAddress?: Address;

  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

  // Amounts
  grossAmount: Money;
  withholdingAmount?: Money;
  netAmount: Money;

  // Token holding at record date
  tokenBalance: string;

  // Payment execution
  paymentMethod: string;
  txHash?: string;
  externalPaymentId?: string;

  // Timestamps
  scheduledAt: Timestamp;
  processedAt?: Timestamp;
  completedAt?: Timestamp;

  // Retry handling
  attempts: number;
  lastAttemptAt?: Timestamp;
  lastError?: string;
}

// ==========================================
// WITHDRAWAL TRANSACTIONS
// ==========================================

/**
 * Withdrawal status
 */
export enum WithdrawalStatus {
  PENDING = 'pending',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Withdrawal request
 */
export interface Withdrawal extends BaseEntity {
  userId: UUID;

  status: WithdrawalStatus;

  // Amount
  amount: Money;
  fee?: Money;
  netAmount: Money;

  // Destination
  method: WithdrawalMethod;
  bankAccountId?: UUID;
  walletAddress?: Address;
  blockchain?: string;

  // Processing
  requestedAt: Timestamp;
  approvedBy?: UUID;
  approvedAt?: Timestamp;
  processedAt?: Timestamp;
  completedAt?: Timestamp;

  // External reference
  externalReference?: string;
  txHash?: string;

  // Error
  failureReason?: string;

  // Notes
  notes?: string;
}

export enum WithdrawalMethod {
  BANK_TRANSFER = 'bank_transfer',
  WIRE = 'wire',
  USDC = 'usdc',
  USDT = 'usdt',
  CRYPTO = 'crypto',
}

// ==========================================
// PLATFORM FEES
// ==========================================

/**
 * Fee transaction
 */
export interface FeeTransaction extends BaseEntity {
  userId?: UUID;
  issuerId?: UUID;
  assetId?: UUID;
  investmentId?: UUID;
  tradeId?: UUID;

  type: FeeType;
  status: 'pending' | 'collected' | 'waived' | 'refunded';

  // Amounts
  amount: Money;
  rate?: number; // percentage
  baseAmount?: Money; // amount fee was calculated on

  // Collection
  collectedAt?: Timestamp;
  paymentId?: UUID;

  // Notes
  description?: string;
  waivedReason?: string;
}

export enum FeeType {
  PLATFORM = 'platform',
  TOKENIZATION = 'tokenization',
  ISSUANCE = 'issuance',
  MANAGEMENT = 'management',
  TRADING = 'trading',
  WITHDRAWAL = 'withdrawal',
  SUBSCRIPTION = 'subscription',
}

// ==========================================
// TRANSACTION HISTORY
// ==========================================

/**
 * Unified transaction history entry
 */
export interface TransactionHistoryEntry extends BaseEntity {
  userId: UUID;
  type: TransactionHistoryType;

  // Reference to specific transaction
  referenceId: UUID;
  referenceType: string;

  // Display info
  title: string;
  description?: string;
  status: string;

  // Amounts
  amount?: Money;
  fee?: Money;

  // Related entities
  assetId?: UUID;
  assetName?: string;
  tokenId?: UUID;
  tokenSymbol?: string;

  // Blockchain info
  txHash?: string;
  blockchain?: string;

  // Timestamps
  occurredAt: Timestamp;
}

export enum TransactionHistoryType {
  INVESTMENT = 'investment',
  DISTRIBUTION = 'distribution',
  TRADE = 'trade',
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  FEE = 'fee',
  REFUND = 'refund',
  TOKEN_TRANSFER = 'token_transfer',
}
