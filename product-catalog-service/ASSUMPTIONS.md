# Assumptions Document

## Document Information
- **Story ID:** 8e8e00e0-1389-43e3-b3df-96f8e7dc39a4
- **Story:** Product Data Access via DynamoDB in Product Catalog Service
- **Date:** 2024-01-20
- **Status:** Implementation Complete

---

## Path & Structure Decisions

### Folder Structure
The existing project structure was preserved as found in the repository:

```
src/product-catalog-service/
├── src/
│   ├── controllers/     # HTTP request handlers
│   ├── services/        # Business logic layer
│   ├── repositories/    # Data access layer (DynamoDB)
│   ├── models/          # TypeScript interfaces and validators
│   ├── middleware/      # Express middleware (auth, error, logging)
│   ├── utils/           # Utility functions (logger, secrets, pagination)
│   ├── config/          # Configuration (DynamoDB client)
│   ├── app.ts           # Express app setup
│   └── server.ts        # Entry point
├── tests/
│   ├── unit/            # Unit tests
│   └── integration/     # Integration tests
├── openapi.yaml         # API specification
├── package.json
├── tsconfig.json
└── Dockerfile
```

**Rationale:** This structure follows standard Node.js/TypeScript microservice conventions and was already established in the existing codebase. The Technical Specification explicitly mentions this structure in Section 2.2 (Project Structure).

### New Files Created

1. **`src/utils/pagination.util.ts`**
   - **Reason:** Technical Specification Change 2 explicitly requires a PaginationHelper utility class for encoding/decoding nextToken.
   - **Location:** Placed in `utils/` directory alongside other utility files (logger.util.ts, secrets.util.ts).

2. **`tests/unit/pagination.util.test.ts`**
   - **Reason:** Technical Specification Section 2.4 (Testing Requirements) requires unit tests for PaginationHelper.
   - **Location:** Mirrors source structure in tests/unit/.

3. **`tests/unit/product.repository.test.ts`**
   - **Reason:** Technical Specification requires comprehensive unit tests for repository filtering and sorting.
   - **Location:** Updates existing test file with new test cases.

4. **`tests/integration/product.api.test.ts`**
   - **Reason:** Technical Specification Section 2.4 requires integration tests for API endpoints.
   - **Location:** New integration test directory as specified.

---

## Critical Assumptions

### A1: DynamoDB Table Schema
**Assumption:** The DynamoDB table `products` uses `productId` (String, UUID) as the partition key with no sort key.

**Status:** ✅ **CONFIRMED** - Existing code already uses this schema.

**Impact:** HIGH - Core data model depends on this.

---

### A2: Global Secondary Indexes (GSIs)
**Assumption:** The following GSIs exist on the `products` table:

1. **price-index**
   - Partition Key: `category` (String)
   - Sort Key: `price` (Number)
   - Projection: ALL

2. **name-index**
   - Partition Key: `category` (String)
   - Sort Key: `name` (String)
   - Projection: ALL

3. **popularity-index**
   - Partition Key: `category` (String)
   - Sort Key: `popularity` (Number)
   - Projection: ALL

**Status:** ⚠️ **REQUIRES VALIDATION** - GSIs must be created via Terraform/IaC before deployment.

**Impact:** **BLOCKER** - Sorting functionality requires these GSIs for efficient queries. Without them, the implementation falls back to in-memory sorting which has performance implications for large datasets.

**Mitigation:** 
- Implementation includes fallback to Scan with in-memory sorting when GSIs are unavailable.
- Performance warning logged when fallback is used.
- Verify GSI existence with: `aws dynamodb describe-table --table-name products --query 'Table.GlobalSecondaryIndexes[*].IndexName'`

---

### A3: Product Model Field Additions
**Assumption:** New fields can be added to existing products with default values:
- `currency`: Default to "USD"
- `imageUrl`: Default to placeholder URL or require migration script
- `inStock`: Computed from `stockQuantity > 0`
- `popularity`: Default to 0 if not provided

**Status:** ✅ **ACCEPTED** - Backward compatibility maintained.

**Impact:** MEDIUM - Requires data migration for existing products.

**Migration Strategy:** Out of scope for this story (per Technical Specification Assumption A13).

---

### A4: Field Rename: stock → stockQuantity
**Assumption:** The field `stock` is renamed to `stockQuantity` in the Product model.

**Status:** ✅ **IMPLEMENTED** - Model updated, repository updated.

**Impact:** MEDIUM - Breaking change for existing API consumers.

**Mitigation:** API versioning (already using /api/v1) allows for backward compatibility if needed.

---

### A5: Category Field Required
**Assumption:** The `category` field is now required (removed optional) for GSI queries.

**Status:** ✅ **IMPLEMENTED** - Model updated to require category.

**Impact:** MEDIUM - All products must have a category.

**Mitigation:** Validation enforced at service layer; existing products without category will need migration.

---

### A6: Cursor-Based Pagination
**Assumption:** Pagination uses base64-encoded JSON of DynamoDB `LastEvaluatedKey` as `nextToken`.

**Status:** ✅ **IMPLEMENTED** - PaginationHelper utility created.

**Impact:** MEDIUM - Different from legacy offset-based pagination.

**Rationale:** Cursor-based pagination is more efficient for DynamoDB and prevents issues with data changes between pages.

---

### A7: Default and Maximum Limits
**Assumption:** 
- Default limit: 20 products per page
- Maximum limit: 100 products per page

**Status:** ✅ **IMPLEMENTED** - Per Technical Specification AC1.

**Impact:** LOW - Standard pagination limits.

**Rationale:** Balances performance and user experience; prevents excessive data transfer.

---

### A8: Stock Decrement Handled by Inventory Service
**Assumption:** Per AC8, stock decrement functionality is handled by the Inventory Service using DynamoDB UpdateItem with ConditionExpression, triggered asynchronously via Amazon SNS/SQS FIFO.

**Status:** ⚠️ **NOTED** - Product Catalog Service retains `decrementStock` method for backward compatibility.

**Impact:** LOW - Method kept but should not be called directly by clients.

**Rationale:** Gradual migration strategy; method will be deprecated once Inventory Service is fully operational.

---

### A9: Sorting Without Category Filter
**Assumption:** When sorting is requested without a category filter, the implementation falls back to Scan with in-memory sorting.

**Status:** ✅ **IMPLEMENTED** - Fallback logic in repository.

**Impact:** MEDIUM - Performance degradation for large datasets.

**Mitigation:** 
- Performance warning logged.
- Documentation recommends using category filter with sorting.
- Consider implementing a global GSI for sorting without category (future enhancement).

---

### A10: Price Validation Business Rule
**Assumption:** The legacy business rule "price must be > 0" is still enforced.

**Status:** ✅ **CONFIRMED** - Validation enforced in ProductValidator.

**Impact:** LOW - Existing business rule maintained.

**Rationale:** Prevents invalid product data; consistent with legacy system.

---

### A11: inStock Boolean Replaces stock > 0 Filter
**Assumption:** The new `inStock` boolean field replaces the legacy filter `stock > 0`.

**Status:** ✅ **IMPLEMENTED** - `inStock` computed during product creation/update.

**Impact:** MEDIUM - Simplifies filtering logic.

**Rationale:** Boolean field is more efficient for DynamoDB filtering than numeric comparison.

---

### A12: RFC 7807 Problem Details for All Errors
**Assumption:** All API errors return RFC 7807 Problem Details format.

**Status:** ✅ **IMPLEMENTED** - Error middleware converts all errors to RFC 7807.

**Impact:** LOW - Standard error format improves API consistency.

**Rationale:** Per Technical Specification AC10 and OpenAPI specification.

---

### A13: Data Migration Out of Scope
**Assumption:** Migration of existing products from MySQL to DynamoDB is handled separately and is out of scope for this story.

**Status:** ✅ **ACCEPTED** - Per Technical Specification Phase 1.

**Impact:** HIGH - Deployment depends on successful data migration.

**Mitigation:** Coordinate with data migration team before deployment.

---

### A14: UUID Format Validation
**Assumption:** Product IDs must be valid UUID v4 format (pattern: `^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`).

**Status:** ✅ **IMPLEMENTED** - Validation in ProductValidator.isValidUUID().

**Impact:** LOW - Prevents invalid ID formats.

**Rationale:** UUIDs replace legacy INT AUTO_INCREMENT IDs; validation ensures data integrity.

---

### A15: ISO 4217 Currency Codes
**Assumption:** Currency codes must be valid ISO 4217 3-letter uppercase codes (e.g., "USD", "EUR", "GBP").

**Status:** ✅ **IMPLEMENTED** - Validation pattern `^[A-Z]{3}$` in ProductValidator.

**Impact:** LOW - Ensures consistent currency representation.

**Rationale:** International standard for currency codes.

---

### A16: HTTPS-Only Image URLs
**Assumption:** Product image URLs must use HTTPS protocol.

**Status:** ✅ **IMPLEMENTED** - Validation in ProductValidator.

**Impact:** LOW - Security best practice.

**Rationale:** Prevents mixed content warnings and ensures secure image delivery.

---

### A17: Popularity Field Optional
**Assumption:** The `popularity` field is optional and defaults to 0 if not provided.

**Status:** ✅ **IMPLEMENTED** - Optional in model, defaults to 0 in ProductValidator.createProduct().

**Impact:** LOW - Allows gradual adoption of popularity scoring.

**Rationale:** Popularity may be computed asynchronously; not all products have popularity scores initially.

---

### A18: Filter Combination Logic
**Assumption:** Multiple filters are combined using AND logic (not OR).

**Status:** ✅ **IMPLEMENTED** - FilterExpression uses `AND` to combine conditions.

**Impact:** LOW - Standard filtering behavior.

**Rationale:** AND logic is more intuitive for users (e.g., "show electronics AND price < $100").

---

### A19: Sort Order Default
**Assumption:** When `sortBy` is specified without `sortOrder`, default to ascending (asc).

**Status:** ✅ **IMPLEMENTED** - Default `sortOrder` is "asc" per OpenAPI spec.

**Impact:** LOW - Standard sorting behavior.

**Rationale:** Ascending order is typical default for price and name sorting.

---

### A20: Empty Results Handling
**Assumption:** When no products match filters, return empty array with `hasMore: false`.

**Status:** ✅ **IMPLEMENTED** - Empty array returned with proper pagination metadata.

**Impact:** LOW - Standard API behavior.

**Rationale:** Distinguishes "no results" from "error" scenarios.

---

## Technology Stack Decisions

### Node.js 20 LTS
**Decision:** Use Node.js 20.x LTS as runtime.

**Rationale:** Per Technical Specification TR-B1; latest stable LTS version with long-term support.

---

### TypeScript 5.3.2 Strict Mode
**Decision:** Use TypeScript 5.3.2 with strict mode enabled.

**Rationale:** Per Technical Specification TR-B1; type safety prevents runtime errors.

---

### AWS SDK v3
**Decision:** Use AWS SDK v3 for JavaScript/TypeScript.

**Rationale:** Per Technical Specification TR-B2; modular architecture reduces bundle size.

---

### Express 4.18.2
**Decision:** Use Express 4.18.2 for HTTP server.

**Rationale:** Per Technical Specification TR-B1; mature, widely-used framework.

---

### Jest 29.7.0
**Decision:** Use Jest 29.7.0 for testing.

**Rationale:** Per Technical Specification TR-B12; comprehensive testing framework with built-in mocking.

---

### Winston 3.11.0
**Decision:** Use Winston 3.11.0 for structured logging.

**Rationale:** Per Technical Specification TR-B11; JSON logging for CloudWatch integration.

---

## Security Decisions

### AWS Secrets Manager
**Decision:** Retrieve database credentials exclusively from AWS Secrets Manager.

**Rationale:** Per Technical Specification TR-B5 and AC7; eliminates hardcoded credentials.

---

### JWT Token Validation
**Decision:** Use AWS Cognito for JWT validation via auth middleware.

**Rationale:** Per Technical Specification TR-B6; OAuth 2.0 authentication flow.

---

### Input Validation
**Decision:** Validate all inputs at service layer before repository calls.

**Rationale:** Defense in depth; prevents invalid data from reaching DynamoDB.

---

## Performance Decisions

### GSI-Based Sorting
**Decision:** Use DynamoDB GSIs for efficient sorting when category filter is provided.

**Rationale:** GSI queries are more efficient than Scan operations; reduces consumed capacity units.

---

### In-Memory Sorting Fallback
**Decision:** Fall back to Scan with in-memory sorting when GSI cannot be used.

**Rationale:** Ensures functionality even without optimal GSI configuration; logs performance warning.

---

### Pagination Limit Cap
**Decision:** Cap pagination limit at 100 products per page.

**Rationale:** Prevents excessive data transfer and DynamoDB read capacity consumption.

---

## Testing Decisions

### Unit Test Coverage Target
**Decision:** Target > 80% unit test coverage.

**Rationale:** Per Technical Specification TR-B12; ensures code quality.

---

### Integration Test Coverage Target
**Decision:** Target > 70% integration test coverage.

**Rationale:** Per Technical Specification TR-B12; validates API contracts.

---

### Mock DynamoDB in Tests
**Decision:** Mock DynamoDB client in unit and integration tests.

**Rationale:** Faster test execution; no dependency on external services.

---

## Open Questions for Stakeholders

### Q1: GSI Configuration
**Question:** Confirm that GSIs (price-index, name-index, popularity-index) exist on the `products` table.

**Status:** ⚠️ **PENDING VALIDATION**

**Action Required:** Run `aws dynamodb describe-table --table-name products` to verify.

---

### Q2: Popularity Field Calculation
**Question:** How is the `popularity` field calculated? Is it a stored field or computed metric?

**Status:** ⚠️ **PENDING CLARIFICATION**

**Impact:** Determines whether popularity is updated manually or via background job.

---

### Q3: Data Migration Timeline
**Question:** When will existing products be migrated from MySQL to DynamoDB with new fields?

**Status:** ⚠️ **PENDING COORDINATION**

**Impact:** Deployment blocked until migration complete.

---

### Q4: Behavior for Limit > 100
**Question:** Should the API return a 400 error or silently cap at 100 when limit > 100?

**Status:** ✅ **RESOLVED** - Silently cap at 100 (per PaginationHelper.validateLimit implementation).

**Rationale:** More user-friendly; prevents unnecessary errors.

---

## Document Status

**Status:** ✅ **IMPLEMENTATION COMPLETE**

**Blockers:** 
1. ⚠️ **Verify GSI configuration** before production deployment
2. ⚠️ **Coordinate data migration** with data team

**Next Steps:**
1. Validate GSI existence on DynamoDB table
2. Run unit and integration tests
3. Deploy to staging environment
4. Perform acceptance testing
5. Deploy to production after data migration

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-20  
**Author:** Product Catalog Service Team
