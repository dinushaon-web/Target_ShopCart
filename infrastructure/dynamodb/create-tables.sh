#!/bin/bash

# Create DynamoDB Tables for ShopCart Microservices
# This script creates the products and carts tables in DynamoDB

set -e

REGION="us-east-1"

echo "Creating DynamoDB tables in region: $REGION"

# Create products table
echo "Creating products table..."
aws dynamodb create-table \
  --cli-input-json file://products-table.json \
  --region $REGION

if [ $? -eq 0 ]; then
  echo "✓ Products table created successfully"
else
  echo "✗ Failed to create products table"
  exit 1
fi

# Create carts table
echo "Creating carts table..."
aws dynamodb create-table \
  --cli-input-json file://carts-table.json \
  --region $REGION

if [ $? -eq 0 ]; then
  echo "✓ Carts table created successfully"
else
  echo "✗ Failed to create carts table"
  exit 1
fi

echo ""
echo "Waiting for tables to become active..."

# Wait for products table
aws dynamodb wait table-exists \
  --table-name products \
  --region $REGION

echo "✓ Products table is active"

# Wait for carts table
aws dynamodb wait table-exists \
  --table-name carts \
  --region $REGION

echo "✓ Carts table is active"

echo ""
echo "All DynamoDB tables created successfully!"
echo ""
echo "Tables:"
echo "  - products (PK: PRODUCT#{uuid}, SK: METADATA)"
echo "  - carts (PK: USER#{userId}, SK: CART)"
