# AWS Cognito User Pool for Authentication

resource "aws_cognito_user_pool" "shopcart" {
  name = "${var.environment}-shopcart-users"

  # Password Policy
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  # User Attributes
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }

  schema {
    name                = "name"
    attribute_data_type = "String"
    required            = false
    mutable             = true
  }

  # Auto-verified Attributes
  auto_verified_attributes = ["email"]

  # Email Configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Account Recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # MFA Configuration
  mfa_configuration = "OPTIONAL"

  tags = {
    Name        = "shopcart-user-pool"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# User Pool Client
resource "aws_cognito_user_pool_client" "shopcart_client" {
  name         = "${var.environment}-shopcart-client"
  user_pool_id = aws_cognito_user_pool.shopcart.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  # Token Validity
  access_token_validity  = 1  # 1 hour
  id_token_validity      = 1  # 1 hour
  refresh_token_validity = 30 # 30 days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # OAuth Configuration
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  callback_urls                        = var.cognito_callback_urls
  logout_urls                          = var.cognito_logout_urls

  supported_identity_providers = ["COGNITO"]
}

# User Pool Domain
resource "aws_cognito_user_pool_domain" "shopcart" {
  domain       = "${var.environment}-shopcart-${var.aws_account_id}"
  user_pool_id = aws_cognito_user_pool.shopcart.id
}

# Outputs
output "cognito_user_pool_id" {
  description = "ID of the Cognito user pool"
  value       = aws_cognito_user_pool.shopcart.id
}

output "cognito_user_pool_arn" {
  description = "ARN of the Cognito user pool"
  value       = aws_cognito_user_pool.shopcart.arn
}

output "cognito_client_id" {
  description = "ID of the Cognito user pool client"
  value       = aws_cognito_user_pool_client.shopcart_client.id
}

output "cognito_domain" {
  description = "Cognito user pool domain"
  value       = aws_cognito_user_pool_domain.shopcart.domain
}
