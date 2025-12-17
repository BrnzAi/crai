/**
 * Platform constants for CryptoAI.ai
 */

// ==========================================
// PLATFORM CONFIGURATION
// ==========================================

export const PLATFORM_NAME = 'CryptoAI.ai';
export const PLATFORM_VERSION = '1.0.0';

// ==========================================
// BLOCKCHAIN CONFIGURATION
// ==========================================

export const SUPPORTED_CHAINS = {
  ETHEREUM_MAINNET: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  POLYGON_MAINNET: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
  ARBITRUM_ONE: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/',
    blockExplorer: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  },
  // Testnets
  SEPOLIA: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
  },
  POLYGON_AMOY: {
    chainId: 80002,
    name: 'Polygon Amoy Testnet',
    rpcUrl: 'https://polygon-amoy.g.alchemy.com/v2/',
    blockExplorer: 'https://amoy.polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  },
} as const;

// ==========================================
// TOKEN STANDARDS
// ==========================================

export const TOKEN_DECIMALS = 18;
export const DEFAULT_TOKEN_STANDARD = 'ERC3643';

// ERC-3643 Claim Topics
export const CLAIM_TOPICS = {
  KYC: 1,
  AML: 2,
  ACCREDITATION: 3,
  COUNTRY: 4,
  INVESTOR_TYPE: 5,
} as const;

// ==========================================
// KYC/AML CONSTANTS
// ==========================================

export const KYC_EXPIRY_DAYS = 365; // 1 year
export const ACCREDITATION_EXPIRY_DAYS = 90; // 3 months for US

export const SUPPORTED_ID_DOCUMENTS = [
  'passport',
  'national_id',
  'emirates_id',
  'driving_license',
  'residence_permit',
] as const;

export const HIGH_RISK_COUNTRIES = [
  'KP', // North Korea
  'IR', // Iran
  'SY', // Syria
  'CU', // Cuba
  'RU', // Russia (certain restrictions)
] as const;

export const FATF_GREY_LIST = [
  // Updated as per FATF
] as const;

// ==========================================
// UAE SPECIFIC CONSTANTS
// ==========================================

export const UAE_EMIRATES = {
  DUBAI: { code: 'DXB', nameEn: 'Dubai', nameAr: 'دبي' },
  ABU_DHABI: { code: 'AUH', nameEn: 'Abu Dhabi', nameAr: 'أبوظبي' },
  SHARJAH: { code: 'SHJ', nameEn: 'Sharjah', nameAr: 'الشارقة' },
  AJMAN: { code: 'AJM', nameEn: 'Ajman', nameAr: 'عجمان' },
  RAS_AL_KHAIMAH: { code: 'RAK', nameEn: 'Ras Al Khaimah', nameAr: 'رأس الخيمة' },
  UMM_AL_QUWAIN: { code: 'UAQ', nameEn: 'Umm Al Quwain', nameAr: 'أم القيوين' },
  FUJAIRAH: { code: 'FUJ', nameEn: 'Fujairah', nameAr: 'الفجيرة' },
} as const;

export const DUBAI_FREEHOLD_AREAS = [
  'Downtown Dubai',
  'Dubai Marina',
  'Palm Jumeirah',
  'Jumeirah Beach Residence',
  'Business Bay',
  'DIFC',
  'Jumeirah Lake Towers',
  'Dubai Hills Estate',
  'Arabian Ranches',
  'Emirates Hills',
  'The Springs',
  'Meadows',
  'Dubai Sports City',
  'Motor City',
  'Dubai Silicon Oasis',
  'International City',
  'Discovery Gardens',
  'Jumeirah Village Circle',
  'Jumeirah Village Triangle',
  'Dubai South',
] as const;

// DLD Transfer Fee
export const DLD_TRANSFER_FEE_RATE = 0.04; // 4%

// ==========================================
// REGULATORY JURISDICTIONS
// ==========================================

export const REGULATORY_REQUIREMENTS = {
  VARA: {
    name: 'Virtual Assets Regulatory Authority',
    jurisdiction: 'Dubai',
    website: 'https://vara.ae',
    requirements: {
      minCapitalBrokerDealer: 500000, // AED
      minCapitalExchange: 5000000, // AED
      minCapitalIssuance: 1500000, // AED
      annualAuditRequired: true,
      monthlyReporting: true,
    },
  },
  DFSA: {
    name: 'Dubai Financial Services Authority',
    jurisdiction: 'DIFC',
    website: 'https://dfsa.ae',
    requirements: {
      sandboxAvailable: true,
      sandboxDuration: '6-12 months',
    },
  },
  ADGM: {
    name: 'Financial Services Regulatory Authority',
    jurisdiction: 'Abu Dhabi Global Market',
    website: 'https://adgm.com',
    requirements: {
      digitalSecuritiesFramework: true,
      prospectusRequired: true,
    },
  },
} as const;

// ==========================================
// PLATFORM FEES
// ==========================================

export const PLATFORM_FEES = {
  // Tokenization fees
  TOKENIZATION_FEE_RATE: 0.015, // 1.5%
  MIN_TOKENIZATION_FEE: 5000, // USD

  // Trading fees
  TRADING_FEE_MAKER: 0.001, // 0.1%
  TRADING_FEE_TAKER: 0.002, // 0.2%

  // Management fees
  ANNUAL_MANAGEMENT_FEE: 0.002, // 0.2% annually

  // Withdrawal fees
  CRYPTO_WITHDRAWAL_FEE: 0, // Gas only
  FIAT_WITHDRAWAL_FEE: 25, // USD flat
} as const;

// ==========================================
// INVESTMENT LIMITS
// ==========================================

export const INVESTMENT_LIMITS = {
  RETAIL: {
    minInvestment: 500, // USD
    maxPerOffering: 10000, // USD
    maxAnnual: 50000, // USD
  },
  ACCREDITED: {
    minInvestment: 1000, // USD
    maxPerOffering: null, // No limit
    maxAnnual: null, // No limit
  },
  INSTITUTIONAL: {
    minInvestment: 100000, // USD
    maxPerOffering: null,
    maxAnnual: null,
  },
} as const;

// ==========================================
// TIME CONSTANTS
// ==========================================

export const COOLING_OFF_PERIOD_DAYS = 14; // For certain offerings
export const LOCK_UP_PERIOD_DEFAULT_DAYS = 365; // 1 year default
export const SESSION_EXPIRY_HOURS = 24;
export const REFRESH_TOKEN_EXPIRY_DAYS = 30;

// ==========================================
// PAGINATION
// ==========================================

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ==========================================
// FILE UPLOAD
// ==========================================

export const MAX_FILE_SIZE_MB = 50;
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

// ==========================================
// API RATE LIMITS
// ==========================================

export const RATE_LIMITS = {
  DEFAULT: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
  },
  AUTH: {
    windowMs: 900000, // 15 minutes
    maxRequests: 5,
  },
  KYC: {
    windowMs: 3600000, // 1 hour
    maxRequests: 10,
  },
  TRADING: {
    windowMs: 1000, // 1 second
    maxRequests: 10,
  },
} as const;
