# DynamoDB Tables for ShopCart Microservices

# Products Table
resource "aws_dynamodb_table" "products" {
  name           = var.products_table_name
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "productId"

  attribute {
    name = "productId"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  global_secondary_index {
    name            = "category-index"
    hash_key        = "category"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "products"
    Environment = var.environment
    Service     = "product-catalog"
    ManagedBy   = "terraform"
  }
}

# Carts Table
resource "aws_dynamodb_table" "carts" {
  name           = var.carts_table_name
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"
  range_key      = "productId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "productId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = {
    Name        = "carts"
    Environment = var.environment
    Service     = "cart"
    ManagedBy   = "terraform"
  }
}

# Outputs
output "products_table_name" {
  description = "Name of the products DynamoDB table"
  value       = aws_dynamodb_table.products.name
}

output "products_table_arn" {
  description = "ARN of the products DynamoDB table"
  value       = aws_dynamodb_table.products.arn
}

output "carts_table_name" {
  description = "Name of the carts DynamoDB table"
  value       = aws_dynamodb_table.carts.name
}

output "carts_table_arn" {
  description = "ARN of the carts DynamoDB table"
  value       = aws_dynamodb_table.carts.arn
}
