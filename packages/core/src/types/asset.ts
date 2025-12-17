/**
 * Asset types for the CryptoAI platform
 * Supports both Real Estate and Equity tokenization
 */

import type {
  UUID,
  Timestamp,
  BaseEntity,
  Jurisdiction,
  FileReference,
  Money,
  Emirate,
} from './common';

/**
 * Asset categories supported by the platform
 */
export enum AssetCategory {
  REAL_ESTATE = 'real_estate',
  EQUITY = 'equity',
}

/**
 * Asset status in the lifecycle
 */
export enum AssetStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  TOKENIZING = 'tokenizing',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  DELISTED = 'delisted',
}

/**
 * Base asset interface
 */
export interface Asset extends BaseEntity {
  issuerId: UUID;
  category: AssetCategory;
  status: AssetStatus;
  name: string;
  description: string;
  shortDescription?: string;
  jurisdiction: Jurisdiction;
  totalValue: Money;
  currency: string;
  images: FileReference[];
  documents: AssetDocument[];
  tokenId?: UUID; // Reference to token once tokenized
  spvId?: UUID;   // Reference to SPV entity
  metadata?: Record<string, unknown>;
  publishedAt?: Timestamp;
}

/**
 * Asset document types
 */
export enum AssetDocumentType {
  // General
  VALUATION_REPORT = 'valuation_report',
  LEGAL_OPINION = 'legal_opinion',
  WHITE_PAPER = 'white_paper',
  RISK_DISCLOSURE = 'risk_disclosure',
  PPM = 'ppm', // Private Placement Memorandum

  // Real Estate specific
  TITLE_DEED = 'title_deed',
  PROPERTY_SURVEY = 'property_survey',
  INSPECTION_REPORT = 'inspection_report',
  LEASE_AGREEMENT = 'lease_agreement',
  RENT_ROLL = 'rent_roll',
  INSURANCE_POLICY = 'insurance_policy',
  PROPERTY_TAX_RECORDS = 'property_tax_records',

  // Equity specific
  CERTIFICATE_OF_INCORPORATION = 'certificate_of_incorporation',
  ARTICLES_OF_ASSOCIATION = 'articles_of_association',
  SHAREHOLDERS_AGREEMENT = 'shareholders_agreement',
  CAP_TABLE = 'cap_table',
  FINANCIAL_STATEMENTS = 'financial_statements',
  BOARD_RESOLUTION = 'board_resolution',
  SAFE_AGREEMENT = 'safe_agreement',
  CONVERTIBLE_NOTE = 'convertible_note',
  ESOP_PLAN = 'esop_plan',
}

/**
 * Asset document
 */
export interface AssetDocument {
  id: UUID;
  type: AssetDocumentType;
  file: FileReference;
  aiExtractedData?: Record<string, unknown>;
  isRequired: boolean;
  isVerified: boolean;
  verifiedBy?: UUID;
  verifiedAt?: Timestamp;
  notes?: string;
}

// ==========================================
// REAL ESTATE SPECIFIC TYPES
// ==========================================

/**
 * Real estate property types
 */
export enum PropertyType {
  // Commercial
  OFFICE = 'office',
  RETAIL = 'retail',
  INDUSTRIAL = 'industrial',
  WAREHOUSE = 'warehouse',
  MIXED_USE = 'mixed_use',
  HOTEL = 'hotel',

  // Residential
  APARTMENT = 'apartment',
  VILLA = 'villa',
  TOWNHOUSE = 'townhouse',
  PENTHOUSE = 'penthouse',

  // Special
  LAND = 'land',
  DEVELOPMENT = 'development',
}

/**
 * Property ownership type
 */
export enum OwnershipType {
  FREEHOLD = 'freehold',
  LEASEHOLD = 'leasehold',
  USUFRUCT = 'usufruct',
}

/**
 * Real estate asset
 */
export interface RealEstateAsset extends Asset {
  category: AssetCategory.REAL_ESTATE;
  property: PropertyDetails;
  financials: PropertyFinancials;
  location: PropertyLocation;
  tenants?: TenantInfo[];
}

/**
 * Property details
 */
export interface PropertyDetails {
  propertyType: PropertyType;
  ownershipType: OwnershipType;
  titleDeedNumber?: string;
  plotNumber?: string;
  buildingName?: string;
  unitNumber?: string;
  totalArea: number; // in sqft
  usableArea?: number;
  floors?: number;
  units?: number;
  parkingSpaces?: number;
  yearBuilt?: number;
  lastRenovated?: number;
  amenities?: string[];
  zoningType?: string;
}

/**
 * Property location
 */
export interface PropertyLocation {
  emirate: Emirate;
  area: string;
  subArea?: string;
  street?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  freeholdZone: boolean;
}

/**
 * Property financials
 */
export interface PropertyFinancials {
  purchasePrice: Money;
  currentValuation: Money;
  lastValuationDate: Timestamp;
  nextValuationDate?: Timestamp;
  annualRentalIncome?: Money;
  occupancyRate?: number; // percentage
  operatingExpenses?: Money;
  netOperatingIncome?: Money;
  capRate?: number; // percentage
  projectedYield?: number; // percentage
  serviceCharges?: Money;
  mortgageDetails?: MortgageDetails;
}

/**
 * Mortgage details if property has debt
 */
export interface MortgageDetails {
  lender: string;
  principalAmount: Money;
  outstandingAmount: Money;
  interestRate: number;
  maturityDate: Timestamp;
  monthlyPayment: Money;
}

/**
 * Tenant information
 */
export interface TenantInfo {
  id: UUID;
  tenantName: string;
  unitNumber?: string;
  leaseStart: Timestamp;
  leaseEnd: Timestamp;
  monthlyRent: Money;
  securityDeposit?: Money;
  leaseType: 'residential' | 'commercial';
  isActive: boolean;
}

// ==========================================
// EQUITY SPECIFIC TYPES
// ==========================================

/**
 * Equity instrument types
 */
export enum EquityInstrumentType {
  COMMON_SHARES = 'common_shares',
  PREFERRED_SHARES = 'preferred_shares',
  SAFE = 'safe',
  CONVERTIBLE_NOTE = 'convertible_note',
  OPTIONS = 'options',
  WARRANTS = 'warrants',
  RSU = 'rsu',
}

/**
 * Company stage
 */
export enum CompanyStage {
  PRE_SEED = 'pre_seed',
  SEED = 'seed',
  SERIES_A = 'series_a',
  SERIES_B = 'series_b',
  SERIES_C = 'series_c',
  GROWTH = 'growth',
  PRE_IPO = 'pre_ipo',
  PUBLIC = 'public',
}

/**
 * Equity asset
 */
export interface EquityAsset extends Asset {
  category: AssetCategory.EQUITY;
  company: CompanyDetails;
  shareClass: ShareClassDetails;
  capTable: CapTableSummary;
  financials: CompanyFinancials;
}

/**
 * Company details
 */
export interface CompanyDetails {
  legalName: string;
  tradingName?: string;
  registrationNumber: string;
  incorporationDate: Timestamp;
  incorporationJurisdiction: string;
  companyType: string;
  industry: string;
  sector?: string;
  stage: CompanyStage;
  website?: string;
  employeeCount?: number;
  founders?: FounderInfo[];
  boardMembers?: BoardMember[];
}

/**
 * Founder information
 */
export interface FounderInfo {
  name: string;
  title: string;
  linkedIn?: string;
  bio?: string;
}

/**
 * Board member
 */
export interface BoardMember {
  name: string;
  title: string;
  independent: boolean;
  appointedDate: Timestamp;
}

/**
 * Share class details
 */
export interface ShareClassDetails {
  className: string;
  instrumentType: EquityInstrumentType;
  totalShares: number;
  pricePerShare: Money;
  votingRights: boolean;
  votesPerShare?: number;
  dividendRights: boolean;
  liquidationPreference?: number; // multiplier
  participationRights?: boolean;
  antiDilution?: 'full_ratchet' | 'weighted_average' | 'none';
  conversionRatio?: number;
  vestingSchedule?: VestingSchedule;
  transferRestrictions?: TransferRestriction[];
}

/**
 * Vesting schedule
 */
export interface VestingSchedule {
  totalPeriodMonths: number;
  cliffMonths: number;
  vestingFrequency: 'monthly' | 'quarterly' | 'annually';
  accelerationTriggers?: string[];
}

/**
 * Transfer restrictions
 */
export interface TransferRestriction {
  type: 'lock_up' | 'rofr' | 'co_sale' | 'drag_along' | 'jurisdiction';
  description: string;
  duration?: number; // in days
  conditions?: string;
}

/**
 * Cap table summary
 */
export interface CapTableSummary {
  totalAuthorizedShares: number;
  totalIssuedShares: number;
  fullyDilutedShares: number;
  shareClasses: {
    className: string;
    issuedShares: number;
    percentageOwnership: number;
  }[];
  optionPoolSize?: number;
  optionPoolRemaining?: number;
  safeObligations?: Money;
  convertibleNotes?: Money;
  lastUpdated: Timestamp;
}

/**
 * Company financials
 */
export interface CompanyFinancials {
  lastFiscalYearEnd: Timestamp;
  revenue?: Money;
  revenueGrowthRate?: number; // percentage YoY
  grossMargin?: number;
  netIncome?: Money;
  burnRate?: Money; // monthly
  runway?: number; // months
  totalFundingRaised?: Money;
  lastValuation?: Money;
  lastValuationDate?: Timestamp;
  priceToRevenue?: number;
  priceToEarnings?: number;
}

// ==========================================
// SPV (Special Purpose Vehicle) TYPES
// ==========================================

/**
 * SPV entity types
 */
export enum SpvType {
  ADGM_SPV = 'adgm_spv',
  DIFC_COMPANY = 'difc_company',
  UAE_LLC = 'uae_llc',
  CAYMAN_EXEMPTED = 'cayman_exempted',
  BVI_BC = 'bvi_bc',
}

/**
 * SPV details
 */
export interface SpvDetails extends BaseEntity {
  assetId: UUID;
  type: SpvType;
  legalName: string;
  registrationNumber: string;
  jurisdiction: string;
  incorporationDate: Timestamp;
  registeredAddress: string;
  directors: string[];
  shareholders: SpvShareholder[];
  authorizedCapital?: Money;
  issuedCapital?: Money;
  status: 'active' | 'inactive' | 'dissolved';
  annualFilingDate?: Timestamp;
  documents: FileReference[];
}

/**
 * SPV shareholder
 */
export interface SpvShareholder {
  name: string;
  type: 'individual' | 'corporate';
  shares: number;
  percentage: number;
}

// ==========================================
// OFFERING TYPES
// ==========================================

/**
 * Offering status
 */
export enum OfferingStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  OPEN = 'open',
  FULLY_SUBSCRIBED = 'fully_subscribed',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

/**
 * Offering details
 */
export interface Offering extends BaseEntity {
  assetId: UUID;
  tokenId: UUID;
  status: OfferingStatus;
  name: string;
  description: string;

  // Offering terms
  targetRaise: Money;
  minimumRaise?: Money;
  maximumRaise?: Money;
  tokenPrice: Money;
  totalTokens: number;
  tokensAvailable: number;
  tokensSold: number;

  // Investment limits
  minimumInvestment: Money;
  maximumInvestment?: Money;

  // Timeline
  startDate: Timestamp;
  endDate: Timestamp;
  settlementDate?: Timestamp;

  // Investor restrictions
  allowedJurisdictions?: string[];
  excludedJurisdictions?: string[];
  requireAccreditation: boolean;
  investorTypes: string[];

  // Distribution
  distributionSchedule?: DistributionSchedule;

  // Stats
  investorCount: number;
  amountRaised: Money;
}

/**
 * Distribution schedule
 */
export interface DistributionSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  startDate: Timestamp;
  paymentMethod: 'stablecoin' | 'fiat' | 'crypto';
  currency: string;
}
