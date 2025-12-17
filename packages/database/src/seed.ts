import { PrismaClient, UserRole, UserStatus, AssetCategory, AssetStatus } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPasswordHash = await hash('Admin123!@#', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cryptoai.ai' },
    update: {},
    create: {
      email: 'admin@cryptoai.ai',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          firstName: 'Platform',
          lastName: 'Admin',
          displayName: 'Admin',
          countryOfResidence: 'AE',
          language: 'en',
        },
      },
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create demo issuer
  const issuerPasswordHash = await hash('Issuer123!@#', 12);
  const issuer = await prisma.user.upsert({
    where: { email: 'issuer@demo.cryptoai.ai' },
    update: {},
    create: {
      email: 'issuer@demo.cryptoai.ai',
      passwordHash: issuerPasswordHash,
      role: UserRole.ISSUER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          firstName: 'Ahmad',
          lastName: 'Al-Rashid',
          displayName: 'Ahmad Al-Rashid',
          countryOfResidence: 'AE',
          language: 'en',
        },
      },
      issuerProfile: {
        create: {
          companyName: 'Al-Rashid Development Group',
          companyType: 'llc',
          registrationNumber: 'DXB-12345678',
          jurisdiction: 'VARA',
          website: 'https://alrashid-dev.ae',
          description: 'Premium real estate development company in Dubai',
          businessAddressLine1: 'Tower A, Level 15',
          businessCity: 'Dubai',
          businessCountry: 'AE',
          contactName: 'Ahmad Al-Rashid',
          contactEmail: 'ahmad@alrashid-dev.ae',
          contactPhone: '+971501234567',
          contactTitle: 'CEO',
          isVerified: true,
          verifiedAt: new Date(),
        },
      },
    },
  });
  console.log('✅ Created demo issuer:', issuer.email);

  // Create demo investor
  const investorPasswordHash = await hash('Investor123!@#', 12);
  const investor = await prisma.user.upsert({
    where: { email: 'investor@demo.cryptoai.ai' },
    update: {},
    create: {
      email: 'investor@demo.cryptoai.ai',
      passwordHash: investorPasswordHash,
      role: UserRole.INVESTOR,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          firstName: 'Sarah',
          lastName: 'Chen',
          displayName: 'Sarah Chen',
          countryOfResidence: 'SG',
          language: 'en',
        },
      },
      investorProfile: {
        create: {
          classification: 'ACCREDITED',
          isAccredited: true,
          accreditationMethod: 'net_worth',
          accreditationVerifiedAt: new Date(),
          accreditationExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          riskTolerance: 'moderate',
          investmentHorizon: 'medium_term',
          investmentExperience: 'moderate',
          taxResidency: 'SG',
        },
      },
    },
  });
  console.log('✅ Created demo investor:', investor.email);

  // Get issuer profile for asset creation
  const issuerProfile = await prisma.issuerProfile.findUnique({
    where: { userId: issuer.id },
  });

  if (issuerProfile) {
    // Create demo real estate asset
    const demoAsset = await prisma.asset.upsert({
      where: { id: 'demo-asset-1' },
      update: {},
      create: {
        id: 'demo-asset-1',
        issuerId: issuerProfile.id,
        category: AssetCategory.REAL_ESTATE,
        status: AssetStatus.ACTIVE,
        name: 'Marina Heights Tower - Unit 1501',
        description: `
Premium commercial office space in the heart of Dubai Marina.
This fully-fitted Grade A office offers stunning views of the marina
and is currently leased to a Fortune 500 technology company on a 5-year term.

Key Features:
- 5,000 sq ft of premium office space
- Floor-to-ceiling windows with marina views
- High-end finishes throughout
- 24/7 security and concierge services
- Direct access to Marina Walk
        `.trim(),
        shortDescription: 'Premium commercial office in Dubai Marina with stable rental income',
        jurisdiction: 'VARA',
        totalValue: 10000000, // AED 10M
        currency: 'AED',
        metadata: {
          featured: true,
          tags: ['commercial', 'office', 'dubai-marina', 'premium'],
        },
        publishedAt: new Date(),
        realEstateDetails: {
          create: {
            propertyType: 'office',
            ownershipType: 'freehold',
            titleDeedNumber: 'DM-2024-001501',
            buildingName: 'Marina Heights Tower',
            unitNumber: '1501',
            totalArea: 5000,
            usableArea: 4800,
            floors: 1,
            parkingSpaces: 5,
            yearBuilt: 2020,
            amenities: ['24/7 Security', 'Concierge', 'Gym', 'Meeting Rooms', 'Parking'],
            emirate: 'dubai',
            area: 'Dubai Marina',
            subArea: 'Marina Walk',
            latitude: 25.0772,
            longitude: 55.1339,
            freeholdZone: true,
            purchasePrice: 9500000,
            currentValuation: 10000000,
            lastValuationDate: new Date(),
            annualRentalIncome: 750000,
            occupancyRate: 100,
            operatingExpenses: 75000,
            netOperatingIncome: 675000,
            capRate: 6.75,
            projectedYield: 7.5,
            serviceCharges: 25000,
          },
        },
      },
    });
    console.log('✅ Created demo real estate asset:', demoAsset.name);

    // Create demo token for the asset
    const demoToken = await prisma.token.upsert({
      where: { assetId: demoAsset.id },
      update: {},
      create: {
        assetId: demoAsset.id,
        name: 'Marina Heights Token',
        symbol: 'MHT',
        decimals: 18,
        standard: 'ERC3643',
        status: 'ACTIVE',
        totalSupply: '10000',
        circulatingSupply: '2500',
        initialPrice: 1000,
        currentPrice: 1000,
        whitelistEnabled: true,
        features: {
          mintable: false,
          burnable: false,
          pausable: true,
          freezable: true,
          votingEnabled: true,
          dividendsEnabled: true,
        },
        metadata: {
          description: 'Security token representing fractional ownership in Marina Heights Tower Unit 1501',
        },
      },
    });
    console.log('✅ Created demo token:', demoToken.symbol);

    // Create demo offering
    const demoOffering = await prisma.offering.upsert({
      where: { assetId: demoAsset.id },
      update: {},
      create: {
        assetId: demoAsset.id,
        status: 'OPEN',
        name: 'Marina Heights Tower - Primary Offering',
        description: 'Invest in premium Dubai Marina commercial real estate',
        targetRaise: 10000000,
        minimumRaise: 5000000,
        tokenPrice: 1000,
        totalTokens: '10000',
        tokensAvailable: '7500',
        tokensSold: '2500',
        minimumInvestment: 1000,
        maximumInvestment: 500000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        allowedJurisdictions: ['AE', 'SG', 'GB', 'US'],
        excludedJurisdictions: ['KP', 'IR', 'SY', 'CU'],
        requireAccreditation: false,
        investorTypes: ['retail', 'accredited', 'institutional'],
        distributionFrequency: 'monthly',
        distributionPaymentMethod: 'stablecoin',
        investorCount: 25,
        amountRaised: 2500000,
      },
    });
    console.log('✅ Created demo offering:', demoOffering.name);

    // Create demo market
    await prisma.market.upsert({
      where: { tokenId: demoToken.id },
      update: {},
      create: {
        tokenId: demoToken.id,
        symbol: 'MHT/USDC',
        baseToken: 'MHT',
        quoteToken: 'USDC',
        status: 'active',
        minOrderSize: '1',
        maxOrderSize: '1000',
        tickSize: '0.01',
        lotSize: '1',
        makerFee: 0.001,
        takerFee: 0.002,
        requiredKycLevel: 'standard',
        allowedJurisdictions: ['AE', 'SG', 'GB', 'US'],
        blockedJurisdictions: ['KP', 'IR', 'SY', 'CU'],
        accreditationRequired: false,
        lastPrice: 1005,
        change24h: 0.5,
        volume24h: '150',
        trades24h: 12,
        statsUpdatedAt: new Date(),
      },
    });
    console.log('✅ Created demo market: MHT/USDC');
  }

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
