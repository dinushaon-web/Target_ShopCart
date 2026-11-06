# AWS Secrets Manager for ShopCart Credentials

# KMS Key for Secrets Encryption
resource "aws_kms_key" "shopcart_secrets" {
  description             = "KMS key for ShopCart secrets encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name        = "shopcart-secrets-key"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_kms_alias" "shopcart_secrets" {
  name          = "alias/shopcart-secrets"
  target_key_id = aws_kms_key.shopcart_secrets.key_id
}

# Payment Gateway Credentials (PayPal API Keys)
resource "aws_secretsmanager_secret" "payment_gateway" {
  name        = "${var.environment}/payment-gateway-credentials"
  description = "PayPal API keys for payment processing"
  kms_key_id  = aws_kms_key.shopcart_secrets.id

  tags = {
    Name        = "payment-gateway-credentials"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "payment_gateway" {
  secret_id = aws_secretsmanager_secret.payment_gateway.id
  secret_string = jsonencode({
    paypal_api_key = var.paypal_api_key
  })
}

# Database Credentials (Legacy - for dual-write period)
resource "aws_secretsmanager_secret" "database" {
  name        = "${var.environment}/database-credentials"
  description = "Legacy MySQL database credentials for dual-write synchronization"
  kms_key_id  = aws_kms_key.shopcart_secrets.id

  tags = {
    Name        = "database-credentials"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    host     = var.db_host
    port     = var.db_port
    database = var.db_name
  })
}

# Secrets Rotation Policy
resource "aws_secretsmanager_secret_rotation" "payment_gateway" {
  secret_id           = aws_secretsmanager_secret.payment_gateway.id
  rotation_lambda_arn = var.rotation_lambda_arn

  rotation_rules {
    automatically_after_days = 90
  }
}

# Outputs
output "secrets_kms_key_id" {
  description = "KMS key ID for secrets encryption"
  value       = aws_kms_key.shopcart_secrets.id
}

output "payment_gateway_secret_arn" {
  description = "ARN of the payment gateway secret"
  value       = aws_secretsmanager_secret.payment_gateway.arn
}

output "database_secret_arn" {
  description = "ARN of the database secret"
  value       = aws_secretsmanager_secret.database.arn
}
