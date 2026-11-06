# Product Catalog Service

## Overview
The Product Catalog Service is a TypeScript/Node.js microservice that manages product inventory and catalog operations for the ShopCart platform. It replaces the legacy Java ProductServlet and provides a modern, cloud-native REST API.

## Features
- ✅ Product CRUD operations
- ✅ Stock management with atomic operations
- ✅ Category-based product queries
- ✅ Cursor-based pagination
- ✅ OAuth 2.0 authentication via AWS Cognito
- ✅ RFC 7807 Problem Details error responses
- ✅ DynamoDB integration with conditional writes
- ✅ AWS Secrets Manager for credential management
- ✅ Structured logging with Winston
- ✅ Health check endpoint

## Tech Stack
- **Runtime**: Node.js 18 LTS
- **Language**: TypeScript 5.x
- **Framework**: Express.js 4.x
- **Database**: AWS DynamoDB
- **Authentication**: AWS Cognito (OAuth 2.0)
- **Testing**: Jest
- **Container**: Docker
- **Orchestration**: Kubernetes (AWS EKS)

## API Endpoints

### Public Endpoints
```
GET    /api/v1/products                    - List all products
GET    /api/v1/products/:productId         - Get product by ID
GET    /api/v1/products/category/:category - Get products by category
GET    /health                             - Health check
```

### Protected Endpoints (require authentication)
```
POST   /api/v1/products                          - Create product
PUT    /api/v1/products/:productId               - Update product
DELETE /api/v1/products/:productId               - Delete product
POST   /api/v1/products/:productId/decrement-stock - Decrement stock
POST   /api/v1/products/:productId/increment-stock - Increment stock
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- AWS Account with DynamoDB and Cognito configured
- Docker (for containerization)

### Installation
```bash
npm install
```

### Configuration
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

Update the following variables:
- `AWS_REGION`: Your AWS region
- `PRODUCTS_TABLE_NAME`: DynamoDB table name
- `COGNITO_USER_POOL_ID`: Cognito user pool ID
- `COGNITO_CLIENT_ID`: Cognito client ID

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Test
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Lint
```bash
npm run lint
npm run lint:fix
```

## Docker

### Build Image
```bash
docker build -t product-catalog-service:latest .
```

### Run Container
```bash
docker run -p 3000:3000 \
  -e AWS_REGION=us-east-1 \
  -e PRODUCTS_TABLE_NAME=products \
  -e COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX \
  product-catalog-service:latest
```

## Kubernetes Deployment

### Deploy to EKS
```bash
# Apply all manifests
kubectl apply -f k8s/

# Verify deployment
kubectl get pods -n shopcart
kubectl get svc -n shopcart
```

### Check Logs
```bash
kubectl logs -f deployment/product-catalog-service -n shopcart
```

## Business Rules

1. **Price Validation**: Product price must be greater than 0
2. **Stock Validation**: Product stock cannot be negative
3. **Stock Decrement**: Uses DynamoDB conditional writes to prevent overselling
4. **UUID Primary Keys**: All products use UUID v4 instead of auto-increment integers

## Migration from Legacy

This service replaces:
- `ProductServlet.java` - HTTP endpoint logic
- `ProductDAO.java` - Data access layer
- `sp_decrement_stock` - Stored procedure (now DynamoDB conditional write)
- Hardcoded credentials in `DatabaseConfig.java` (now AWS Secrets Manager)

## Architecture Decisions

### Why DynamoDB over MySQL?
- **Scalability**: Auto-scaling with on-demand capacity
- **Performance**: Single-digit millisecond latency
- **Serverless**: No database server management
- **AWS Integration**: Native integration with EKS, Secrets Manager, and CloudWatch

### Why UUID over INT AUTO_INCREMENT?
- **Distributed Systems**: No need for centralized ID generation
- **Security**: IDs are not sequential (prevents enumeration attacks)
- **Merging**: Easier to merge data from multiple sources

## Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "service": "product-catalog",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Logs
Structured JSON logs are sent to:
- **Development**: Console
- **Production**: CloudWatch Logs (`/aws/eks/shopcart/product-catalog`)

## Security

- ✅ OAuth 2.0 authentication via AWS Cognito
- ✅ JWT token validation with JWKS
- ✅ Helmet.js for HTTP security headers
- ✅ CORS configuration
- ✅ Non-root container user
- ✅ Read-only root filesystem
- ✅ AWS Secrets Manager for credentials

## Performance

- **Target Latency**: < 100ms (p95)
- **Throughput**: 1000 req/sec (with auto-scaling)
- **Availability**: 99.9% SLA

## Contributing

1. Follow TypeScript strict mode
2. Write tests for all new features (≥80% coverage)
3. Use conventional commits
4. Update OpenAPI spec for API changes

## License
MIT
