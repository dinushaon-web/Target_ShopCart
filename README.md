# ShopCart Microservices - Monolith to Cloud-Native Migration

## 🎯 Project Overview

This repository contains the modernized ShopCart platform, decomposing the legacy Java servlet-based monolith into independently deployable TypeScript/Node.js microservices on AWS EKS.

### Services

1. **Product Catalog Service** - Manages product inventory and catalog operations
2. **Cart Service** - Manages user shopping carts and checkout operations *(Coming Soon)*
3. **Anti-Corruption Adapter** - Bidirectional sync between legacy MySQL and DynamoDB *(Coming Soon)*

## 📋 Repository Status

**Status**: ✅ **Product Catalog Service Implementation Complete**

### Completed
- ✅ Product Catalog Service (TypeScript/Node.js/Express)
- ✅ DynamoDB integration with conditional writes
- ✅ OAuth 2.0 authentication via AWS Cognito
- ✅ RFC 7807 Problem Details error handling
- ✅ Kubernetes manifests (Deployment, Service, HPA, ConfigMap)
- ✅ OpenAPI 3.0 specification
- ✅ Unit tests with Jest
- ✅ Docker containerization
- ✅ Terraform infrastructure code (DynamoDB, Secrets Manager, Cognito, IAM)
- ✅ Technical specification document

### In Progress
- 🔄 Cart Service implementation
- 🔄 Anti-Corruption Adapter for dual-write synchronization

### Pending
- ⏳ Integration tests
- ⏳ Contract tests (Pact)
- ⏳ CI/CD pipelines (GitHub Actions)
- ⏳ API Gateway configuration
- ⏳ Observability setup (CloudWatch, X-Ray)

## 🏗️ Architecture

### Legacy System (Source)
```
Java Servlet Monolith
├── ProductServlet.java
├── CartServlet.java
├── ProductDAO.java
├── CartDAO.java
└── DatabaseConfig.java (hardcoded credentials)
     ↓
   MySQL Database
   ├── products table (INT AUTO_INCREMENT)
   ├── carts table (session_id-based)
   └── Stored procedures (sp_decrement_stock, sp_add_cart_item)
```

### Target System (Modernized)
```
AWS EKS Cluster
├── Product Catalog Service (TypeScript/Node.js)
│   └── DynamoDB products table (UUID keys)
├── Cart Service (TypeScript/Node.js)
│   └── DynamoDB carts table (userId partition key)
└── Anti-Corruption Adapter
    └── SQS-based dual-write sync
     ↓
AWS API Gateway → Cognito Auth → Microservices
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker
- kubectl
- AWS CLI
- Terraform 1.5+

### Local Development

#### 1. Product Catalog Service
```bash
cd product-catalog-service
npm install
cp .env.example .env
# Configure .env with AWS credentials
npm run dev
```

#### 2. Run Tests
```bash
cd product-catalog-service
npm test
npm run test:coverage
```

#### 3. Build Docker Image
```bash
cd product-catalog-service
docker build -t product-catalog-service:latest .
```

### Infrastructure Deployment

#### 1. Provision AWS Resources
```bash
cd terraform
terraform init
terraform plan -var-file="environments/dev.tfvars"
terraform apply -var-file="environments/dev.tfvars"
```

#### 2. Deploy to Kubernetes
```bash
# Update image in k8s/deployment.yaml
cd product-catalog-service/k8s
kubectl apply -f .

# Verify deployment
kubectl get pods -n shopcart
kubectl get svc -n shopcart
```

## 📁 Project Structure

```
src/
├── product-catalog-service/
│   ├── src/
│   │   ├── controllers/       # HTTP request handlers
│   │   ├── services/          # Business logic
│   │   ├── repositories/      # Data access layer
│   │   ├── models/            # Domain models
│   │   ├── middleware/        # Express middleware
│   │   ├── utils/             # Utilities (logger, secrets)
│   │   ├── config/            # Configuration
│   │   ├── app.ts             # Express app setup
│   │   └── server.ts          # Server entry point
│   ├── tests/
│   │   ├── unit/              # Unit tests
│   │   ├── integration/       # Integration tests
│   │   └── contract/          # Pact contract tests
│   ├── k8s/                   # Kubernetes manifests
│   ├── openapi.yaml           # OpenAPI 3.0 spec
│   ├── Dockerfile
│   ├── package.json
│   └── README.md
│
├── cart-service/              # (Coming Soon)
├── anti-corruption-adapter/   # (Coming Soon)
│
├── terraform/
│   ├── main.tf                # Main configuration
│   ├── variables.tf           # Input variables
│   ├── dynamodb.tf            # DynamoDB tables
│   ├── secrets-manager.tf     # Secrets Manager
│   ├── cognito.tf             # Cognito user pool
│   └── iam.tf                 # IAM roles and policies
│
├── docs/
│   ├── TECHNICAL_SPECIFICATION.md
│   ├── architecture/
│   ├── api-specifications/
│   └── runbooks/
│
└── README.md
```

## 🔑 Key Features

### Product Catalog Service
- ✅ **UUID Primary Keys**: Replaces MySQL INT AUTO_INCREMENT
- ✅ **Atomic Stock Operations**: DynamoDB conditional writes replace stored procedures
- ✅ **OAuth 2.0 Authentication**: AWS Cognito integration
- ✅ **RFC 7807 Error Responses**: Standardized problem details
- ✅ **Cursor-Based Pagination**: Efficient large dataset handling
- ✅ **Structured Logging**: Winston with CloudWatch integration
- ✅ **Health Checks**: Kubernetes liveness and readiness probes
- ✅ **Auto-Scaling**: HPA based on CPU/memory metrics

### Security
- ✅ AWS Secrets Manager for credential management
- ✅ KMS encryption for secrets at rest
- ✅ JWT token validation with JWKS
- ✅ Non-root container execution
- ✅ Read-only root filesystem
- ✅ IAM roles with least-privilege policies

## 📊 Migration Strategy

### Phase 1: Infrastructure Setup ✅
- Provision DynamoDB tables
- Configure AWS Secrets Manager
- Set up Cognito user pool
- Create IAM roles and policies

### Phase 2: Service Implementation (In Progress)
- ✅ Product Catalog Service
- 🔄 Cart Service
- 🔄 Anti-Corruption Adapter

### Phase 3: Dual-Write Period (Planned)
- Deploy Anti-Corruption Adapter
- Enable bidirectional sync (DynamoDB ↔ MySQL)
- Validate data consistency

### Phase 4: Cutover (Planned)
- Route traffic via API Gateway
- Monitor and validate
- Decommission legacy monolith

## 🧪 Testing

### Unit Tests
```bash
cd product-catalog-service
npm test
```

### Coverage Report
```bash
npm run test:coverage
# Target: ≥80% coverage
```

### Contract Tests
```bash
npm run test:contract
# Validates API compatibility with legacy servlet responses
```

## 📖 API Documentation

### Product Catalog Service
- **OpenAPI Spec**: `product-catalog-service/openapi.yaml`
- **Base URL**: `/api/v1`
- **Authentication**: Bearer token (Cognito JWT)

#### Key Endpoints
```
GET    /api/v1/products                    - List products
GET    /api/v1/products/:id                - Get product
POST   /api/v1/products                    - Create product (auth)
PUT    /api/v1/products/:id                - Update product (auth)
DELETE /api/v1/products/:id                - Delete product (auth)
POST   /api/v1/products/:id/decrement-stock - Decrement stock (auth)
```

## 🔧 Configuration

### Environment Variables

#### Product Catalog Service
```bash
PORT=3000
NODE_ENV=production
AWS_REGION=us-east-1
PRODUCTS_TABLE_NAME=products
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
LOG_LEVEL=info
```

### Terraform Variables
See `terraform/variables.tf` for all configurable options.

## 📈 Monitoring & Observability

### Logs
- **Development**: Console output
- **Production**: CloudWatch Logs (`/aws/eks/shopcart/product-catalog`)

### Metrics
- CloudWatch custom metrics
- X-Ray distributed tracing
- Kubernetes metrics (CPU, memory, request rate)

### Health Checks
```bash
curl http://localhost:3000/health
```

## 🤝 Contributing

### Coding Standards
- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- ≥80% test coverage
- OpenAPI spec updates for API changes

### Pull Request Process
1. Create feature branch
2. Write tests
3. Update documentation
4. Submit PR with description
5. Pass CI checks
6. Code review approval

## 📚 Documentation

- [Technical Specification](docs/TECHNICAL_SPECIFICATION.md)
- [Product Catalog Service README](product-catalog-service/README.md)
- [OpenAPI Specification](product-catalog-service/openapi.yaml)
- [Architecture Decision Records](docs/architecture/architecture-decision-records/)

## 🐛 Troubleshooting

### Common Issues

**Issue**: DynamoDB ConditionalCheckFailedException
- **Cause**: Stock insufficient or product doesn't exist
- **Solution**: Check product stock before decrement

**Issue**: Cognito authentication fails
- **Cause**: Invalid or expired JWT token
- **Solution**: Refresh token or re-authenticate

**Issue**: Container fails health check
- **Cause**: Service not ready or misconfigured
- **Solution**: Check logs with `kubectl logs -f deployment/product-catalog-service -n shopcart`

## 📝 License

MIT License - See LICENSE file for details

## 👥 Team

ShopCart Engineering Team

## 🔗 Related Resources

- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Cognito Developer Guide](https://docs.aws.amazon.com/cognito/)
- [RFC 7807 Problem Details](https://tools.ietf.org/html/rfc7807)

---

**Status**: 🚀 Active Development  
**Last Updated**: 2026-11-05  
**Version**: 1.0.0
