terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Uncomment and configure this block to store state remotely (recommended
  # once you're past initial experimentation). Create the bucket + table first.
  #
  # backend "s3" {
  #   bucket         = "cloudnotes-terraform-state-yourname"
  #   key            = "cloudnotes/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "cloudnotes-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
}
