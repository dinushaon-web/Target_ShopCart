#!/usr/bin/env ts-node
/**
 * Data Migration Script for Product Catalog Service
 * 
 * Purpose: Migrate existing products from old schema to new schema
 * 
 * Changes:
 * - Add 'currency' field (default: "USD")
 * - Add 'imageUrl' field (default: null)
 * - Add 'inStock' computed field (stockQuantity > 0)
 * - Rename 'stock' to 'stockQuantity'
 * - Make 'category' required (default: "General")
 * 
 * Usage:
 *   npm run migrate
 *   or
 *   ts-node scripts/migrate-products.ts
 * 
 * Environment Variables:
 *   AWS_REGION - AWS region (default: us-east-1)
 *   PRODUCTS_TABLE_NAME - DynamoDB table name (default: products)
 *   DRY_RUN - Set to 'true' to preview changes without writing (default: false)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  ScanCommand, 
  PutCommand,
  ScanCommandOutput 
} from '@aws-sdk/lib-dynamodb';
import { transformLegacyProduct } from '../src/models/product.model';

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME || 'products';
const DRY_RUN = process.env.DRY_RUN === 'true';

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false
  }
});

interface MigrationStats {
  total: number;
  alreadyMigrated: number;
  migrated: number;
  failed: number;
  errors: Array<{ productId: string; error: string }>;
}

/**
 * Check if a product has already been migrated
 */
function isAlreadyMigrated(product: any): boolean {
  return (
    'currency' in product &&
    'stockQuantity' in product &&
    'inStock' in product
  );
}

/**
 * Migrate a single product
 */
async function migrateProduct(product: any, stats: MigrationStats): Promise<void> {
  try {
    // Check if already migrated
    if (isAlreadyMigrated(product)) {
      console.log(`✓ Product ${product.productId} already migrated, skipping`);
      stats.alreadyMigrated++;
      return;
    }

    // Transform to new schema
    const migratedProduct = transformLegacyProduct(product);

    // Log the transformation
    console.log(`\n📦 Migrating product ${product.productId}:`);
    console.log(`   Name: ${migratedProduct.name}`);
    console.log(`   Old stock: ${product.stock || 0}`);
    console.log(`   New stockQuantity: ${migratedProduct.stockQuantity}`);
    console.log(`   New inStock: ${migratedProduct.inStock}`);
    console.log(`   New currency: ${migratedProduct.currency}`);
    console.log(`   New category: ${migratedProduct.category}`);

    if (!DRY_RUN) {
      // Write back to DynamoDB
      await docClient.send(
        new PutCommand({
          TableName: PRODUCTS_TABLE_NAME,
          Item: migratedProduct
        })
      );
      console.log(`✓ Successfully migrated product ${product.productId}`);
    } else {
      console.log(`✓ [DRY RUN] Would migrate product ${product.productId}`);
    }

    stats.migrated++;
  } catch (error: any) {
    console.error(`✗ Failed to migrate product ${product.productId}:`, error.message);
    stats.failed++;
    stats.errors.push({
      productId: product.productId,
      error: error.message
    });
  }
}

/**
 * Scan and migrate all products
 */
async function migrateAllProducts(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    alreadyMigrated: 0,
    migrated: 0,
    failed: 0,
    errors: []
  };

  console.log('\n🚀 Starting product migration...');
  console.log(`   AWS Region: ${AWS_REGION}`);
  console.log(`   Table Name: ${PRODUCTS_TABLE_NAME}`);
  console.log(`   Dry Run: ${DRY_RUN ? 'YES' : 'NO'}`);
  console.log('\n' + '='.repeat(60));

  let lastEvaluatedKey: Record<string, any> | undefined;
  let pageCount = 0;

  do {
    pageCount++;
    console.log(`\n📄 Scanning page ${pageCount}...`);

    // Scan products
    const scanResult: ScanCommandOutput = await docClient.send(
      new ScanCommand({
        TableName: PRODUCTS_TABLE_NAME,
        ExclusiveStartKey: lastEvaluatedKey
      })
    );

    const products = scanResult.Items || [];
    stats.total += products.length;

    console.log(`   Found ${products.length} products in this page`);

    // Migrate each product
    for (const product of products) {
      await migrateProduct(product, stats);
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return stats;
}

/**
 * Print migration summary
 */
function printSummary(stats: MigrationStats): void {
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Migration Summary:');
  console.log(`   Total products scanned: ${stats.total}`);
  console.log(`   Already migrated: ${stats.alreadyMigrated}`);
  console.log(`   Successfully migrated: ${stats.migrated}`);
  console.log(`   Failed: ${stats.failed}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ Errors:');
    stats.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. Product ${error.productId}: ${error.error}`);
    });
  }

  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. No changes were written to DynamoDB.');
    console.log('   Set DRY_RUN=false to perform the actual migration.');
  } else {
    console.log('\n✅ Migration completed successfully!');
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const stats = await migrateAllProducts();
    printSummary(stats);

    // Exit with error code if any migrations failed
    if (stats.failed > 0) {
      console.error('\n⚠️  Some products failed to migrate. Please review the errors above.');
      process.exit(1);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  main();
}

export { migrateAllProducts, MigrationStats };
