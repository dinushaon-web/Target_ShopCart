# IAM Roles and Policies for ShopCart Services

# Product Catalog Service IAM Role
resource "aws_iam_role" "product_catalog_service" {
  name = "${var.environment}-product-catalog-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${var.eks_oidc_provider}"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${var.eks_oidc_provider}:sub" = "system:serviceaccount:shopcart:product-catalog-sa"
          }
        }
      }
    ]
  })

  tags = {
    Name    = "product-catalog-service-role"
    Service = "product-catalog"
  }
}

# Product Catalog Service Policy
resource "aws_iam_role_policy" "product_catalog_dynamodb" {
  name = "${var.environment}-product-catalog-dynamodb-policy"
  role = aws_iam_role.product_catalog_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.products.arn,
          "${aws_dynamodb_table.products.arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "product_catalog_secrets" {
  name = "${var.environment}-product-catalog-secrets-policy"
  role = aws_iam_role.product_catalog_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.payment_gateway.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = [
          aws_kms_key.shopcart_secrets.arn
        ]
      }
    ]
  })
}

# Cart Service IAM Role
resource "aws_iam_role" "cart_service" {
  name = "${var.environment}-cart-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/${var.eks_oidc_provider}"
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${var.eks_oidc_provider}:sub" = "system:serviceaccount:shopcart:cart-sa"
          }
        }
      }
    ]
  })

  tags = {
    Name    = "cart-service-role"
    Service = "cart"
  }
}

# Cart Service Policy
resource "aws_iam_role_policy" "cart_dynamodb" {
  name = "${var.environment}-cart-dynamodb-policy"
  role = aws_iam_role.cart_service.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.carts.arn
        ]
      }
    ]
  })
}

# Outputs
output "product_catalog_role_arn" {
  description = "ARN of the product catalog service IAM role"
  value       = aws_iam_role.product_catalog_service.arn
}

output "cart_service_role_arn" {
  description = "ARN of the cart service IAM role"
  value       = aws_iam_role.cart_service.arn
}
