# Main Terraform Configuration for ShopCart Infrastructure

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Configure S3 backend for state management
    # bucket = "shopcart-terraform-state"
    # key    = "shopcart/terraform.tfstate"
    # region = "us-east-1"
    # encrypt = true
    # dynamodb_table = "terraform-state-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(
      var.tags,
      {
        Environment = var.environment
      }
    )
  }
}

# Data Sources
data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}
