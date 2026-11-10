# DynamoDB Table for Product Catalog Service
# Enhanced with Global Secondary Indexes for efficient querying

resource "aws_dynamodb_table" "products" {
  name           = "products-${var.environment}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "productId"

  # Primary Key
  attribute {
    name = "productId"
    type = "S"
  }

  # GSI Attributes
  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "price"
    type = "N"
  }

  attribute {
    name = "inStock"
    type = "S"  # DynamoDB doesn't support BOOL in key schema, use "true"/"false" strings
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  # Global Secondary Index: category-price-index
  # Use case: Filter by category and sort by price
  # Example: GET /api/v1/products?category=Electronics&sortBy=price&order=asc
  global_secondary_index {
    name               = "category-price-index"
    hash_key           = "category"
    range_key          = "price"
    projection_type    = "ALL"
  }

  # Global Secondary Index: inStock-createdAt-index
  # Use case: Filter by stock status and sort by creation date
  # Example: GET /api/v1/products?inStock=true&sortBy=createdAt&order=desc
  global_secondary_index {
    name               = "inStock-createdAt-index"
    hash_key           = "inStock"
    range_key          = "createdAt"
    projection_type    = "ALL"
  }

  # Point-in-time recovery for data protection
  point_in_time_recovery {
    enabled = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  # TTL configuration (optional - for future use)
  ttl {
    attribute_name = "expiresAt"
    enabled        = false
  }

  # Tags for resource management
  tags = {
    Name        = "products-${var.environment}"
    Environment = var.environment
    Service     = "product-catalog"
    ManagedBy   = "Terraform"
    CostCenter  = "Engineering"
  }

  # Lifecycle policy
  lifecycle {
    prevent_destroy = true
  }
}

# CloudWatch Alarms for DynamoDB
resource "aws_cloudwatch_metric_alarm" "dynamodb_read_throttle" {
  alarm_name          = "products-${var.environment}-read-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ReadThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors DynamoDB read throttle events"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    TableName = aws_dynamodb_table.products.name
  }
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_write_throttle" {
  alarm_name          = "products-${var.environment}-write-throttle"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "WriteThrottleEvents"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors DynamoDB write throttle events"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    TableName = aws_dynamodb_table.products.name
  }
}

# Outputs
output "dynamodb_table_name" {
  description = "Name of the DynamoDB products table"
  value       = aws_dynamodb_table.products.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB products table"
  value       = aws_dynamodb_table.products.arn
}

output "dynamodb_table_id" {
  description = "ID of the DynamoDB products table"
  value       = aws_dynamodb_table.products.id
}
