# ShopCart Microservices

## Overview

This repository contains the decomposed microservices architecture for ShopCart, migrating from a legacy Java monolith to independent TypeScript/Node.js services on AWS.

## Services

### 1. Product Catalog Service
- **Purpose:** Manages product inventory, retrieval, and stock operations
- **Database:** DynamoDB `products` table
- **Endpoints:** `/api/v1/products`, `/api/v1/products/{id}`, `/api/v1/products/{id}/stock`
- **Port:** 3000

### 2. Cart Service
- **Purpose:** Manages user shopping carts
- **Database:** DynamoDB `carts` table
- **Endpoints:** `/api/v1/cart`, `/api/v1/cart/items`, `/api/v1/cart/items/{productId}`
- **Port:** 3000

## Technology Stack

- **Runtime:** Node.js 18+ LTS
- **Language:** TypeScript 5.x
- **Framework:** Express.js 4.18+
- **Database:** Amazon DynamoDB
- **Authentication:** AWS Cognito (JWT)
- **Secrets:** AWS Secrets Manager
- **Deployment:** AWS EKS (Kubernetes)
- **Testing:** Jest 29+

## Quick Start

### Prerequisites

- Node.js 18+ installed
- AWS CLI configured
- Docker installed
- kubectl configured for EKS cluster

### Local Development

#### Product Catalog Service

```bash
cd services/product-catalog-service
npm install
cp .env.example .env
# Edit .env with your AWS credentials and DynamoDB table names
npm run dev
```

#### Cart Service

```bash
cd services/cart-service
npm install
cp .env.example .env
# Edit .env with your AWS credentials and DynamoDB table names
npm run dev
```

### Running Tests

```bash
# Product Catalog Service
cd services/product-catalog-service
npm test
npm run test:coverage

# Cart Service
cd services/cart-service
npm test
npm run test:coverage
```

### Building Docker Images

```bash
# Product Catalog Service
cd services/product-catalog-service
docker build -t product-catalog-service:latest .

# Cart Service
cd services/cart-service
docker build -t cart-service:latest .
```

## Infrastructure Setup

### 1. Create DynamoDB Tables

```bash
cd infrastructure/dynamodb
chmod +x create-tables.sh
./create-tables.sh
```

### 2. Configure AWS Secrets Manager

```bash
cd infrastructure/secrets
chmod +x create-secrets.sh
./create-secrets.sh
```

### 3. Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f infrastructure/kubernetes/namespace.yaml

# Deploy Product Catalog Service
kubectl apply -f infrastructure/kubernetes/product-catalog/

# Deploy Cart Service
kubectl apply -f infrastructure/kubernetes/cart-service/
```

## API Documentation

OpenAPI 3.0 specifications are available in the `openapi/` directory:

- Product Catalog Service: `openapi/product-catalog-service.yaml`
- Cart Service: `openapi/cart-service.yaml`

View interactive documentation:

```bash
npx @redocly/cli preview-docs openapi/product-catalog-service.yaml
npx @redocly/cli preview-docs openapi/cart-service.yaml
```

## Migration from Legacy Monolith

### Key Changes

1. **Database:** MySQL → DynamoDB
   - INT AUTO_INCREMENT → UUID strings
   - Relational schema → Single-table design
   - Stored procedures → Application-layer conditional writes

2. **Authentication:** Session-based → JWT (AWS Cognito)
   - Anonymous session_id → OAuth userId
   - Server-side sessions → Stateless tokens

3. **Secrets Management:** Hardcoded → AWS Secrets Manager
   - DatabaseConfig.java credentials → Secrets Manager
   - KMS encryption at rest

4. **Error Handling:** Custom JSON → RFC 7807 Problem Details

See `docs/migration-guide.md` for detailed migration instructions.

## Architecture

```
┌─────────────────┐
│  API Gateway    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Product │ │  Cart  │
│Catalog │ │Service │
│Service │ │        │
└───┬────┘ └───┬────┘
    │          │
    ▼          ▼
┌────────┐ ┌────────┐
│Products│ │ Carts  │
│  Table │ │ Table  │
│(DynamoDB)│(DynamoDB)
└────────┘ └────────┘
```

See `docs/architecture.md` for detailed architecture documentation.

## Monitoring & Observability

- **Logs:** CloudWatch Logs (JSON structured)
- **Metrics:** CloudWatch custom metrics
- **Health Checks:** `/health` endpoint on each service
- **Tracing:** OpenTelemetry compatible (configure via environment)

## Security

- JWT authentication via AWS Cognito
- IAM roles for service accounts (IRSA)
- Secrets stored in AWS Secrets Manager with KMS encryption
- No hardcoded credentials in source code
- HTTPS only in production

## Contributing

1. Create feature branch from `main`
2. Follow naming convention: `feature/<story-id>-<description>`
3. Write tests (≥80% coverage required)
4. Run linter: `npm run lint`
5. Submit pull request

## License

Proprietary - ShopCart Engineering Team

## Support

For questions or issues:
- Email: team@shopcart.com
- Documentation: See `docs/` directory
