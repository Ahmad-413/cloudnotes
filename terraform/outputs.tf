output "app_public_ip" {
  description = "Public IP of the app server (also used for GitHub Actions deploys)"
  value       = aws_eip.app.public_ip
}

output "app_url" {
  description = "URL of the live application"
  value       = "http://${aws_eip.app.public_ip}:${var.app_port}"
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket used for image uploads"
  value       = aws_s3_bucket.uploads.bucket
}

output "secrets_manager_secret_name" {
  description = "Name of the Secrets Manager secret holding the DB connection string"
  value       = aws_secretsmanager_secret.db.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group receiving application logs"
  value       = aws_cloudwatch_log_group.app.name
}
