# Terraform Variables for ShopCart Infrastructure

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

# DynamoDB Variables
variable "products_table_name" {
  description = "Name of the products DynamoDB table"
  type        = string
  default     = "products"
}

variable "carts_table_name" {
  description = "Name of the carts DynamoDB table"
  type        = string
  default     = "carts"
}

# Secrets Manager Variables
variable "paypal_api_key" {
  description = "PayPal API key for payment processing"
  type        = string
  sensitive   = true
}

variable "db_username" {
  description = "Legacy database username (for dual-write period)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "db_password" {
  description = "Legacy database password (for dual-write period)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "db_host" {
  description = "Legacy database host"
  type        = string
  default     = ""
}

variable "db_port" {
  description = "Legacy database port"
  type        = number
  default     = 3306
}

variable "db_name" {
  description = "Legacy database name"
  type        = string
  default     = "shopcart"
}

variable "rotation_lambda_arn" {
  description = "ARN of the Lambda function for secrets rotation"
  type        = string
  default     = ""
}

# Cognito Variables
variable "cognito_callback_urls" {
  description = "Cognito callback URLs"
  type        = list(string)
  default     = ["http://localhost:3000/callback"]
}

variable "cognito_logout_urls" {
  description = "Cognito logout URLs"
  type        = list(string)
  default     = ["http://localhost:3000/logout"]
}

# SQS Variables
variable "sync_queue_name" {
  description = "Name of the SQS queue for dual-write synchronization"
  type        = string
  default     = "shopcart-sync-queue"
}

variable "dlq_name" {
  description = "Name of the dead letter queue"
  type        = string
  default     = "shopcart-sync-dlq"
}

# EKS Variables
variable "eks_cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "shopcart-eks"
}

variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
}

# API Gateway Variables
variable "api_gateway_name" {
  description = "Name of the API Gateway"
  type        = string
  default     = "shopcart-api"
}

variable "use_legacy" {
  description = "Flag to route traffic to legacy WAR (for rollback)"
  type        = bool
  default     = false
}

variable "legacy_war_endpoint" {
  description = "Endpoint of the legacy WAR application"
  type        = string
  default     = ""
}

# Tags
variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project   = "ShopCart"
    ManagedBy = "Terraform"
  }
}
