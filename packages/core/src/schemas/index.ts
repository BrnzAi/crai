/**
 * Zod validation schemas for CryptoAI.ai platform
 */

import { z } from 'zod';

// ==========================================
// COMMON SCHEMAS
// ==========================================

export const uuidSchema = z.string().uuid();

export const ethereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

export const emailSchema = z.string().email('Invalid email address');

export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number (E.164 format required)');

export const emiratesIdSchema = z
  .string()
  .regex(/^784-\d{4}-\d{7}-\d$/, 'Invalid Emirates ID format');

export const moneySchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,18})?$/, 'Invalid amount'),
  currency: z.string().length(3).or(z.string().length(4)), // ISO currency or crypto
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const dateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
}).refine((data) => data.from <= data.to, {
  message: 'Start date must be before or equal to end date',
});

// ==========================================
// USER SCHEMAS
// ==========================================

export const createUserSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: z.enum(['issuer', 'investor']),
});

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(100).optional(),
  phoneNumber: phoneSchema.optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().length(2).optional(), // ISO country code
  countryOfResidence: z.string().length(2).optional(),
  timezone: z.string().optional(),
  language: z.string().default('en'),
});

export const addressSchema = z.object({
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().length(2),
});

// ==========================================
// KYC SCHEMAS
// ==========================================

export const kycPersonalInfoSchema = z.object({
  firstName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format: YYYY-MM-DD'),
  placeOfBirth: z.string().optional(),
  nationality: z.string().length(2),
  secondNationality: z.string().length(2).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  emiratesId: emiratesIdSchema.optional(),
  passportNumber: z.string().optional(),
  email: emailSchema,
  phone: phoneSchema,
  residentialAddress: addressSchema,
  taxResidency: z.string().length(2),
  taxId: z.string().optional(),
  usTaxPayer: z.boolean(),
  occupation: z.string().optional(),
  employer: z.string().optional(),
  sourceOfFunds: z.enum([
    'salary',
    'business_income',
    'investments',
    'inheritance',
    'savings',
    'real_estate',
    'gift',
    'other',
  ]).optional(),
  sourceOfWealth: z.string().optional(),
});

// ==========================================
// ASSET SCHEMAS
// ==========================================

export const createRealEstateAssetSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(10).max(5000),
  shortDescription: z.string().max(500).optional(),
  jurisdiction: z.enum(['VARA', 'DFSA', 'ADGM']),
  totalValue: moneySchema,
  property: z.object({
    propertyType: z.enum([
      'office', 'retail', 'industrial', 'warehouse', 'mixed_use', 'hotel',
      'apartment', 'villa', 'townhouse', 'penthouse', 'land', 'development',
    ]),
    ownershipType: z.enum(['freehold', 'leasehold', 'usufruct']),
    titleDeedNumber: z.string().optional(),
    plotNumber: z.string().optional(),
    buildingName: z.string().optional(),
    unitNumber: z.string().optional(),
    totalArea: z.number().positive(),
    usableArea: z.number().positive().optional(),
    floors: z.number().int().positive().optional(),
    units: z.number().int().positive().optional(),
    parkingSpaces: z.number().int().nonnegative().optional(),
    yearBuilt: z.number().int().optional(),
    lastRenovated: z.number().int().optional(),
    amenities: z.array(z.string()).optional(),
  }),
  location: z.object({
    emirate: z.enum([
      'dubai', 'abu_dhabi', 'sharjah', 'ajman',
      'ras_al_khaimah', 'umm_al_quwain', 'fujairah',
    ]),
    area: z.string().min(1),
    subArea: z.string().optional(),
    street: z.string().optional(),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }).optional(),
    freeholdZone: z.boolean(),
  }),
  financials: z.object({
    purchasePrice: moneySchema,
    currentValuation: moneySchema,
    annualRentalIncome: moneySchema.optional(),
    occupancyRate: z.number().min(0).max(100).optional(),
    operatingExpenses: moneySchema.optional(),
    projectedYield: z.number().optional(),
    serviceCharges: moneySchema.optional(),
  }),
});

export const createEquityAssetSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(10).max(5000),
  shortDescription: z.string().max(500).optional(),
  jurisdiction: z.enum(['VARA', 'DFSA', 'ADGM']),
  totalValue: moneySchema,
  company: z.object({
    legalName: z.string().min(1),
    tradingName: z.string().optional(),
    registrationNumber: z.string().min(1),
    incorporationDate: z.coerce.date(),
    incorporationJurisdiction: z.string(),
    companyType: z.string(),
    industry: z.string(),
    sector: z.string().optional(),
    stage: z.enum([
      'pre_seed', 'seed', 'series_a', 'series_b',
      'series_c', 'growth', 'pre_ipo', 'public',
    ]),
    website: z.string().url().optional(),
    employeeCount: z.number().int().positive().optional(),
  }),
  shareClass: z.object({
    className: z.string().min(1),
    instrumentType: z.enum([
      'common_shares', 'preferred_shares', 'safe',
      'convertible_note', 'options', 'warrants', 'rsu',
    ]),
    totalShares: z.number().int().positive(),
    pricePerShare: moneySchema,
    votingRights: z.boolean(),
    dividendRights: z.boolean(),
  }),
});

// ==========================================
// TOKEN SCHEMAS
// ==========================================

export const tokenDeploymentConfigSchema = z.object({
  name: z.string().min(1).max(100),
  symbol: z.string().min(2).max(10).regex(/^[A-Z0-9]+$/),
  decimals: z.number().int().min(0).max(18).default(18),
  initialSupply: z.string().regex(/^\d+$/),
  maxSupply: z.string().regex(/^\d+$/).optional(),
  owner: ethereumAddressSchema,
  agents: z.array(ethereumAddressSchema).optional(),
  compliance: z.object({
    modules: z.array(z.string()),
    countryRestrictions: z.object({
      allowed: z.array(z.number()).optional(),
      blocked: z.array(z.number()).optional(),
    }).optional(),
    investorLimit: z.number().int().positive().optional(),
  }),
  features: z.object({
    mintable: z.boolean().default(true),
    burnable: z.boolean().default(true),
    pausable: z.boolean().default(true),
    freezable: z.boolean().default(true),
    votingEnabled: z.boolean().default(false),
    dividendsEnabled: z.boolean().default(true),
  }).optional(),
});

// ==========================================
// TRADING SCHEMAS
// ==========================================

export const createOrderSchema = z.object({
  tokenId: uuidSchema,
  marketId: uuidSchema,
  type: z.enum(['market', 'limit', 'stop_limit']),
  side: z.enum(['buy', 'sell']),
  quantity: z.string().regex(/^\d+(\.\d+)?$/),
  price: moneySchema.optional(), // Required for limit orders
  stopPrice: moneySchema.optional(), // Required for stop-limit orders
  timeInForce: z.enum(['gtc', 'ioc', 'fok', 'day', 'gtd']).default('gtc'),
  expiresAt: z.coerce.date().optional(),
  walletAddress: ethereumAddressSchema,
  clientOrderId: z.string().max(50).optional(),
}).refine(
  (data) => {
    if (data.type === 'limit' || data.type === 'stop_limit') {
      return data.price !== undefined;
    }
    return true;
  },
  { message: 'Price is required for limit orders' }
).refine(
  (data) => {
    if (data.type === 'stop_limit') {
      return data.stopPrice !== undefined;
    }
    return true;
  },
  { message: 'Stop price is required for stop-limit orders' }
);

// ==========================================
// INVESTMENT SCHEMAS
// ==========================================

export const createInvestmentSchema = z.object({
  offeringId: uuidSchema,
  amount: moneySchema,
  paymentMethod: z.enum([
    'credit_card', 'debit_card', 'bank_transfer',
    'ach', 'wire', 'usdc', 'usdt', 'eth', 'crypto_other',
  ]),
  deliveryWallet: ethereumAddressSchema.optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' }),
  }),
  acknowledgements: z.object({
    riskDisclosure: z.literal(true),
    investorSuitability: z.literal(true),
    lockUpPeriod: z.literal(true),
  }),
  referralCode: z.string().optional(),
});

// ==========================================
// DISTRIBUTION SCHEMAS
// ==========================================

export const createDistributionSchema = z.object({
  assetId: uuidSchema,
  tokenId: uuidSchema,
  type: z.enum(['dividend', 'rental_income', 'interest', 'capital_return', 'special']),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  recordDate: z.coerce.date(),
  totalAmount: moneySchema,
  currency: z.string(),
  paymentMethod: z.enum(['stablecoin', 'fiat', 'crypto']),
  paymentCurrency: z.string(),
  description: z.string().optional(),
});

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type KycPersonalInfoInput = z.infer<typeof kycPersonalInfoSchema>;
export type CreateRealEstateAssetInput = z.infer<typeof createRealEstateAssetSchema>;
export type CreateEquityAssetInput = z.infer<typeof createEquityAssetSchema>;
export type TokenDeploymentConfigInput = z.infer<typeof tokenDeploymentConfigSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;
export type CreateDistributionInput = z.infer<typeof createDistributionSchema>;
