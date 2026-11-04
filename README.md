# ShopCart Microservices - Product Catalog & Cart Services

## Overview

This repository contains the decomposed microservices architecture for the ShopCart application, migrating from a legacy Java/Spring monolithic application to independently deployable TypeScript/Node.js microservices on AWS EKS.

## Architecture

### Services

1. **Product Catalog Service** (Port 3000)
   - Product CRUD operations
   - Atomic stock management with DynamoDB conditional writes
   - Replaces legacy `ProductServlet` and `ProductDAO`

2. **Cart Service** (Port 3001)
   - Shopping cart operations
   - OAuth userId-based carts (replaces session_id)
   - Inter-service communication with Product Catalog Service
   - Compensating transactions for stock management
   - Replaces legacy `CartServlet` and `CartDAO`

### Technology Stack

- **Runtime**: Node.js 20.x LTS
- **Language**: TypeScript 5.3.x
- **Framework**: Express.js 4.18.x
- **Database**: AWS DynamoDB
- **Authentication**: AWS Cognito (OAuth 2.0)
- **Secrets Management**: AWS Secrets Manager
- **Container Orchestration**: AWS EKS (Kubernetes)
- **API Gateway**: AWS API Gateway
- **Observability**: AWS X-Ray, CloudWatch

## Project Structure

```
src/
├── services/
│   ├── product-catalog-service/
│   │   ├── src/
│   │   │   ├── config/          # Configuration and AWS clients
│   │   │   ├── controllers/     # HTTP request handlers
│   │   │   ├── services/        # Business logic
│   │   │   ├── repositories/    # DynamoDB data access
│   │   │   ├── models/          # TypeScript interfaces
│   │   │   ├── middleware/      # Error handling, validation
│   │   │   ├── routes/          # Express routes
│   │   │   ├── utils/           # Logger, helpers
│   │   │   ├── app.ts           # Express app setup
│   │   │   └── server.ts        # Server entry point
│   │   ├── tests/               # Unit and integration tests
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── cart-service/
│       └── [same structure as product-catalog-service]
├── k8s/
│   ├── product-catalog-service/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── hpa.yaml
│   │   ├── configmap.yaml
│   │   └── serviceaccount.yaml
│   └── cart-service/
│       └── [same structure]
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- AWS CLI configured
- Docker (for local development)
- kubectl (for Kubernetes deployment)

### Local Development

#### Product Catalog Service

```bash
cd src/services/product-catalog-service
npm install
cp .env.example .env
# Edit .env with your local configuration
npm run dev
```

#### Cart Service

```bash
cd src/services/cart-service
npm install
cp .env.example .env
# Edit .env with your local configuration
npm run dev
```

### Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests with coverage
npm test
```

### Building for Production

```bash
npm run build
```

### Docker Build

```bash
# Product Catalog Service
cd src/services/product-catalog-service
docker build -t product-catalog-service:latest .

# Cart Service
cd src/services/cart-service
docker build -t cart-service:latest .
```

## Deployment

### Prerequisites

1. **DynamoDB Tables**
   - `products` table (partition key: `productId` - String)
   - `carts` table (partition key: `userId` - String, sort key: `productId` - String)

2. **AWS Secrets Manager**
   - `shopcart/product-catalog/prod`
   - `shopcart/cart/prod`

3. **AWS Cognito User Pool**
   - Configure OAuth 2.0
   - Create user pool and app client

4. **EKS Cluster**
   - Create namespace: `shopcart`
   - Configure IRSA (IAM Roles for Service Accounts)

### Deploy to EKS

```bash
# Create namespace
kubectl create namespace shopcart

# Deploy Product Catalog Service
kubectl apply -f src/k8s/product-catalog-service/

# Deploy Cart Service
kubectl apply -f src/k8s/cart-service/

# Verify deployments
kubectl get pods -n shopcart
kubectl get svc -n shopcart
```

### API Gateway Configuration

1. Create REST API in AWS API Gateway
2. Configure Cognito authorizer
3. Create resources:
   - `/products` → Product Catalog Service
   - `/cart` → Cart Service
4. Configure stage variables for rollback:
   - `PRODUCT_SERVICE_URL`
   - `CART_SERVICE_URL`
   - `ACTIVE_BACKEND` (microservices | legacy)

## API Documentation

### Product Catalog Service

- `GET /api/v1/products` - List products (paginated)
- `GET /api/v1/products/{productId}` - Get product by ID
- `POST /api/v1/products` - Create product (admin)
- `PUT /api/v1/products/{productId}` - Update product (admin)
- `DELETE /api/v1/products/{productId}` - Delete product (admin)
- `PATCH /api/v1/products/{productId}/stock` - Update stock (internal)

### Cart Service

- `GET /api/v1/cart` - Get user's cart
- `POST /api/v1/cart/items` - Add item to cart
- `PUT /api/v1/cart/items/{productId}` - Update cart item
- `DELETE /api/v1/cart/items/{productId}` - Remove cart item
- `DELETE /api/v1/cart` - Clear cart

### Health Checks

- `GET /health` - Liveness probe
- `GET /ready` - Readiness probe

## Migration from Legacy System

### Key Changes

1. **Database Migration**
   - MySQL → DynamoDB
   - INT AUTO_INCREMENT → UUID v4
   - session_id → userId (OAuth)

2. **Stored Procedures Replaced**
   - `sp_decrement_stock` → DynamoDB conditional writes
   - `sp_add_cart_item` → Application-layer logic with compensating transactions

3. **Authentication**
   - Anonymous sessions → AWS Cognito OAuth 2.0

4. **Error Handling**
   - Custom JSON responses → RFC 7807 Problem Details

5. **Secrets Management**
   - Hardcoded credentials → AWS Secrets Manager

## Monitoring & Observability

### CloudWatch Metrics

- API Gateway metrics
- EKS pod metrics (CPU, memory)
- DynamoDB metrics (read/write capacity, throttles)
- Application logs (structured JSON)

### AWS X-Ray

- End-to-end distributed tracing
- Service map visualization
- Trace IDs in error responses

### Alarms

- Error rate > 5%
- Latency p95 > 500ms
- Pod crash loops
- Circuit breaker open

## Rollback Strategy

In case of issues, use API Gateway stage variables to route traffic back to legacy system:

```bash
aws apigateway update-stage \
  --rest-api-id <api-id> \
  --stage-name prod \
  --patch-operations op=replace,path=/variables/ACTIVE_BACKEND,value=legacy
```

Rollback time: < 5 minutes

## Security

- Non-root containers
- Read-only root filesystem
- AWS IAM roles for service accounts (IRSA)
- Secrets stored in AWS Secrets Manager
- Network policies for pod-to-pod communication
- API Gateway rate limiting

## Performance

- Horizontal Pod Autoscaling (3-10 pods)
- DynamoDB on-demand capacity
- Circuit breaker for inter-service communication
- Connection pooling
- Response caching (API Gateway)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

Proprietary - ShopCart Inc.
