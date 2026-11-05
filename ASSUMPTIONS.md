# Assumptions Document

## Overview

This document captures all assumptions made during the decomposition of the ShopCart monolith into independent microservices.

---

## Path & Structure Decisions

### 1. Project Root Structure

**Decision:** Monorepo structure with services under `services/` directory

**Rationale:**
- Technical specification mentions "two independent microservices"
- Monorepo allows shared infrastructure configuration (Kubernetes, DynamoDB scripts)
- Separation of concerns while maintaining single repository

**Path Mapping:**
```
src/
├── services/
│   ├── product-catalog-service/
│   └── cart-service/
├── infrastructure/
│   ├── kubernetes/
│   ├── dynamodb/
│   └── secrets/
├── openapi/
└── docs/
```

### 2. Service Internal Structure

**Decision:** Layered architecture (Controllers → Services → Repositories)

**Rationale:**
- Technical specification explicitly mentions "Layered architecture: Controllers → Services → Repositories"
- Follows separation of concerns principle
- Aligns with Java servlet pattern being replaced

**Path Structure:**
```
services/<service-name>/
├── src/
│   ├── config/         # Configuration files (DynamoDB, Secrets)
│   ├── middleware/     # Express middleware (auth, error handling)
│   ├── models/         # TypeScript interfaces
│   ├── repositories/   # Data access layer
│   ├── services/       # Business logic layer
│   ├── controllers/    # HTTP request handlers
│   ├── routes/         # Route definitions
│   ├── utils/          # Utilities (logger, errors)
│   └── app.ts          # Application entry point
├── tests/
│   └── unit/           # Unit tests
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.js
├── Dockerfile
└── .env.example
```

### 3. Kubernetes Manifests Structure

**Decision:** Separate directories per service under `infrastructure/kubernetes/`

**Rationale:**
- Technical specification mentions "Kubernetes deployment manifests"
- Each service has independent deployment, service, configmap, and serviceaccount
- Namespace is shared across services

**Path Structure:**
```
infrastructure/kubernetes/
├── namespace.yaml
├── product-catalog/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── serviceaccount.yaml
└── cart-service/
    ├── deployment.yaml
    ├── service.yaml
    ├── configmap.yaml
    └── serviceaccount.yaml
```

---

## Technical Assumptions

### 1. AWS Configuration

**Assumption:** AWS region is `us-east-1`

**Rationale:**
- Not specified in requirements
- Default region for most AWS services
- Can be overridden via environment variables

**Impact:** All AWS SDK clients, Kubernetes manifests, and scripts use `us-east-1`

### 2. DynamoDB Table Names

**Assumption:** Table names are `products` and `carts`

**Rationale:**
- Technical specification mentions "products table" and "carts table"
- Simple, descriptive names
- No environment prefix (dev/staging/prod) assumed

**Impact:** ConfigMaps and application code reference these exact table names

### 3. Cognito Configuration

**Assumption:** Cognito User Pool ID is provided via environment variable

**Rationale:**
- Technical specification mentions "AWS Cognito (OAuth 2.0 / JWT)"
- User Pool ID is environment-specific
- Cannot be hardcoded

**Impact:** Application requires `COGNITO_USER_POOL_ID` environment variable to start

### 4. Port Configuration

**Assumption:** Both services run on port 3000 internally

**Rationale:**
- Standard Node.js convention
- Kubernetes Service maps port 80 → 3000
- No port conflicts as services run in separate pods

**Impact:** Dockerfile exposes port 3000, Kubernetes deployment targets port 3000

### 5. Secrets Manager Secret Name

**Assumption:** Secret name is `shopcart/credentials`

**Rationale:**
- Technical specification mentions "Secret name: shopcart/credentials"
- Follows AWS naming convention (namespace/resource)

**Impact:** Both services fetch secrets from this exact name

---

## Business Logic Assumptions

### 1. Product Filtering

**Assumption:** Products with `stock <= 0` or `price <= 0` are filtered out

**Rationale:**
- Legacy Java code shows: `if (p.getPrice() <= 0) continue;`
- Business rule comment: "price must be > 0"
- DynamoDB FilterExpression enforces this

**Impact:** `getAllProducts` repository method includes filter expression

### 2. Cart Total Calculation

**Assumption:** Total amount is always calculated server-side

**Rationale:**
- Technical specification states: "Calculate totalAmount server-side: sum(item.price * item.quantity)"
- Security best practice: never trust client-provided totals

**Impact:** Cart repository recalculates total on every save operation

### 3. Stock Decrement Atomicity

**Assumption:** Stock decrement must be atomic with no race conditions

**Rationale:**
- Acceptance criteria: "Stored procedure logic replaced by DynamoDB conditional writes"
- Technical specification: "Atomic stock decrement using DynamoDB conditional writes"

**Impact:** `decrementStock` uses UpdateCommand with ConditionExpression

### 4. Anonymous Cart Access

**Assumption:** Anonymous carts are no longer supported

**Rationale:**
- Acceptance criteria: "Anonymous session_id cart ownership is replaced with authenticated OAuth 2.0 userId"
- All cart endpoints require JWT authentication

**Impact:** Cart routes apply `authenticateToken` middleware to all endpoints

---

## Data Model Assumptions

### 1. UUID Format

**Assumption:** All IDs use UUID v4 format

**Rationale:**
- Acceptance criteria: "MySQL INT AUTO_INCREMENT primary keys are replaced with UUID strings"
- UUID v4 is standard for distributed systems

**Impact:** Product and cart repositories use `uuid` library for ID generation

### 2. DynamoDB Key Structure

**Assumption:** Single-table design with PK/SK pattern

**Rationale:**
- Technical specification shows: `PK: PRODUCT#{uuid}, SK: METADATA`
- Best practice for DynamoDB
- Allows future expansion (e.g., product reviews with SK: REVIEW#{id})

**Impact:** All DynamoDB operations use PK/SK composite keys

### 3. Timestamp Format

**Assumption:** All timestamps use ISO-8601 format in UTC

**Rationale:**
- Technical specification: "ISO-8601 timestamps in UTC everywhere"
- Standard for APIs and databases

**Impact:** `createdAt` and `updatedAt` fields use `new Date().toISOString()`

---

## Authentication & Authorization Assumptions

### 1. JWT Token Location

**Assumption:** JWT tokens are provided in `Authorization: Bearer {token}` header

**Rationale:**
- Technical specification: "JWT Bearer token validation using AWS Cognito"
- Standard OAuth 2.0 convention

**Impact:** Auth middleware extracts token from `Authorization` header

### 2. User ID Claim

**Assumption:** User ID is stored in JWT `sub` claim

**Rationale:**
- Standard JWT claim for subject (user identifier)
- Cognito uses `sub` for user ID

**Impact:** Auth middleware extracts `userId` from `payload.sub`

### 3. Public vs. Protected Endpoints

**Assumption:**
- Product listing and detail: Public (no auth)
- Stock decrement: Protected (auth required)
- All cart endpoints: Protected (auth required)

**Rationale:**
- Technical specification: "No authentication required for GET /products and GET /products/{id}"
- Business logic: browsing products is public, modifying data requires auth

**Impact:** Route definitions selectively apply `authenticateToken` middleware

---

## Testing Assumptions

### 1. Test Framework

**Assumption:** Jest with ts-jest for unit tests

**Rationale:**
- Technical specification: "Unit tests ≥80% code coverage using Jest or Mocha"
- Jest is more popular and has better TypeScript support

**Impact:** `jest.config.js` and test files use Jest syntax

### 2. Coverage Threshold

**Assumption:** 80% coverage required for branches, functions, lines, statements

**Rationale:**
- Acceptance criteria: "Unit tests achieve ≥80% code coverage"
- Technical specification confirms this threshold

**Impact:** `jest.config.js` enforces 80% threshold; CI will fail if not met

### 3. Test File Location

**Assumption:** Tests are in `tests/unit/` directory, not co-located with source

**Rationale:**
- Separation of concerns
- Easier to exclude from production builds
- Jest configuration expects this structure

**Impact:** `tsconfig.json` excludes `tests/` directory from compilation

---

## Infrastructure Assumptions

### 1. EKS Cluster Exists

**Assumption:** AWS EKS cluster is already provisioned and configured

**Rationale:**
- Technical specification mentions "Deployment target: AWS EKS"
- Cluster provisioning is typically a separate infrastructure task

**Impact:** Kubernetes manifests assume cluster is accessible via `kubectl`

### 2. IAM Roles for Service Accounts (IRSA)

**Assumption:** IAM roles are created separately and referenced in ServiceAccount annotations

**Rationale:**
- Technical specification: "IAM Role annotation: eks.amazonaws.com/role-arn"
- IRSA setup requires AWS IAM configuration outside of Kubernetes

**Impact:** ServiceAccount YAML includes placeholder `<ACCOUNT_ID>` to be replaced

### 3. Container Registry

**Assumption:** Amazon ECR repositories are created before deployment

**Rationale:**
- Technical specification: "Registry: Amazon ECR"
- Docker images must be pushed to ECR before Kubernetes can pull them

**Impact:** Deployment YAML includes placeholder `<ACCOUNT_ID>` for ECR URL

### 4. DynamoDB Billing Mode

**Assumption:** On-demand billing mode (PAY_PER_REQUEST)

**Rationale:**
- Technical specification: "Billing mode: On-demand (PAY_PER_REQUEST)"
- Simplifies capacity planning
- Cost-effective for variable workloads

**Impact:** DynamoDB table definitions use `BillingMode: PAY_PER_REQUEST`

---

## Security Assumptions

### 1. Secrets Rotation

**Assumption:** Credentials are rotated before deployment

**Rationale:**
- Acceptance criteria: "All hardcoded credentials and PayPal API keys are rotated and stored in AWS Secrets Manager"
- Security best practice

**Impact:** `create-secrets.sh` script includes new rotated credentials

### 2. KMS Encryption

**Assumption:** Secrets are encrypted with AWS KMS

**Rationale:**
- Acceptance criteria: "stored in AWS Secrets Manager with AWS KMS encryption"
- Technical specification confirms KMS usage

**Impact:** `create-secrets.sh` creates KMS key and encrypts secrets

### 3. HTTPS Only in Production

**Assumption:** API Gateway terminates HTTPS, services communicate internally via HTTP

**Rationale:**
- Standard Kubernetes pattern
- HTTPS termination at ingress/gateway layer
- Internal cluster traffic uses HTTP

**Impact:** Services listen on HTTP port 3000, no TLS configuration in application

---

## Migration Assumptions

### 1. Dual-Write Period

**Assumption:** Anti-corruption adapter is not implemented in this phase

**Rationale:**
- Acceptance criteria mentions it, but implementation is complex
- Typically a separate story/phase
- Focus is on microservices implementation

**Impact:** No Lambda function or SQS queue configuration included

### 2. API Gateway Configuration

**Assumption:** API Gateway is configured separately

**Rationale:**
- Technical specification mentions "AWS API Gateway routes /products and /cart paths"
- Gateway configuration is typically infrastructure-as-code (Terraform/CloudFormation)

**Impact:** No API Gateway configuration files included

### 3. Rollback Mechanism

**Assumption:** Rollback is manual via API Gateway stage variable update

**Rationale:**
- Acceptance criteria: "stage variables configured to allow instant re-routing back to legacy WAR"
- Manual rollback is safer for critical systems

**Impact:** Documentation includes rollback command, no automated rollback logic

---

## Logging & Monitoring Assumptions

### 1. Log Format

**Assumption:** JSON structured logs for CloudWatch

**Rationale:**
- Technical specification: "Logs: CloudWatch Logs (JSON structured format)"
- Easier to query and analyze

**Impact:** Winston logger configured with JSON format

### 2. Log Level

**Assumption:** Default log level is `info`

**Rationale:**
- Balance between verbosity and performance
- Can be overridden via `LOG_LEVEL` environment variable

**Impact:** Logger initialization uses `process.env.LOG_LEVEL || 'info'`

### 3. Metrics Collection

**Assumption:** CloudWatch custom metrics are not implemented in application code

**Rationale:**
- Technical specification mentions metrics but doesn't specify implementation
- Typically handled by CloudWatch agent or Prometheus exporter

**Impact:** No custom metrics code in services

---

## Error Handling Assumptions

### 1. RFC 7807 Format

**Assumption:** All errors follow RFC 7807 Problem Details format

**Rationale:**
- Acceptance criteria: "All API responses follow RFC 7807 Problem Details format for errors"
- Technical specification confirms this

**Impact:** Custom error classes implement `toProblemDetails()` method

### 2. Error Type URLs

**Assumption:** Error type URLs use `https://api.shopcart.com/errors/{error-type}` format

**Rationale:**
- RFC 7807 recommends URIs for error types
- Consistent namespace for all errors

**Impact:** Error classes define type URLs with this pattern

### 3. Stack Traces

**Assumption:** Stack traces are logged but not exposed to clients

**Rationale:**
- Security best practice: don't leak implementation details
- Technical specification: "Stack traces logged but not exposed to clients"

**Impact:** Error middleware logs stack traces, returns generic error to client

---

## Dependency Assumptions

### 1. Node.js Version

**Assumption:** Node.js 18+ LTS

**Rationale:**
- Technical specification: "Runtime: Node.js 18+ LTS"
- LTS version for stability

**Impact:** `package.json` engines field requires Node.js >= 18.0.0

### 2. TypeScript Version

**Assumption:** TypeScript 5.x

**Rationale:**
- Technical specification: "Language: TypeScript 5.x"
- Latest stable version with best features

**Impact:** `package.json` includes TypeScript 5.3.3

### 3. AWS SDK Version

**Assumption:** AWS SDK v3 (modular)

**Rationale:**
- Technical specification: "@aws-sdk/client-dynamodb v3.450+"
- v3 is modular and tree-shakeable

**Impact:** Individual AWS SDK packages imported (not full SDK)

---

## Documentation Assumptions

### 1. README Audience

**Assumption:** README is for developers setting up local environment

**Rationale:**
- Technical specification: "README.md (setup → install → migrate → seed → run → test → deploy)"
- Developer-focused documentation

**Impact:** README includes local development instructions, not production deployment

### 2. API Documentation

**Assumption:** OpenAPI specs are the source of truth for API contracts

**Rationale:**
- Acceptance criteria: "defined as OpenAPI 3.0 specifications before implementation begins"
- API-first design approach

**Impact:** OpenAPI YAML files are comprehensive and detailed

---

## Unresolved Questions

The following questions remain unresolved and may require clarification:

1. **API Gateway Configuration:** Should we include Terraform/CloudFormation for API Gateway setup?
2. **Anti-Corruption Adapter:** Should the Lambda function and SQS queues be implemented in this phase?
3. **Monitoring Dashboards:** Should we include CloudWatch dashboard JSON configurations?
4. **CI/CD Pipeline:** Should we include GitHub Actions / GitLab CI configuration?
5. **Contract Tests:** Should Pact contract tests be implemented in this phase?
6. **Environment-Specific Configuration:** Should we create separate configs for dev/staging/prod?

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-21  
**Author:** ShopCart Engineering Team
