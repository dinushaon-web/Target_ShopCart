# Cart Service

## Overview

The Cart Service is a TypeScript/Node.js microservice that manages shopping cart operations for the ShopCart e-commerce platform. It replaces the legacy `CartServlet.java` and provides a modern, cloud-native implementation with DynamoDB as the data store.

## Features

- **User Cart Management**: Get, add, update, and remove cart items
- **OAuth 2.0 Authentication**: AWS Cognito JWT-based authentication
- **DynamoDB Integration**: Scalable NoSQL data storage
- **RFC 7807 Error Responses**: Standardized error handling
- **Health Checks**: Kubernetes-ready liveness and readiness probes
- **Structured Logging**: Winston logger with CloudWatch integration
- **Auto-scaling**: Horizontal Pod Autoscaler configuration

## Architecture

### Legacy vs Modern

| Legacy | Modern |
|--------|--------|
| `CartServlet.java` | `cart.controller.ts` + `cart.service.ts` |
| `CartDAO.java` | `cart.repository.ts` |
| `sp_add_cart_item` stored procedure | DynamoDB `UpdateCommand` with upsert logic |
| MySQL INT AUTO_INCREMENT | UUID v4 strings |
| Anonymous `session_id` | OAuth 2.0 `userId` (Cognito JWT sub claim) |
| Hardcoded credentials | AWS Secrets Manager |

### Project Structure

```
cart-service/
├── src/
│   ├── models/
│   │   ├── cart.model.ts              # Domain models and validation
│   │   └── problem-details.model.ts   # RFC 7807 error responses
│   ├── repositories/
│   │   ├── cart.repository.ts         # DynamoDB cart operations
│   │   └── product.repository.ts      # Product validation
│   ├── services/
│   │   └── cart.service.ts            # Business logic
│   ├── controllers/
│   │   └── cart.controller.ts         # HTTP request handlers
│   ├── middleware/
│   │   ├── auth.middleware.ts         # Cognito JWT validation
│   │   ├── error.middleware.ts        # Error handling
│   │   └── logging.middleware.ts      # Request/response logging
│   ├── utils/
│   │   └── logger.util.ts             # Winston logger
│   ├── config/
│   │   └── dynamodb.config.ts         # DynamoDB client
│   ├── app.ts                         # Express app setup
│   └── server.ts                      # Server entry point
├── tests/
│   └── unit/
│       └── cart.service.test.ts       # Unit tests
├── k8s/
│   ├── deployment.yaml                # Kubernetes deployment
│   ├── service.yaml                   # Kubernetes service
│   ├── configmap.yaml                 # Configuration
│   ├── hpa.yaml                       # Auto-scaling
│   └── serviceaccount.yaml            # IAM role binding
├── Dockerfile                         # Multi-stage build
├── package.json                       # Dependencies
├── tsconfig.json                      # TypeScript config
└── jest.config.js                     # Test config
```

## API Endpoints

All endpoints require authentication via `Authorization: Bearer <JWT>` header.

### Get Cart
```http
GET /api/v1/cart
```

**Response:**
```json
{
  "data": {
    "userId": "auth0|507f1f77bcf86cd799439011",
    "items": [
      {
        "productId": "550e8400-e29b-41d4-a716-446655440000",
        "productName": "Wireless Bluetooth Headphones",
        "quantity": 2,
        "priceSnapshot": 99.99,
        "subtotal": 199.98,
        "addedAt": "2024-01-20T10:30:00Z",
        "updatedAt": "2024-01-20T14:45:00Z"
      }
    ],
    "totalItems": 1,
    "totalQuantity": 2,
    "totalAmount": 199.98
  }
}
```

### Add Item to Cart
```http
POST /api/v1/cart/items
Content-Type: application/json

{
  "productId": "550e8400-e29b-41d4-a716-446655440000",
  "quantity": 2
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "productId": "550e8400-e29b-41d4-a716-446655440000",
    "productName": "Wireless Bluetooth Headphones",
    "quantity": 2,
    "priceSnapshot": 99.99,
    "subtotal": 199.98,
    "addedAt": "2024-01-20T15:30:00Z",
    "updatedAt": "2024-01-20T15:30:00Z"
  }
}
```

### Update Cart Item Quantity
```http
PUT /api/v1/cart/items/:productId
Content-Type: application/json

{
  "quantity": 5
}
```

### Remove Cart Item
```http
DELETE /api/v1/cart/items/:productId
```

**Response:** `204 No Content`

### Clear Cart
```http
DELETE /api/v1/cart
```

**Response:** `204 No Content`

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "cart-service",
  "timestamp": "2024-01-20T15:30:00Z"
}
```

## Setup

### Prerequisites

- Node.js 18+
- npm 9+
- AWS CLI configured
- Docker (for containerization)
- kubectl (for Kubernetes deployment)

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your AWS credentials and configuration
   ```

3. **Run in development mode:**
   ```bash
   npm run dev
   ```

4. **Build:**
   ```bash
   npm run build
   ```

5. **Run production build:**
   ```bash
   npm start
   ```

### Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Coverage Threshold:** 80% (branches, functions, lines, statements)

### Linting and Formatting

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Deployment

### Docker

1. **Build image:**
   ```bash
   docker build -t cart-service:v1.0.0 .
   ```

2. **Run container:**
   ```bash
   docker run -p 3001:3001 \
     -e AWS_REGION=us-east-1 \
     -e CARTS_TABLE_NAME=carts \
     -e PRODUCTS_TABLE_NAME=products \
     -e COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX \
     cart-service:v1.0.0
   ```

### Kubernetes

1. **Update image in `k8s/deployment.yaml`:**
   ```yaml
   image: <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/cart-service:v1.0.0
   ```

2. **Update ConfigMap:**
   ```bash
   kubectl apply -f k8s/configmap.yaml
   ```

3. **Deploy:**
   ```bash
   kubectl apply -f k8s/
   ```

4. **Verify deployment:**
   ```bash
   kubectl get pods -n shopcart
   kubectl logs -f deployment/cart-service -n shopcart
   ```

5. **Port-forward for local testing:**
   ```bash
   kubectl port-forward -n shopcart svc/cart-service 3001:80
   curl http://localhost:3001/health
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|--------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `3001` |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `CARTS_TABLE_NAME` | DynamoDB carts table name | `carts` |
| `PRODUCTS_TABLE_NAME` | DynamoDB products table name | `products` |
| `COGNITO_USER_POOL_ID` | AWS Cognito User Pool ID | *Required* |
| `CORS_ORIGIN` | CORS allowed origin | `*` |
| `DYNAMODB_ENDPOINT` | DynamoDB endpoint (for local testing) | - |

## Business Rules

### Cart Item Validation

1. **Product Existence**: Product must exist in the products table
2. **Price Validation**: Product price must be > 0 (legacy business rule from `ProductServlet.java`)
3. **Stock Validation**: Requested quantity must not exceed available stock
4. **Quantity Limits**: Quantity must be between 1 and 99

### Upsert Logic

When adding an item to the cart:
- If item already exists → increment quantity
- If item doesn't exist → create new item
- Uses DynamoDB `UpdateExpression` with `if_not_exists` for atomic upsert

### Price Snapshot

The cart stores a `priceSnapshot` of the product price at the time of adding to cart. This ensures:
- Cart totals remain consistent even if product prices change
- Checkout uses the price the customer saw when adding to cart

## Monitoring

### Health Checks

- **Liveness Probe**: `/health` (30s initial delay, 10s period)
- **Readiness Probe**: `/health` (10s initial delay, 5s period)

### Logging

- **Format**: JSON (production), colored console (development)
- **Levels**: ERROR, WARN, INFO, DEBUG
- **Integration**: CloudWatch Logs (production)

### Metrics

- CPU utilization target: 70%
- Memory utilization target: 80%
- Auto-scaling: 3-10 replicas

## Troubleshooting

### Common Issues

**Issue**: `npm install` fails with peer dependency errors
- **Solution**: Use Node.js 18 LTS (`nvm use 18`)

**Issue**: DynamoDB `ConditionalCheckFailedException`
- **Cause**: Concurrent update conflict
- **Solution**: Retry the operation (handled automatically)

**Issue**: Cognito authentication fails
- **Cause**: Invalid or expired JWT token
- **Solution**: Refresh token or re-authenticate

**Issue**: Container fails health check
- **Cause**: Service not ready or misconfigured
- **Solution**: Check logs with `kubectl logs -f deployment/cart-service -n shopcart`

## Migration from Legacy

### Key Changes

1. **Authentication**:
   - Before: `session_id` from HTTP session
   - After: `userId` from Cognito JWT `sub` claim

2. **Primary Keys**:
   - Before: MySQL INT AUTO_INCREMENT
   - After: UUID v4 strings

3. **Cart Item Addition**:
   - Before: `sp_add_cart_item` stored procedure
   - After: DynamoDB `UpdateCommand` with conditional writes

4. **Credentials**:
   - Before: Hardcoded in `DatabaseConfig.java`
   - After: AWS Secrets Manager

5. **Error Responses**:
   - Before: `PrintWriter` JSON serialization
   - After: RFC 7807 Problem Details

## License

MIT

## Support

For issues and questions, contact the ShopCart development team.
