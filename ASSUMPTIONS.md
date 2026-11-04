# Assumptions Document

## Path & Structure Decisions

### Folder Structure

The folder structure was derived from:

1. **Technical Specification**: The spec explicitly defines two microservices (Product Catalog Service and Cart Service) with separate DynamoDB tables
2. **Functional Requirements**: Requirements specify independent deployment on AWS EKS
3. **Stack Conventions**: Node.js/TypeScript projects follow standard `src/` structure with layered architecture

**Decision**: Created `src/services/{service-name}/` structure to:
- Maintain clear service boundaries
- Enable independent deployment
- Support monorepo pattern for shared utilities (future)

### Service Structure

Each service follows three-layer architecture:
- **Controllers**: HTTP request handling
- **Services**: Business logic
- **Repositories**: Data access layer

This was derived from:
- Technical specification's mention of "three-layer architecture"
- Standard Express.js best practices
- Separation of concerns principle

### Kubernetes Manifests

Placed in `src/k8s/{service-name}/` based on:
- Technical specification's deployment requirements
- Standard Kubernetes project conventions
- Separation from application code

## Technical Assumptions

### Authentication

**Assumption**: AWS API Gateway handles Cognito authentication and passes `userId` in request context.

**Rationale**: 
- Technical spec mentions "OAuth userId as DynamoDB partition key via AWS Cognito"
- Standard AWS pattern for API Gateway + Cognito integration
- Services receive authenticated userId without implementing OAuth flow

**Implementation**: Controllers extract `userId` from `x-user-id` header (placeholder for API Gateway context)

### Stock Management

**Assumption**: Product Catalog Service owns stock management; Cart Service calls it for stock updates.

**Rationale**:
- Technical spec states "Stock Decrement Ownership: Confirm Product Catalog Service owns stock updates"
- Domain-driven design principle: Product domain owns product state
- Prevents distributed transaction complexity

**Implementation**: Cart Service uses HTTP client with circuit breaker to call Product Catalog Service

### Session-Based Carts

**Assumption**: Anonymous session-based carts are discarded during migration.

**Rationale**:
- Technical spec states "Anonymous session_id cart ownership is replaced with authenticated OAuth 2.0 userId"
- No migration path specified for anonymous carts
- Business decision required (marked as Priority 1 question in spec)

**Implementation**: All carts require authenticated userId

### Error Handling

**Assumption**: All errors follow RFC 7807 Problem Details format.

**Rationale**:
- Technical spec explicitly requires "RFC 7807 Problem Details format for errors"
- Industry standard for REST API error responses
- Consistent error structure across services

**Implementation**: Custom error classes extending `AppError` with RFC 7807 fields

### Pagination

**Assumption**: Cursor-based pagination for product listing.

**Rationale**:
- DynamoDB best practice (offset pagination is inefficient)
- Technical spec mentions "cursor-based pagination"
- Prevents data skipping during concurrent writes

**Implementation**: Base64-encoded LastEvaluatedKey as cursor

### Stock Consistency

**Assumption**: Eventual consistency is acceptable for cart/stock synchronization.

**Rationale**:
- Technical spec mentions "eventual consistency model"
- Compensating transactions handle failures
- Business tolerance for brief inconsistency (marked as Priority 1 question)

**Implementation**: 
- Add item to cart first
- Decrement stock second
- Rollback cart on stock failure

### Secrets Caching

**Assumption**: Secrets cached for 5 minutes to reduce AWS API calls.

**Rationale**:
- Technical spec mentions "5-minute cache TTL"
- Balance between freshness and performance
- Secrets rotation typically happens on longer intervals

**Implementation**: In-memory Map with TTL in SecretsManager class

### Cart Expiration

**Assumption**: Carts expire after 30 days of inactivity.

**Rationale**:
- Technical spec states "Automatic cart expiration after 30 days (DynamoDB TTL)"
- Standard e-commerce pattern
- Reduces storage costs

**Implementation**: DynamoDB TTL attribute set to current timestamp + 30 days

### Inter-Service Communication

**Assumption**: Synchronous HTTP calls with circuit breaker for Cart → Product Catalog communication.

**Rationale**:
- Technical spec mentions "Opossum circuit breaker"
- Simpler than async messaging for this use case
- Circuit breaker prevents cascading failures

**Implementation**: Axios client wrapped in Opossum circuit breaker

### UUID Format

**Assumption**: UUID v4 for all product and cart identifiers.

**Rationale**:
- Technical spec states "UUID v4 IDs unless numeric IDs are explicitly requested"
- Distributed system best practice
- No coordination needed for ID generation

**Implementation**: `uuid` npm package for generation, Zod for validation

## Infrastructure Assumptions

### DynamoDB Tables

**Assumption**: Tables are pre-created before service deployment.

**Rationale**:
- Infrastructure-as-code (Terraform/CloudFormation) should manage tables
- Services should not create their own infrastructure
- Separation of concerns

**Implementation**: Services connect to existing tables via environment variables

### IAM Roles

**Assumption**: EKS service accounts have IRSA (IAM Roles for Service Accounts) configured.

**Rationale**:
- Technical spec mentions "IRSA for EKS"
- AWS best practice for pod-level IAM permissions
- No credentials in pods

**Implementation**: ServiceAccount annotations reference IAM role ARN

### API Gateway

**Assumption**: API Gateway is configured separately and routes to EKS services.

**Rationale**:
- Technical spec describes API Gateway routing
- Centralized authentication and rate limiting
- Stage variables for rollback

**Implementation**: Services expose standard REST endpoints; routing handled externally

### Observability

**Assumption**: AWS X-Ray SDK is enabled via environment variable.

**Rationale**:
- Technical spec mentions "AWS X-Ray distributed tracing"
- Optional in development, required in production
- Minimal code changes

**Implementation**: `ENABLE_XRAY=true` environment variable

## Business Logic Assumptions

### Price Validation

**Assumption**: Product price must be > 0 (from legacy code).

**Rationale**:
- Legacy ProductServlet contained comment: "Business rule: price must be > 0"
- Prevents free or negative-priced products

**Implementation**: Validation in ProductService.createProduct() and updateProduct()

### Stock Filtering

**Assumption**: Only products with stock > 0 are returned in listings.

**Rationale**:
- Legacy ProductDAO contained comment: "Business rule: filter out-of-stock"
- Improves customer experience

**Implementation**: DynamoDB FilterExpression in ProductRepository.getAll()

### Cart Item Upsert

**Assumption**: Adding existing item to cart increments quantity.

**Rationale**:
- Legacy sp_add_cart_item used `ON DUPLICATE KEY UPDATE quantity = quantity + p_qty`
- Standard e-commerce behavior

**Implementation**: CartRepository.upsertCartItem() checks for existing item and increments

## Testing Assumptions

### Coverage Threshold

**Assumption**: 80% code coverage for backend services.

**Rationale**:
- Technical spec states "≥80% code coverage using Jest"
- Industry standard for production code

**Implementation**: Jest configuration with coverage thresholds

### Mocking

**Assumption**: AWS SDK and HTTP clients are mocked in unit tests.

**Rationale**:
- Unit tests should not make real AWS API calls
- Fast, deterministic tests

**Implementation**: Jest mocks for DynamoDB client and Axios

## Open Questions (from Technical Specification)

These assumptions may need validation:

1. **Anonymous Cart Handling**: Assumed discarded; may need migration logic
2. **Stock Consistency Tolerance**: Assumed eventual consistency acceptable; may need stronger guarantees
3. **PayPal Integration**: Not implemented; assumed out of scope for this story
4. **Legacy Response Format**: Assumed new format acceptable; may need exact JSON match
5. **Traffic Estimates**: Assumed default HPA settings sufficient; may need tuning

## Deviations from Legacy Code

1. **Error Handling**: Legacy used `PrintWriter` with custom JSON; new uses RFC 7807
2. **ID Format**: Legacy used INT AUTO_INCREMENT; new uses UUID v4
3. **Authentication**: Legacy used session_id; new uses OAuth userId
4. **Stored Procedures**: Legacy used MySQL procedures; new uses application logic
5. **Secrets**: Legacy hardcoded credentials; new uses AWS Secrets Manager

## Future Considerations

1. **Anti-Corruption Adapter**: Not implemented in this phase; needed for dual-write migration
2. **Contract Tests**: Pact tests mentioned but not implemented; needed for consumer-driven contracts
3. **Frontend**: Not in scope for this story; API-first approach enables parallel development
4. **Payment Integration**: PayPal keys migrated to Secrets Manager but integration not implemented
5. **Monitoring Dashboards**: CloudWatch alarms mentioned but not configured
