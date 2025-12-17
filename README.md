# CryptoAI.ai Platform

AI-Powered Tokenization Platform for Equity & Real Estate

## Overview

CryptoAI.ai is an AI-powered tokenization platform enabling fractional ownership of equity/shares and real estate assets, with a primary focus on the Dubai/UAE market.

## Architecture

```
cryptoai-platform/
├── apps/                    # Frontend applications
│   ├── web/                 # Main platform (Next.js)
│   ├── admin/               # Admin console
│   └── docs/                # Documentation site
├── packages/                # Shared packages
│   ├── core/                # Shared types and utilities
│   ├── ui/                  # Shared UI components
│   ├── database/            # Database schema (Prisma)
│   ├── contracts/           # Smart contracts (Solidity)
│   ├── ai-engine/           # AI processing services
│   └── blockchain/          # Blockchain utilities
├── services/                # Backend microservices
│   ├── api/                 # Main API gateway
│   ├── auth/                # Authentication service
│   ├── kyc/                 # KYC/AML service
│   ├── tokenization/        # Token management
│   └── trading/             # Trading engine
└── infrastructure/          # Deployment configs
```

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS
- **Backend**: Node.js, Express/Fastify, TypeScript
- **Database**: PostgreSQL, Prisma ORM, Redis
- **Blockchain**: Solidity, Hardhat, Ethers.js
- **AI**: OpenAI, Anthropic Claude, Custom ML models
- **Infrastructure**: Docker, Kubernetes, AWS/GCP

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Clone the repository
git clone https://github.com/cryptoai/platform.git
cd platform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Generate database client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

## Development

```bash
# Run all services in development
npm run dev

# Run tests
npm run test

# Run linting
npm run lint

# Type checking
npm run type-check

# Build all packages
npm run build
```

## Smart Contracts

```bash
# Compile contracts
npm run contracts:compile

# Run contract tests
npm run contracts:test

# Deploy contracts
npm run contracts:deploy
```

## License

Proprietary - All rights reserved
