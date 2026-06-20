provider "aws" {
  region = "us-east-1"
}

# AWS RDS PostgreSQL for Disaster Recovery / PITR
resource "aws_db_instance" "erp_postgres" {
  identifier           = "erp-production-db"
  engine               = "postgres"
  engine_version       = "15.3"
  instance_class       = "db.t3.medium"
  allocated_storage    = 50
  max_allocated_storage = 500
  
  db_name              = "saas_accounting_central"
  username             = "postgres_admin"
  password             = var.db_password # Injected via CI/CD Secrets

  # Critical Disaster Recovery Settings
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  copy_tags_to_snapshot   = true
  deletion_protection     = true # Prevents accidental DROP
  skip_final_snapshot     = false
  multi_az                = true # High Availability Failover

  vpc_security_group_ids = [aws_security_group.db_sg.id]
}

variable "db_password" {
  description = "Database administrator password"
  type        = string
  sensitive   = true
}
