/**
 * Compliance and KYC/AML types for the CryptoAI platform
 * Aligned with UAE regulatory requirements (VARA, DFSA, ADGM)
 */

import type {
  UUID,
  Timestamp,
  BaseEntity,
  Address,
  FileReference,
  Jurisdiction,
} from './common';

// ==========================================
// KYC TYPES
// ==========================================

/**
 * KYC verification level
 */
export enum KycLevel {
  BASIC = 'basic',           // Email + phone
  STANDARD = 'standard',     // ID verification
  ENHANCED = 'enhanced',     // Full due diligence
}

/**
 * KYC verification request
 */
export interface KycVerification extends BaseEntity {
  userId: UUID;
  level: KycLevel;
  status: KycVerificationStatus;
  provider: KycProvider;
  externalId?: string; // Provider's reference ID

  // Personal information
  personalInfo: KycPersonalInfo;

  // Document verification
  documents: KycDocument[];

  // Biometric verification
  biometric?: BiometricVerification;

  // Address verification
  addressVerification?: AddressVerification;

  // Risk assessment
  riskAssessment?: KycRiskAssessment;

  // Review
  reviewedBy?: UUID;
  reviewedAt?: Timestamp;
  reviewNotes?: string;

  // Expiry
  expiresAt?: Timestamp;
  renewalReminderSent?: boolean;
}

export enum KycVerificationStatus {
  INITIATED = 'initiated',
  DOCUMENTS_PENDING = 'documents_pending',
  DOCUMENTS_SUBMITTED = 'documents_submitted',
  UNDER_REVIEW = 'under_review',
  ADDITIONAL_INFO_REQUIRED = 'additional_info_required',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum KycProvider {
  SUMSUB = 'sumsub',
  ONFIDO = 'onfido',
  JUMIO = 'jumio',
  UAE_PASS = 'uae_pass',
  MANUAL = 'manual',
}

/**
 * Personal information for KYC
 */
export interface KycPersonalInfo {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth?: string;
  nationality: string;
  secondNationality?: string;
  gender?: 'male' | 'female' | 'other';

  // ID numbers
  emiratesId?: string;
  passportNumber?: string;
  nationalId?: string;

  // Contact
  email: string;
  phone: string;

  // Address
  residentialAddress: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };

  // Tax information
  taxResidency: string;
  taxId?: string;
  usTaxPayer: boolean;

  // Employment
  occupation?: string;
  employer?: string;
  sourceOfFunds?: SourceOfFunds;
  sourceOfWealth?: string;
}

export enum SourceOfFunds {
  SALARY = 'salary',
  BUSINESS_INCOME = 'business_income',
  INVESTMENTS = 'investments',
  INHERITANCE = 'inheritance',
  SAVINGS = 'savings',
  REAL_ESTATE = 'real_estate',
  GIFT = 'gift',
  OTHER = 'other',
}

/**
 * KYC document
 */
export interface KycDocument {
  id: UUID;
  type: KycDocumentType;
  file: FileReference;

  // Extracted data
  extractedData?: {
    documentNumber?: string;
    issuingCountry?: string;
    issueDate?: string;
    expiryDate?: string;
    fullName?: string;
    dateOfBirth?: string;
    nationality?: string;
    mrz?: string;
  };

  // Verification
  status: DocumentVerificationStatus;
  verificationScore?: number;
  verificationDetails?: {
    authenticity?: boolean;
    dataMatch?: boolean;
    expiryValid?: boolean;
    qualityScore?: number;
  };

  submittedAt: Timestamp;
  verifiedAt?: Timestamp;
}

export enum KycDocumentType {
  PASSPORT = 'passport',
  NATIONAL_ID = 'national_id',
  EMIRATES_ID = 'emirates_id',
  DRIVING_LICENSE = 'driving_license',
  RESIDENCE_PERMIT = 'residence_permit',
  UTILITY_BILL = 'utility_bill',
  BANK_STATEMENT = 'bank_statement',
  TAX_RETURN = 'tax_return',
  PROOF_OF_ADDRESS = 'proof_of_address',
  SELFIE = 'selfie',
}

export enum DocumentVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * Biometric verification
 */
export interface BiometricVerification {
  type: 'face_match' | 'liveness';
  status: 'pending' | 'passed' | 'failed';
  score?: number; // 0-100
  attempts: number;
  lastAttemptAt: Timestamp;
  verifiedAt?: Timestamp;
}

/**
 * Address verification
 */
export interface AddressVerification {
  method: 'document' | 'database' | 'mail';
  status: 'pending' | 'verified' | 'failed';
  verifiedAddress?: string;
  verifiedAt?: Timestamp;
}

/**
 * KYC risk assessment
 */
export interface KycRiskAssessment {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'very_high';
  factors: RiskFactor[];
  assessedAt: Timestamp;
  nextReviewDate?: Timestamp;
}

export interface RiskFactor {
  type: string;
  description: string;
  score: number;
  weight: number;
}

// ==========================================
// AML TYPES
// ==========================================

/**
 * AML screening result
 */
export interface AmlScreening extends BaseEntity {
  userId: UUID;
  type: AmlScreeningType;
  status: AmlScreeningStatus;
  provider: string;
  externalId?: string;

  // Screening results
  results: AmlMatch[];

  // Review
  reviewRequired: boolean;
  reviewedBy?: UUID;
  reviewedAt?: Timestamp;
  reviewDecision?: 'clear' | 'true_positive' | 'false_positive';
  reviewNotes?: string;

  // Scheduling
  nextScreeningDate?: Timestamp;
}

export enum AmlScreeningType {
  SANCTIONS = 'sanctions',
  PEP = 'pep',
  ADVERSE_MEDIA = 'adverse_media',
  WATCHLIST = 'watchlist',
  COMPREHENSIVE = 'comprehensive',
}

export enum AmlScreeningStatus {
  PENDING = 'pending',
  CLEAR = 'clear',
  POTENTIAL_MATCH = 'potential_match',
  CONFIRMED_MATCH = 'confirmed_match',
  FALSE_POSITIVE = 'false_positive',
}

/**
 * AML match result
 */
export interface AmlMatch {
  id: UUID;
  matchType: AmlScreeningType;
  matchScore: number; // 0-100
  matchedName: string;
  listName: string;
  listType: string;

  // Match details
  details: {
    dateOfBirth?: string;
    nationality?: string;
    aliases?: string[];
    positions?: string[];
    sanctions?: string[];
    lastUpdated?: Timestamp;
  };

  // Resolution
  status: 'pending' | 'true_positive' | 'false_positive';
  resolvedBy?: UUID;
  resolvedAt?: Timestamp;
  resolutionNotes?: string;
}

/**
 * Wallet screening for crypto addresses
 */
export interface WalletScreening extends BaseEntity {
  userId?: UUID;
  walletAddress: Address;
  blockchain: string;

  status: WalletScreeningStatus;
  provider: string;

  // Risk assessment
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'severe';

  // Exposure
  exposures: WalletExposure[];

  // Cluster analysis
  clusterInfo?: {
    name?: string;
    category?: string;
    totalAddresses?: number;
  };

  screenedAt: Timestamp;
  nextScreeningDate?: Timestamp;
}

export enum WalletScreeningStatus {
  PENDING = 'pending',
  CLEAR = 'clear',
  FLAGGED = 'flagged',
  BLOCKED = 'blocked',
}

/**
 * Wallet exposure to risky entities
 */
export interface WalletExposure {
  category: string; // e.g., 'darknet', 'mixer', 'scam', 'sanctions'
  percentage: number;
  volumeUsd: number;
  direction: 'sent' | 'received' | 'both';
}

// ==========================================
// TRANSACTION MONITORING
// ==========================================

/**
 * Transaction monitoring alert
 */
export interface TransactionAlert extends BaseEntity {
  userId?: UUID;
  transactionId?: UUID;

  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;

  // Alert details
  title: string;
  description: string;
  triggerRule: string;

  // Transaction details
  transactionDetails?: {
    amount: string;
    currency: string;
    from?: string;
    to?: string;
    timestamp: Timestamp;
  };

  // Review
  assignedTo?: UUID;
  reviewedBy?: UUID;
  reviewedAt?: Timestamp;
  reviewNotes?: string;

  // Escalation
  escalated: boolean;
  escalatedTo?: UUID;
  escalatedAt?: Timestamp;

  // SAR filing
  sarFiled: boolean;
  sarReference?: string;
  sarFiledAt?: Timestamp;
}

export enum AlertType {
  LARGE_TRANSACTION = 'large_transaction',
  VELOCITY = 'velocity',
  STRUCTURING = 'structuring',
  HIGH_RISK_JURISDICTION = 'high_risk_jurisdiction',
  HIGH_RISK_WALLET = 'high_risk_wallet',
  PATTERN_DETECTION = 'pattern_detection',
  SANCTIONS_HIT = 'sanctions_hit',
  PEP_TRANSACTION = 'pep_transaction',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  NEW = 'new',
  IN_REVIEW = 'in_review',
  ESCALATED = 'escalated',
  CLEARED = 'cleared',
  SAR_FILED = 'sar_filed',
  CLOSED = 'closed',
}

/**
 * Suspicious Activity Report (SAR)
 */
export interface SuspiciousActivityReport extends BaseEntity {
  alertIds: UUID[];
  userId?: UUID;

  status: SarStatus;

  // Report details
  narrative: string;
  suspiciousActivity: string[];
  amount: string;
  currency: string;
  dateRange: {
    from: Timestamp;
    to: Timestamp;
  };

  // Subject information
  subjectInfo: {
    name: string;
    type: 'individual' | 'entity';
    identifiers: Record<string, string>;
  };

  // Submission
  submittedTo: string; // e.g., 'goAML UAE'
  submissionReference?: string;
  submittedAt?: Timestamp;
  submittedBy: UUID;

  // Response
  acknowledgmentReceived?: boolean;
  acknowledgmentDate?: Timestamp;
  responseNotes?: string;
}

export enum SarStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  SUBMITTED = 'submitted',
  ACKNOWLEDGED = 'acknowledged',
  CLOSED = 'closed',
}

// ==========================================
// COMPLIANCE RULES
// ==========================================

/**
 * Compliance rule
 */
export interface ComplianceRule extends BaseEntity {
  name: string;
  description: string;
  jurisdiction: Jurisdiction;
  category: ComplianceCategory;

  // Rule definition
  conditions: RuleCondition[];
  actions: RuleAction[];

  // Status
  isActive: boolean;
  priority: number;

  // Audit
  createdBy: UUID;
  lastModifiedBy?: UUID;
}

export enum ComplianceCategory {
  KYC = 'kyc',
  AML = 'aml',
  INVESTOR_ELIGIBILITY = 'investor_eligibility',
  TRANSFER_RESTRICTION = 'transfer_restriction',
  REPORTING = 'reporting',
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: unknown;
  logicalOperator?: 'and' | 'or';
}

export interface RuleAction {
  type: 'block' | 'flag' | 'require_approval' | 'notify' | 'escalate';
  params?: Record<string, unknown>;
}

// ==========================================
// ACCREDITATION
// ==========================================

/**
 * Accreditation verification
 */
export interface AccreditationVerification extends BaseEntity {
  userId: UUID;
  status: AccreditationVerificationStatus;
  method: AccreditationVerificationMethod;

  // For income-based
  incomeVerification?: {
    annualIncome: string;
    currency: string;
    yearsVerified: number;
    documents: FileReference[];
  };

  // For net worth-based
  netWorthVerification?: {
    netWorth: string;
    currency: string;
    excludingPrimaryResidence: boolean;
    documents: FileReference[];
  };

  // For professional certification
  professionalVerification?: {
    licenseType: string;
    licenseNumber: string;
    issuingAuthority: string;
    documents: FileReference[];
  };

  // Third party verification
  thirdPartyVerification?: {
    provider: string;
    verificationId: string;
    verifiedAt: Timestamp;
    certificate?: FileReference;
  };

  // Validity
  verifiedAt?: Timestamp;
  expiresAt: Timestamp;

  // Review
  reviewedBy?: UUID;
  reviewNotes?: string;
}

export enum AccreditationVerificationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum AccreditationVerificationMethod {
  INCOME = 'income',
  NET_WORTH = 'net_worth',
  PROFESSIONAL = 'professional',
  ENTITY = 'entity',
  THIRD_PARTY = 'third_party',
}
