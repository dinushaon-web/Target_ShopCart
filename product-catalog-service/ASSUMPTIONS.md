# Assumptions & Design Decisions

## Path & Structure Decisions

### 1. Folder Structure
**Decision:** Preserved existing TypeScript microservices structure under `src/product-catalog-service/`

**Rationale:**
- Technical specification explicitly shows existing structure with `src/product-catalog-service/src/` paths
- Existing codebase already follows layered architecture (controllers, services, repositories, models)
- No reorganization required per specification

**Source:** Technical Specification Section "Current State Analysis" showing existing file structure

### 2. Model Location
**Path:** `src/product-catalog-service/src/models/product.model.ts`

**Rationale:**
- Existing product model already at this location
- Enhanced with new interfaces (ProductListQueryParams, ProductListResponse)
- Added helper functions (transformLegacyProduct) for backward compatibility

**Source:** Existing codebase structure

### 3. Test Location
**Paths:**
- Unit tests: `src/product-catalog-service/tests/unit/`
- Integration tests: `src/product-catalog-service/tests/integration/`

**Rationale:**
- Follows existing test structure in repository
- Separates unit and integration tests for clarity
- Jest configuration already references these paths

**Source:** Existing `jest.config.js` and test directory structure

### 4. Infrastructure Location
**Path:** `src/terraform/dynamodb.tf`

**Rationale:**
- Technical specification mentions "terraform/" directory exists
- Centralized infrastructure code for all services
- Follows standard Terraform project structure

**Source:** Technical Specification showing `terraform/` directory

### 5. Migration Script Location
**Path:** `src/product-catalog-service/scripts/migrate-products.ts`

**Rationale:**
- Service-specific migration script belongs in service directory
- Follows convention of `scripts/` folder for operational tasks
- Executable with ts-node for development convenience

**Source:** Standard Node.js/TypeScript project conventions

---

## Technical Assumptions

### 1. DynamoDB Boolean Handling
**Assumption:** Store `inStock` as string ("true"/"false") in GSI key schema

**Rationale:**
- DynamoDB does not support BOOL type in key schema (partition/sort keys)
- Must use string representation for GSI: `inStock-createdAt-index`
- Application layer converts string to boolean for API responses

**Source:** AWS DynamoDB documentation on attribute types in indexes

### 2. Pagination Token Format
**Assumption:** Base64-encoded JSON containing DynamoDB LastEvaluatedKey

**Rationale:**
- Opaque token prevents client manipulation
- Contains all necessary information for cursor-based pagination
- Matches pattern described in Technical Specification
- Future enhancement: Add HMAC signature for tamper protection

**Source:** Technical Specification Section "Pagination Token Format"

### 3. Default Values
**Assumptions:**
- `currency`: Defaults to "USD" if not provided
- `category`: Defaults to "General" if not provided
- `imageUrl`: Defaults to `null` if not provided
- `limit`: Defaults to 20 (min: 1, max: 100)
- `sortBy`: Defaults to "createdAt"
- `order`: Defaults to "desc"

**Rationale:**
- Specified in Technical Specification Product Model section
- Provides sensible defaults for US-based e-commerce platform
- Matches legacy behavior (newest products first)

**Source:** Technical Specification Section "Product Model Enhancement"

### 4. Backward Compatibility
**Assumption:** Legacy `stock` field must be supported during migration

**Rationale:**
- Legacy Java servlet uses `stock` field
- New implementation uses `stockQuantity`
- `transformLegacyProduct()` function handles both formats
- Migration script transforms old schema to new schema

**Source:** Legacy code analysis (ProductServlet.java, ProductDAO.java)

### 5. Category Enum
**Assumption:** Fixed set of 6 categories

**Categories:**
1. Electronics
2. Clothing
3. Home & Garden
4. Sports & Outdoors
5. Books & Media
6. General

**Rationale:**
- Specified in API Specification
- Enables efficient GSI queries
- "General" serves as catch-all category

**Source:** API Specification Section "Product Schema"

### 6. Authentication
**Assumption:** Authentication is optional for GET operations in v1

**Rationale:**
- Acceptance criteria states: "Authentication is optional for listing and retrieving products"
- POST/PUT/DELETE operations require AWS Cognito JWT
- Future versions may require authentication for all operations

**Source:** User Story Acceptance Criteria

### 7. Error Format
**Assumption:** RFC 7807 Problem Details for all errors

**Rationale:**
- Existing implementation uses RFC 7807
- Specified in Technical Specification
- Industry standard for HTTP API errors

**Source:** Technical Specification Section "Error Handling"

### 8. Response Format Change
**Assumption:** New format uses `products` key instead of `data` for list endpoint

**Old Format:**
```json
{
  "data": [...],
  "pagination": {...}
}
```

**New Format:**
```json
{
  "products": [...],
  "pagination": {...}
}
```

**Rationale:**
- Specified in Technical Specification Section "Current Response Format (Needs Update)"
- More semantic and self-documenting
- Single product endpoint still uses `{ "data": product }` for backward compatibility

**Source:** Technical Specification Section "Required Format"

### 9. GSI Query Strategy
**Assumption:** Use most efficient GSI based on query parameters

**Strategy:**
1. If `category` provided → Use `category-price-index`
2. Else if `inStock` provided → Use `inStock-createdAt-index`
3. Else → Use Scan with filters (least efficient)

**Rationale:**
- Optimizes query performance
- Leverages DynamoDB GSI capabilities
- Documented in Technical Specification

**Source:** Technical Specification Section "Query Performance Guidelines"

### 10. Stock Decrement Logic
**Assumption:** Atomic stock decrement with conditional check

**Rationale:**
- Replaces MySQL stored procedure `sp_decrement_stock`
- Prevents negative stock values
- Uses DynamoDB conditional expressions
- Throws `InsufficientStockError` if stock < requested quantity

**Source:** Legacy code (ProductDAO.java) and Technical Specification

---

## Business Rules Assumptions

### 1. Price Validation
**Rule:** `price > 0` (must be greater than zero)

**Rationale:**
- Inherited from legacy Java servlet
- Comment in ProductServlet.java: "Business rule: price must be > 0"
- Validated in ProductValidator class

**Source:** Legacy ProductServlet.java line 23

### 2. Stock Quantity Validation
**Rule:** `stockQuantity >= 0` (cannot be negative)

**Rationale:**
- Prevents data integrity issues
- Enforced by DynamoDB conditional expressions
- Validated in ProductValidator class

**Source:** Technical Specification Section "Validation Rules"

### 3. In-Stock Computation
**Rule:** `inStock = stockQuantity > 0`

**Rationale:**
- Computed field, not user-provided
- Automatically updated when stockQuantity changes
- Consistent with legacy behavior (ProductDAO filters `stock > 0`)

**Source:** Technical Specification Section "Product Model Enhancement"

---

## Deployment Assumptions

### 1. Environment Variables
**Required:**
- `AWS_REGION`: AWS region (default: us-east-1)
- `PRODUCTS_TABLE_NAME`: DynamoDB table name
- `NODE_ENV`: Environment (development, staging, production)

**Optional:**
- `COGNITO_USER_POOL_ID`: For authentication
- `COGNITO_CLIENT_ID`: For authentication
- `LOG_LEVEL`: Logging verbosity (default: info)

**Source:** Existing configuration files and Technical Specification

### 2. AWS Permissions
**Required IAM Permissions:**
- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:UpdateItem`
- `dynamodb:DeleteItem`
- `dynamodb:Query`
- `dynamodb:Scan`

**Source:** Technical Specification Section "IAM Roles"

### 3. Migration Execution
**Assumption:** Migration runs once during deployment

**Steps:**
1. Deploy new DynamoDB GSIs (Terraform)
2. Wait for GSI backfill to complete
3. Run migration script with DRY_RUN=true (validate)
4. Run migration script with DRY_RUN=false (execute)
5. Deploy new service version

**Source:** Technical Specification Section "Data Migration Strategy"

---

## Testing Assumptions

### 1. Test Coverage Target
**Target:** ≥ 80% code coverage

**Rationale:**
- Specified in acceptance criteria
- Industry standard for production code
- Enforced by Jest configuration

**Source:** User Story Acceptance Criteria

### 2. Test Data
**Assumption:** Integration tests use local DynamoDB or test environment

**Rationale:**
- Avoid polluting production data
- Reproducible test results
- Fast test execution

**Source:** Standard testing best practices

---

## Future Enhancements (Not Implemented)

### 1. Pagination Token Security
**Enhancement:** Add HMAC signature to pagination tokens

**Rationale:**
- Prevent token tampering
- Mentioned in Technical Specification as future enhancement

**Source:** Technical Specification Section "Pagination Token Format"

### 2. Full-Text Search
**Enhancement:** Add Elasticsearch integration for product search

**Rationale:**
- Current implementation only supports exact match and range queries
- Full-text search requires additional infrastructure

**Source:** Not in current requirements

### 3. Caching Layer
**Enhancement:** Add Redis caching for frequently accessed products

**Rationale:**
- Reduce DynamoDB read costs
- Improve response times
- Mentioned in Technical Specification

**Source:** Technical Specification Section "Caching strategy"

---

## Document Version

**Version:** 1.0  
**Date:** 2024-01-20  
**Author:** Full-Stack Agent  
**Status:** Final
