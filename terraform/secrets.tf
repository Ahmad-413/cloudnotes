resource "aws_secretsmanager_secret" "db" {
  name        = "${var.project_name}/${var.environment}/db"
  description = "CloudNotes database connection string"
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    DATABASE_URL = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.main.endpoint}/${var.db_name}"
  })
}
