/**
 * Token types for the CryptoAI platform
 * Based on ERC-3643 (T-REX) security token standard
 */

import type {
  UUID,
  Timestamp,
  BaseEntity,
  Address,
  Blockchain,
  Money,
} from './common';

/**
 * Token standard types
 */
export enum TokenStandard {
  ERC3643 = 'erc3643',  // T-REX compliant security tokens
  ERC1400 = 'erc1400',  // Partitioned tokens
  ERC20 = 'erc20',      // Standard fungible tokens
  ERC1404 = 'erc1404',  // Simple restricted tokens
}

/**
 * Token status
 */
export enum TokenStatus {
  DRAFT = 'draft',
  DEPLOYING = 'deploying',
  DEPLOYED = 'deployed',
  ACTIVE = 'active',
  PAUSED = 'paused',
  FROZEN = 'frozen',
}

/**
 * Token configuration
 */
export interface Token extends BaseEntity {
  assetId: UUID;
  issuerId: UUID;

  // Token identity
  name: string;
  symbol: string;
  decimals: number;
  standard: TokenStandard;
  status: TokenStatus;

  // Supply
  totalSupply: string;
  circulatingSupply: string;
  maxSupply?: string;

  // Pricing
  initialPrice: Money;
  currentPrice: Money;

  // Blockchain deployment
  deployments: TokenDeployment[];
  primaryDeployment?: UUID;

  // Compliance
  complianceModules: ComplianceModule[];
  transferRestrictions: TokenTransferRestriction[];
  whitelistEnabled: boolean;

  // Features
  features: TokenFeatures;

  // Metadata
  metadata?: TokenMetadata;
}

/**
 * Token deployment on a specific blockchain
 */
export interface TokenDeployment extends BaseEntity {
  tokenId: UUID;
  blockchain: Blockchain;
  chainId: number;
  contractAddress: Address;
  deploymentTxHash: string;
  deployedAt: Timestamp;
  deployedBy: Address;

  // Related contracts
  identityRegistryAddress?: Address;
  complianceAddress?: Address;
  claimIssuerAddresses?: Address[];

  // Status
  isActive: boolean;
  isPrimary: boolean;

  // Verification
  isVerified: boolean;
  verificationUrl?: string;
}

/**
 * ERC-3643 Compliance modules
 */
export enum ComplianceModuleType {
  // Identity
  IDENTITY_REGISTRY = 'identity_registry',
  CLAIM_TOPICS = 'claim_topics',
  TRUSTED_ISSUERS = 'trusted_issuers',

  // Transfer rules
  COUNTRY_RESTRICTION = 'country_restriction',
  INVESTOR_LIMIT = 'investor_limit',
  TIME_LOCK = 'time_lock',
  EXCHANGE_MONTHLY_LIMIT = 'exchange_monthly_limit',

  // Custom
  ACCREDITATION_CHECK = 'accreditation_check',
  HOLDING_PERIOD = 'holding_period',
  MAXIMUM_HOLDING = 'maximum_holding',
}

/**
 * Compliance module configuration
 */
export interface ComplianceModule {
  type: ComplianceModuleType;
  enabled: boolean;
  config: Record<string, unknown>;
  contractAddress?: Address;
}

/**
 * Token transfer restrictions
 */
export interface TokenTransferRestriction {
  id: UUID;
  type: TransferRestrictionType;
  description: string;
  params: Record<string, unknown>;
  startDate?: Timestamp;
  endDate?: Timestamp;
  isActive: boolean;
}

export enum TransferRestrictionType {
  LOCK_UP = 'lock_up',
  JURISDICTION = 'jurisdiction',
  ACCREDITATION = 'accreditation',
  HOLDING_LIMIT = 'holding_limit',
  WHITELIST = 'whitelist',
  BLACKLIST = 'blacklist',
  TRANSFER_FREQUENCY = 'transfer_frequency',
  MIN_HOLDING = 'min_holding',
}

/**
 * Token features
 */
export interface TokenFeatures {
  // Core features
  mintable: boolean;
  burnable: boolean;
  pausable: boolean;
  freezable: boolean;

  // Governance
  votingEnabled: boolean;
  delegationEnabled: boolean;

  // Dividends
  dividendsEnabled: boolean;
  dividendToken?: Address; // Token used for dividend payments

  // Recovery
  recoveryEnabled: boolean; // For lost wallet recovery

  // Compliance
  forceTransferEnabled: boolean; // For regulatory compliance
}

/**
 * Token metadata
 */
export interface TokenMetadata {
  description?: string;
  image?: string;
  externalUrl?: string;
  backgroundColor?: string;
  attributes?: {
    trait_type: string;
    value: string | number;
  }[];
}

/**
 * Token holder information
 */
export interface TokenHolder extends BaseEntity {
  tokenId: UUID;
  investorId: UUID;
  walletAddress: Address;

  // Holdings
  balance: string;
  lockedBalance: string;
  availableBalance: string;

  // Compliance
  isWhitelisted: boolean;
  whitelistedAt?: Timestamp;
  kycVerified: boolean;

  // History
  firstPurchaseAt?: Timestamp;
  lastTransactionAt?: Timestamp;
  totalReceived: string;
  totalSent: string;
}

/**
 * Token transaction
 */
export interface TokenTransaction extends BaseEntity {
  tokenId: UUID;
  deploymentId: UUID;
  txHash: string;
  blockNumber: number;

  type: TokenTransactionType;
  status: TransactionStatus;

  from: Address;
  to: Address;
  amount: string;

  // For compliance
  fromInvestorId?: UUID;
  toInvestorId?: UUID;

  // Metadata
  gasUsed?: string;
  gasPrice?: string;
  executedAt: Timestamp;

  // Compliance check results
  complianceCheck?: ComplianceCheckResult;
}

export enum TokenTransactionType {
  MINT = 'mint',
  BURN = 'burn',
  TRANSFER = 'transfer',
  FORCED_TRANSFER = 'forced_transfer',
  FREEZE = 'freeze',
  UNFREEZE = 'unfreeze',
  RECOVERY = 'recovery',
}

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  REVERTED = 'reverted',
}

/**
 * Compliance check result
 */
export interface ComplianceCheckResult {
  passed: boolean;
  checks: {
    module: ComplianceModuleType;
    passed: boolean;
    reason?: string;
  }[];
  timestamp: Timestamp;
}

/**
 * Token claim (for ERC-3643)
 */
export interface TokenClaim {
  id: UUID;
  tokenId: UUID;
  investorId: UUID;
  claimTopic: number;
  claimIssuer: Address;
  signature: string;
  data: string;
  uri?: string;
  issuedAt: Timestamp;
  expiresAt?: Timestamp;
  isValid: boolean;
}

/**
 * Corporate action types
 */
export enum CorporateActionType {
  DIVIDEND = 'dividend',
  STOCK_SPLIT = 'stock_split',
  REVERSE_SPLIT = 'reverse_split',
  RIGHTS_ISSUE = 'rights_issue',
  CONVERSION = 'conversion',
  MERGER = 'merger',
  DELISTING = 'delisting',
}

/**
 * Corporate action
 */
export interface CorporateAction extends BaseEntity {
  tokenId: UUID;
  type: CorporateActionType;
  status: 'announced' | 'processing' | 'completed' | 'cancelled';

  // Dates
  announcementDate: Timestamp;
  recordDate: Timestamp;
  executionDate: Timestamp;

  // Details
  title: string;
  description: string;
  params: Record<string, unknown>;

  // For dividends
  dividend?: {
    amountPerToken: string;
    currency: string;
    paymentDate: Timestamp;
    totalAmount: string;
  };

  // For splits
  split?: {
    ratio: string; // e.g., "2:1" for stock split
    adjustedPrice: string;
  };

  // Results
  affectedHolders?: number;
  processedAt?: Timestamp;
}

/**
 * Token minting request
 */
export interface MintRequest extends BaseEntity {
  tokenId: UUID;
  requestedBy: UUID;
  recipient: Address;
  amount: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  approvedBy?: UUID;
  approvedAt?: Timestamp;
  txHash?: string;
  executedAt?: Timestamp;
}

/**
 * Token configuration for deployment
 */
export interface TokenDeploymentConfig {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
  maxSupply?: string;

  // ERC-3643 specific
  identityRegistry: {
    claimTopics: number[];
    trustedIssuers: Address[];
  };

  compliance: {
    modules: ComplianceModuleType[];
    countryRestrictions?: {
      allowed?: number[];
      blocked?: number[];
    };
    investorLimit?: number;
  };

  // Owner/Admin
  owner: Address;
  agents: Address[];

  // Features
  features: Partial<TokenFeatures>;
}
