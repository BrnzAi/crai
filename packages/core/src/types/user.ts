/**
 * User-related types for the CryptoAI platform
 */

import type { UUID, Timestamp, BaseEntity, Address, Jurisdiction, FileReference } from './common';

/**
 * User roles in the platform
 */
export enum UserRole {
  ADMIN = 'admin',
  ISSUER = 'issuer',
  INVESTOR = 'investor',
  PARTNER = 'partner', // White-label partners
}

/**
 * User account status
 */
export enum UserStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
}

/**
 * Investor classification types
 */
export enum InvestorClassification {
  RETAIL = 'retail',
  ACCREDITED = 'accredited',
  QUALIFIED_PURCHASER = 'qualified_purchaser',
  INSTITUTIONAL = 'institutional',
}

/**
 * KYC verification status
 */
export enum KycStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

/**
 * Base user interface
 */
export interface User extends BaseEntity {
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneNumber?: string;
  phoneVerified: boolean;
  profile: UserProfile;
  kycStatus: KycStatus;
  lastLoginAt?: Timestamp;
  metadata?: Record<string, unknown>;
}

/**
 * User profile information
 */
export interface UserProfile {
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  dateOfBirth?: string;
  nationality?: string;
  countryOfResidence: string;
  timezone?: string;
  language: string;
  address?: PhysicalAddress;
}

/**
 * Physical address
 */
export interface PhysicalAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

/**
 * Issuer-specific profile
 */
export interface IssuerProfile extends BaseEntity {
  userId: UUID;
  companyName: string;
  companyType: CompanyType;
  registrationNumber: string;
  taxId?: string;
  jurisdiction: Jurisdiction;
  website?: string;
  description?: string;
  logo?: string;
  businessAddress: PhysicalAddress;
  primaryContact: ContactPerson;
  kybStatus: KycStatus; // KYB for businesses
  kybVerificationId?: string;
  documents: IssuerDocument[];
  isVerified: boolean;
  verifiedAt?: Timestamp;
}

/**
 * Company types
 */
export enum CompanyType {
  LLC = 'llc',
  CORPORATION = 'corporation',
  PARTNERSHIP = 'partnership',
  SOLE_PROPRIETOR = 'sole_proprietor',
  FREE_ZONE_COMPANY = 'free_zone_company',
  SPV = 'spv',
  TRUST = 'trust',
}

/**
 * Contact person
 */
export interface ContactPerson {
  name: string;
  email: string;
  phone: string;
  title: string;
}

/**
 * Issuer documents
 */
export interface IssuerDocument {
  type: IssuerDocumentType;
  file: FileReference;
  verified: boolean;
  verifiedAt?: Timestamp;
}

export enum IssuerDocumentType {
  TRADE_LICENSE = 'trade_license',
  CERTIFICATE_OF_INCORPORATION = 'certificate_of_incorporation',
  MEMORANDUM_OF_ASSOCIATION = 'memorandum_of_association',
  ARTICLES_OF_ASSOCIATION = 'articles_of_association',
  BOARD_RESOLUTION = 'board_resolution',
  SHAREHOLDER_AGREEMENT = 'shareholder_agreement',
  FINANCIAL_STATEMENTS = 'financial_statements',
  PROOF_OF_ADDRESS = 'proof_of_address',
}

/**
 * Investor-specific profile
 */
export interface InvestorProfile extends BaseEntity {
  userId: UUID;
  classification: InvestorClassification;
  accreditationStatus?: AccreditationStatus;
  accreditationExpiry?: Timestamp;
  accreditationMethod?: AccreditationMethod;
  riskProfile?: RiskProfile;
  investmentPreferences?: InvestmentPreferences;
  taxResidency: string;
  taxId?: string;
  wallets: WalletInfo[];
  bankAccounts: BankAccount[];
}

/**
 * Accreditation status
 */
export interface AccreditationStatus {
  isAccredited: boolean;
  verifiedAt?: Timestamp;
  expiresAt?: Timestamp;
  verificationMethod: AccreditationMethod;
  verificationProvider?: string;
  documents?: FileReference[];
}

export enum AccreditationMethod {
  INCOME = 'income',
  NET_WORTH = 'net_worth',
  PROFESSIONAL_CERTIFICATION = 'professional_certification',
  ENTITY = 'entity',
  SELF_CERTIFICATION = 'self_certification',
  THIRD_PARTY = 'third_party',
}

/**
 * Risk profile from suitability assessment
 */
export interface RiskProfile {
  riskTolerance: RiskTolerance;
  investmentHorizon: InvestmentHorizon;
  investmentExperience: InvestmentExperience;
  annualIncome?: string;
  netWorth?: string;
  liquidNetWorth?: string;
  assessedAt: Timestamp;
}

export enum RiskTolerance {
  CONSERVATIVE = 'conservative',
  MODERATE = 'moderate',
  AGGRESSIVE = 'aggressive',
}

export enum InvestmentHorizon {
  SHORT_TERM = 'short_term',     // < 1 year
  MEDIUM_TERM = 'medium_term',   // 1-5 years
  LONG_TERM = 'long_term',       // > 5 years
}

export enum InvestmentExperience {
  NONE = 'none',
  LIMITED = 'limited',
  MODERATE = 'moderate',
  EXTENSIVE = 'extensive',
}

/**
 * Investment preferences
 */
export interface InvestmentPreferences {
  assetTypes: string[];
  sectors?: string[];
  geographies?: string[];
  minYield?: number;
  maxRisk?: number;
}

/**
 * Wallet information
 */
export interface WalletInfo {
  address: Address;
  blockchain: string;
  type: WalletType;
  label?: string;
  isVerified: boolean;
  isPrimary: boolean;
  addedAt: Timestamp;
}

export enum WalletType {
  CUSTODIAL = 'custodial',
  SELF_CUSTODY = 'self_custody',
  MULTI_SIG = 'multi_sig',
}

/**
 * Bank account information
 */
export interface BankAccount {
  id: UUID;
  bankName: string;
  accountNumber: string;
  routingNumber?: string;
  iban?: string;
  swiftCode?: string;
  currency: string;
  isVerified: boolean;
  isPrimary: boolean;
}

/**
 * Admin user permissions
 */
export interface AdminPermissions {
  canManageUsers: boolean;
  canManageAssets: boolean;
  canApproveKyc: boolean;
  canManageCompliance: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
}

/**
 * User session
 */
export interface UserSession {
  id: UUID;
  userId: UUID;
  ipAddress: string;
  userAgent: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  lastActivityAt: Timestamp;
}
