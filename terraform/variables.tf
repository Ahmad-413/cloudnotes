variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short name used to prefix/tag all resources"
  type        = string
  default     = "cloudnotes"
}

variable "environment" {
  description = "Environment name (e.g. dev, prod)"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (app tier)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (database tier)"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24"]
}

variable "instance_type" {
  description = "EC2 instance type for the app server"
  type        = string
  default     = "t3.micro"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "Name of the Postgres database"
  type        = string
  default     = "cloudnotes"
}

variable "db_username" {
  description = "Master username for RDS"
  type        = string
  default     = "cloudnotes_admin"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "key_pair_name" {
  description = "Name of an existing EC2 key pair, used for SSH access and GitHub Actions deploys"
  type        = string
}

variable "ssh_allowed_cidr" {
  description = "CIDR allowed to SSH into the app instance. Restrict this to your own IP in production (e.g. 1.2.3.4/32)."
  type        = string
  default     = "0.0.0.0/0"
}

variable "github_repo_url" {
  description = "HTTPS URL of the GitHub repo to clone onto the instance on first boot"
  type        = string
}

variable "app_port" {
  description = "Port the Node app listens on"
  type        = number
  default     = 8080
}
